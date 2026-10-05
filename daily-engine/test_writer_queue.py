"""Offline writer intake preserves publishing holds and stable queue retries."""

import io
import json
import os
import tempfile
import unittest
from contextlib import ExitStack, redirect_stdout
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import auto_publish as publish
import compliance
import run_daily
import writer
from test_article_fixture import article


class WriterQueueTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.repository = Path(temporary.name)
        self.root = self.repository / "daily-engine"
        self.drafts = self.root / "drafts"
        self.manuscripts = self.root / "manuscripts"
        self.drafts.mkdir(parents=True)
        self.manuscripts.mkdir()
        self.queue = self.root / "state/queue.json"
        self.catalog = self.repository / "daily-kava.js"
        self.catalog.write_text(
            "const dailyKavaPosts = [\n];\n\nfunction getDailyKavaPost(slug) {}\n"
        )
        self.manifest = self.repository / "manifest.json"
        (self.root / "EDITORIAL.md").write_text("Source-grounded editorial test brief")
        (self.root / "WRITER-VOICE.md").write_text("Natural, useful, gently funny")
        self.first_check = datetime.now(timezone.utc).replace(microsecond=0)
        self.next_check = self.first_check + timedelta(days=1)
        self.url = "https://example.com/kava-culture"
        self.topic = {
            "title": "A useful kava guide", "subject": "kava",
            "slug": "test-kava-article", "status": "writer-ready",
            "primaryKeyword": "test kava article", "storyType": "guide",
            "sources": [{"url": self.url, "supports": "First-visit context"}],
        }
        (self.root / "topic-plan.json").write_text(json.dumps({"topics": [self.topic]}))
        self.source = {
            "url": self.url, "title": "A documented source", "supports": "First-visit context",
            "verifiedAt": self.first_check.date().isoformat(), "sha256": "a" * 64,
            "text": "This is exact evidence about a real lounge menu and a first visit.",
        }
        metadata, body = compliance.parse_article(article())
        self.payload = {
            "metadata": metadata, "body": body,
            "sourceNotes": [{
                "url": self.url, "supports": "First-visit context",
                "evidenceQuote": "This is exact evidence about a real lounge menu",
            }],
        }
        self.review = {
            "pass": True, "issues": [],
            "checks": {key: True for key in (
                "grounded", "original", "distinctIntent", "voice", "editorial", "attribution",
            )},
        }
        stack = self.enterContext(ExitStack())
        stack.enter_context(patch.multiple(
            run_daily, ROOT=self.root, STATE_DIR=self.queue.parent,
            DRAFTS_DIR=self.drafts, MANUSCRIPTS_DIR=self.manuscripts,
            QUEUE_PATH=self.queue, SEEN_PATH=self.queue.parent / "seen_urls.json",
        ))
        stack.enter_context(patch.multiple(
            publish, ROOT=self.repository, DRAFTS_DIR=self.drafts,
            QUEUE_PATH=self.queue, DAILY_KAVA_JS=self.catalog,
        ))
        stack.enter_context(patch.dict(os.environ, {
            "TRIBAL_WRITER_ENABLED": "1", "AZURE_OPENAI_DEPLOYMENT": "test-deployment",
        }))
        stack.enter_context(patch.object(writer, "configured", return_value=True))
        self.fetch = stack.enter_context(patch.object(writer, "fetch_sources", return_value=[self.source]))
        stack.enter_context(patch.object(writer, "persist_reservation"))
        self.client = stack.enter_context(patch.object(writer, "AzureWriter")).return_value
        self.client.usage = {"prompt_tokens": 100, "completion_tokens": 100}
        self.client.complete.side_effect = [self.payload, self.payload, self.review]
        stack.enter_context(patch(
            "urllib.request.urlopen", side_effect=AssertionError("Writer queue regression must stay offline"),
        ))

    def check_and_stage(self, now):
        with ExitStack() as stack:
            for module in (writer, run_daily, publish):
                clock = stack.enter_context(patch.object(module, "datetime"))
                clock.now.return_value = now
            stack.enter_context(redirect_stdout(io.StringIO()))
            self.assertEqual(run_daily.cmd_draft(), 0)
            status = run_daily.cmd_check()
            manifest = publish.stage(self.manifest)
        return status, manifest

    def persistent_bytes(self):
        paths = [self.queue, self.catalog, self.root / "state/writer.json"]
        paths.extend(sorted(self.drafts.glob("*.md")))
        paths.extend(sorted(self.manuscripts.glob("*.md")))
        return {str(path.relative_to(self.repository)): path.read_bytes() for path in paths}

    def assert_stable_retry(self, expected_status, expected_posts, rule=None):
        status, manifest = self.check_and_stage(self.first_check)
        self.assertEqual(status, expected_status)
        self.assertEqual(len(manifest["posts"]), expected_posts)
        self.assertEqual(manifest["requires_deploy"], bool(expected_posts))
        items = json.loads(self.queue.read_text())["items"]
        self.assertEqual(len(items), 1)
        item = items[0]
        self.assertEqual(item["status"], "staged" if expected_posts else "held")
        self.assertNotIn("published_at", item)
        self.assertEqual(len(publish.read_catalog()), expected_posts)
        if rule:
            self.assertIn(rule, [flag["rule"] for flag in item["compliance"]["flags"]])
        before = self.persistent_bytes()
        retry_status, retry = self.check_and_stage(self.next_check)
        self.assertEqual(retry_status, expected_status)
        self.assertEqual(len(retry["posts"]), expected_posts)
        self.assertEqual(retry["requires_deploy"], bool(expected_posts))
        self.assertEqual(self.persistent_bytes(), before)
        self.assertEqual(self.client.complete.call_count, 3)
        self.assertEqual(self.fetch.call_count, 1)

    def test_writer_pass_stages_exact_bytes_and_next_day_retry_is_stable(self):
        self.assert_stable_retry(expected_status=0, expected_posts=1)
        manuscript = self.manuscripts / "test-kava-article.md"
        self.assertEqual((self.drafts / manuscript.name).read_bytes(), manuscript.read_bytes())

    def test_writer_review_hold_survives_intake_and_next_day_retry_is_stable(self):
        self.review["checks"]["grounded"] = False
        self.assert_stable_retry(expected_status=2, expected_posts=0, rule="writer-review-required")

    def test_editorial_hold_overrides_model_pass_and_next_day_retry_is_stable(self):
        self.payload["metadata"]["faq"][0]["answer"] = "Kratom bill passes"
        self.assert_stable_retry(
            expected_status=2, expected_posts=0, rule="editorial-legal-or-political-coverage",
        )


if __name__ == "__main__":
    unittest.main()
