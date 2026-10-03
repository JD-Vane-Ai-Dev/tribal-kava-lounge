"""Offline queue checks retain real changes without committing timestamp churn."""

import copy
import io
import json
import subprocess
import tempfile
import unittest
from contextlib import ExitStack, redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import auto_publish as publish
import run_daily
from test_article_fixture import article


FIRST_CHECK = datetime(2026, 10, 3, 11, tzinfo=timezone.utc)
NEXT_CHECK = datetime(2026, 10, 4, 11, tzinfo=timezone.utc)


class QueueIdempotenceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.engine = self.root / "daily-engine"
        self.drafts = self.engine / "drafts"
        self.drafts.mkdir(parents=True)
        self.queue = self.engine / "state/queue.json"
        self.catalog = self.root / "daily-kava.js"
        self.catalog.write_text(
            "const dailyKavaPosts = [\n];\n\n"
            "function getDailyKavaPost(slug) { return dailyKavaPosts.find(p => p.slug === slug); }\n"
        )
        # The deployment manifest is an untracked output, like the workflow's
        # temporary manifest; only production source/state enters its commit.
        self.manifest = self.root / "manifest.json"
        constants = {
            run_daily: {
                "ROOT": self.engine, "DRAFTS_DIR": self.drafts,
                "STATE_DIR": self.queue.parent, "QUEUE_PATH": self.queue,
                "SEEN_PATH": self.queue.parent / "seen_urls.json",
            },
            publish: {
                "ROOT": self.root, "DRAFTS_DIR": self.drafts,
                "QUEUE_PATH": self.queue, "DAILY_KAVA_JS": self.catalog,
            },
        }
        for module, values in constants.items():
            for name, value in values.items():
                patcher = patch.object(module, name, value)
                patcher.start()
                self.addCleanup(patcher.stop)
        network = patch("urllib.request.urlopen", side_effect=AssertionError("Test must stay offline"))
        network.start()
        self.addCleanup(network.stop)
        self.relative = "drafts/test-kava-article.md"
        self.path = self.engine / self.relative
        self.urls = ["https://example.com/kava-culture"]

    def at_time(self, now):
        stack = ExitStack()
        for module in (run_daily, publish):
            clock = stack.enter_context(patch.object(module, "datetime"))
            clock.now.return_value = now
        stack.enter_context(redirect_stdout(io.StringIO()))
        return stack

    def seed(self, markdown=None):
        self.path.write_text(markdown or article(title="Kratom bill passes"))
        publish.save_json(self.queue, {"items": [{"file": self.relative, "source_urls": self.urls}]})
        return self.check_and_stage(FIRST_CHECK)

    def check_and_stage(self, now):
        with self.at_time(now):
            result = run_daily.cmd_check()
            manifest = publish.stage(self.manifest)
        return result, manifest

    def item(self):
        return json.loads(self.queue.read_text())["items"][0]

    def tracked_bytes(self):
        paths = [self.queue, self.catalog, *sorted(self.drafts.glob("*.md"))]
        return {str(path.relative_to(self.root)): path.read_bytes() for path in paths}

    def test_unchanged_held_and_published_checks_leave_no_commit_worthy_diff(self):
        self.seed()
        published_path = self.drafts / "published-kava-article.md"
        published_markdown = article(slug=published_path.stem)
        published_path.write_text(published_markdown)
        published_item = {"file": "drafts/" + published_path.name, "source_urls": self.urls}
        with self.at_time(FIRST_CHECK):
            run_daily._record_check(
                published_item, published_markdown,
                run_daily.check_publishable(published_markdown, self.urls),
            )
        published_item.update(status="published", published_at=FIRST_CHECK.isoformat())
        queue = json.loads(self.queue.read_text())
        queue["items"].append(published_item)
        publish.save_json(self.queue, queue)
        post = publish.create_post(published_path, published_markdown, self.urls)
        self.catalog.write_text(
            "const dailyKavaPosts = [\n  " + json.dumps(post, ensure_ascii=True, indent=2)
            + "\n];\n\nfunction getDailyKavaPost(slug) {}\n"
        )
        before = self.tracked_bytes()
        # Staging an index is enough to observe the exact workflow git diff;
        # this test creates no commits and never touches the real repository.
        subprocess.run(["git", "init", "--quiet", str(self.root)], check=True, timeout=5)
        subprocess.run(
            ["git", "add", "daily-kava.js", "daily-engine/drafts", "daily-engine/state/queue.json"],
            cwd=self.root, check=True, timeout=5,
        )
        status, manifest = self.check_and_stage(NEXT_CHECK)
        self.assertEqual(status, 2)  # Held content stays held.
        self.assertEqual(manifest["posts"], [])
        self.assertFalse(manifest["requires_deploy"])
        self.assertEqual(self.tracked_bytes(), before)
        diff = subprocess.run(
            ["git", "diff", "--exit-code"], cwd=self.root,
            capture_output=True, text=True, timeout=5,
        )
        self.assertEqual(diff.returncode, 0, diff.stdout + diff.stderr)

    def test_changed_content_still_held_records_new_hash_and_hold_time(self):
        self.seed()
        before = self.item()
        self.path.write_text(self.path.read_text() + "\nA local detail was revised.\n")
        status, manifest = self.check_and_stage(NEXT_CHECK)
        after = self.item()
        self.assertEqual(status, 2)
        self.assertEqual(after["status"], "held")
        self.assertEqual(after["compliance"], before["compliance"])
        self.assertEqual(after["hold_reason"], before["hold_reason"])
        self.assertNotEqual(after["checked_sha256"], before["checked_sha256"])
        self.assertEqual(after["checked_at"], NEXT_CHECK.isoformat())
        self.assertEqual(after["held_at"], NEXT_CHECK.isoformat())
        self.assertEqual(manifest["posts"], [])
        self.assertEqual(publish.read_catalog(), [])

    def test_changed_policy_result_same_content_records_new_hold(self):
        self.seed()
        before = self.item()
        result = copy.deepcopy(before["compliance"])
        result["flags"].append({
            "severity": "error", "rule": "writer-review-required",
            "match": "Exact current article needs writer review",
        })
        result["score"] = 0
        result["summary"] += ", writer-review-required"
        with patch.object(run_daily, "check_publishable", return_value=result), patch.object(
            publish, "check_publishable", return_value=result,
        ):
            self.check_and_stage(NEXT_CHECK)
        after = self.item()
        self.assertEqual(after["checked_sha256"], before["checked_sha256"])
        self.assertEqual(after["compliance"], result)
        self.assertNotEqual(after["hold_reason"], before["hold_reason"])
        self.assertEqual(after["checked_at"], NEXT_CHECK.isoformat())
        self.assertEqual(after["held_at"], NEXT_CHECK.isoformat())

    def test_held_content_becoming_pass_still_stages_automatically(self):
        self.seed()
        self.path.write_text(article())
        status, manifest = self.check_and_stage(NEXT_CHECK)
        after = self.item()
        self.assertEqual(status, 0)
        self.assertEqual(after["status"], "staged")
        self.assertTrue(after["compliance"]["pass"])
        self.assertNotIn("held_at", after)
        self.assertNotIn("hold_reason", after)
        self.assertNotIn("published_at", after)
        self.assertEqual(len(manifest["posts"]), 1)
        self.assertTrue(manifest["requires_deploy"])
        self.assertEqual(len(publish.read_catalog()), 1)

    def test_unchanged_publisher_hold_with_pass_check_and_staged_retry_are_stable(self):
        self.seed(article())
        second_path = self.drafts / "test-kava-article-two.md"
        second_path.write_text(article(slug=second_path.stem))
        queue = json.loads(self.queue.read_text())
        queue["items"].append({"file": "drafts/" + second_path.name, "source_urls": self.urls})
        publish.save_json(self.queue, queue)
        _, initial = self.check_and_stage(FIRST_CHECK)
        second_item = json.loads(self.queue.read_text())["items"][1]
        self.assertTrue(second_item["compliance"]["pass"])
        self.assertEqual(second_item["status"], "held")
        self.assertIn("Search intent", second_item["hold_reason"])
        self.assertEqual(len(initial["posts"]), 1)
        before = self.tracked_bytes()
        status, retry = self.check_and_stage(NEXT_CHECK)
        self.assertEqual(status, 0)
        self.assertEqual(self.tracked_bytes(), before)
        self.assertEqual(self.item()["staged_at"], FIRST_CHECK.isoformat())
        self.assertEqual(len(retry["posts"]), 1)
        self.assertEqual(len(retry["held"]), 1)
        # A stable staged retry must still retain the deployment manifest.
        self.assertTrue(retry["requires_deploy"])

    def test_changed_publisher_hold_reason_is_recorded_without_hash_change(self):
        self.seed()
        before = self.item()
        before["hold_reason"] = "An earlier hold reason"
        publish.save_json(self.queue, {"items": [before]})
        self.check_and_stage(NEXT_CHECK)
        after = self.item()
        self.assertEqual(after["checked_sha256"], before["checked_sha256"])
        self.assertEqual(after["compliance"], before["compliance"])
        self.assertNotEqual(after["hold_reason"], before["hold_reason"])
        self.assertEqual(after["checked_at"], before["checked_at"])
        self.assertEqual(after["held_at"], NEXT_CHECK.isoformat())

    def test_new_hold_status_records_time_even_when_hash_and_check_match(self):
        self.seed()
        before = self.item()
        before["status"] = "passed"
        publish.save_json(self.queue, {"items": [before]})
        self.check_and_stage(NEXT_CHECK)
        after = self.item()
        self.assertEqual(after["checked_sha256"], before["checked_sha256"])
        self.assertEqual(after["compliance"], before["compliance"])
        self.assertEqual(after["status"], "held")
        self.assertEqual(after["checked_at"], NEXT_CHECK.isoformat())
        self.assertEqual(after["held_at"], NEXT_CHECK.isoformat())


if __name__ == "__main__":
    unittest.main()
