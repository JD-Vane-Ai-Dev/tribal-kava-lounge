"""Publication boundaries: content checks, duplicate avoidance, and live acknowledgement."""

import copy
import json
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

import auto_publish as publish
import run_daily
from test_article_fixture import article, encode
from compliance import parse_article


class PublishingTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.drafts = self.root / "daily-engine/drafts"
        self.drafts.mkdir(parents=True)
        self.queue = self.root / "daily-engine/state/queue.json"
        self.catalog = self.root / "daily-kava.js"
        self.catalog.write_text("const dailyKavaPosts = [\n];\n\nfunction getDailyKavaPost(slug) { return dailyKavaPosts.find(p => p.slug === slug); }\n")
        self.manifest = self.root / "manifest.json"
        for name, value in (("ROOT", self.root), ("DRAFTS_DIR", self.drafts), ("QUEUE_PATH", self.queue), ("DAILY_KAVA_JS", self.catalog)):
            patcher = patch.object(publish, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)
        self.day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        self.item = {
            "file": "drafts/test-kava-article.md", "status": "passed",
            "source_urls": ["https://example.com/kava-culture"],
        }
        self.markdown = article()
        (self.root / "daily-engine" / self.item["file"]).write_text(self.markdown)
        publish.save_json(self.queue, {"items": [self.item]})

    def queue_items(self):
        return json.loads(self.queue.read_text())["items"]

    def fake_verify(self):
        manifest = json.loads(self.manifest.read_text())
        manifest["verified_catalog_sha256"] = manifest["catalog_sha256"]
        manifest["verified_at"] = datetime.now(timezone.utc).isoformat()
        publish.save_json(self.manifest, manifest)

    def test_staging_rechecks_content_and_holds_flagged_draft(self):
        (self.root / "daily-engine" / self.item["file"]).write_text(self.markdown.replace("Kava culture brings", "7-OH ban brings"))
        manifest = publish.stage(self.manifest)
        self.assertEqual(manifest["posts"], [])
        self.assertEqual(self.queue_items()[0]["status"], "held")
        self.assertEqual(publish.read_catalog(), [])

    def test_clean_draft_is_staged_but_not_marked_published(self):
        manifest = publish.stage(self.manifest)
        self.assertEqual(len(manifest["posts"]), 1, manifest)
        self.assertEqual(self.queue_items()[0]["status"], "staged")
        self.assertNotIn("published_at", self.queue_items()[0])
        self.assertEqual(len(publish.read_catalog()), 1)

    def test_retry_does_not_append_a_second_post(self):
        publish.stage(self.manifest)
        first = self.catalog.read_bytes()
        publish.stage(self.manifest)
        self.assertEqual(self.catalog.read_bytes(), first)
        self.assertEqual(len(publish.read_catalog()), 1)

    def test_failed_deployment_cannot_be_acknowledged(self):
        publish.stage(self.manifest)
        with self.assertRaisesRegex(ValueError, "Live verification"):
            publish.finalize(self.manifest)
        self.assertEqual(self.queue_items()[0]["status"], "staged")

    def test_changed_draft_cannot_be_acknowledged(self):
        publish.stage(self.manifest)
        self.fake_verify()
        path = self.root / "daily-engine" / self.item["file"]
        path.write_text(self.markdown + "\nChanged after deploy")
        with self.assertRaisesRegex(ValueError, "Draft changed"):
            publish.finalize(self.manifest)
        self.assertNotIn("published_at", self.queue_items()[0])

    def test_verified_publication_is_terminal_and_retry_is_noop(self):
        publish.stage(self.manifest)
        self.fake_verify()
        publish.finalize(self.manifest)
        self.assertEqual(self.queue_items()[0]["status"], "published")
        retry = publish.stage(self.manifest)
        self.assertEqual(retry["posts"], [])
        self.assertEqual(len(publish.read_catalog()), 1)

    def test_published_status_does_not_bypass_catalogue_editorial_gate(self):
        markdown = self.markdown.replace('Kava culture brings a community together', 'Enjoy BBQ, Brews and Blues')
        post = publish.create_post(self.root / 'daily-engine' / self.item['file'], markdown, self.item['source_urls'])
        self.catalog.write_text('const dailyKavaPosts = [\n' + json.dumps(post) + '\n];\n\nfunction getDailyKavaPost(slug) {}\n')
        item = copy.deepcopy(self.item)
        item.update(status='published', published_at=self.day)
        publish.save_json(self.queue, {'items': [item]})
        with self.assertRaisesRegex(ValueError, 'editorial-alcohol-promotion'):
            publish.check_catalog()
        # A hand-added entry without publisher metadata must also be screened.
        post.pop('contentSha256')
        post['slug'] = 'local-weekend-picks'
        self.catalog.write_text('const dailyKavaPosts = [\n' + json.dumps(post) + '\n];\n\nfunction getDailyKavaPost(slug) {}\n')
        with self.assertRaisesRegex(ValueError, 'editorial-alcohol-promotion'):
            publish.check_catalog()

    def test_withdrawn_record_cannot_be_restaged_or_reintroduced(self):
        item = copy.deepcopy(self.item)
        item['status'] = 'withdrawn'
        publish.save_json(self.queue, {'items': [item]})
        manifest = publish.stage(self.manifest, self.item['file'])
        self.assertEqual(manifest['posts'], [])
        self.assertEqual(self.queue_items()[0]['status'], 'withdrawn')
        post = publish.create_post(self.root / 'daily-engine' / self.item['file'], self.markdown, self.item['source_urls'])
        self.catalog.write_text('const dailyKavaPosts = [\n' + json.dumps(post) + '\n];\n\nfunction getDailyKavaPost(slug) {}\n')
        with self.assertRaisesRegex(ValueError, 'withdrawn content'):
            publish.check_catalog()

    def test_duplicate_search_intent_is_held_even_with_a_new_slug(self):
        publish.stage(self.manifest)
        second = copy.deepcopy(self.item)
        second["file"] = "drafts/test-kava-article-two.md"
        (self.root / "daily-engine" / second["file"]).write_text(article(slug="test-kava-article-two"))
        items = self.queue_items() + [second]
        publish.save_json(self.queue, {"items": items})
        publish.stage(self.manifest)
        self.assertEqual(self.queue_items()[1]["status"], "held")
        self.assertEqual(len(publish.read_catalog()), 1)

    def test_previously_staged_draft_that_becomes_flagged_is_removed(self):
        publish.stage(self.manifest)
        path = self.root / "daily-engine" / self.item["file"]
        path.write_text(self.markdown.replace("Kava culture brings", "7-OH ban brings"))
        manifest = publish.stage(self.manifest)
        self.assertEqual(manifest["posts"], [])
        self.assertEqual(self.queue_items()[0]["status"], "held")
        self.assertEqual(publish.read_catalog(), [])

    def test_crlf_draft_hash_is_bound_to_actual_bytes(self):
        path = self.root / "daily-engine" / self.item["file"]
        path.write_bytes(self.markdown.replace("\n", "\r\n").encode())
        manifest = publish.stage(self.manifest)
        self.assertEqual(len(manifest["posts"]), 1, manifest)
        self.fake_verify()
        publish.finalize(self.manifest)
        self.assertEqual(self.queue_items()[0]["status"], "published")

    def test_catalogue_write_before_queue_failure_is_recovered(self):
        original_save = publish.save_json
        def fail_queue(path, value):
            if path == self.queue:
                raise OSError("simulated interrupted state save")
            original_save(path, value)
        with patch.object(publish, "save_json", side_effect=fail_queue):
            with self.assertRaises(OSError):
                publish.stage(self.manifest)
        self.assertEqual(len(publish.read_catalog()), 1)
        self.assertNotIn("staged_sha256", self.queue_items()[0])
        path = self.root / "daily-engine" / self.item["file"]
        path.write_text(self.markdown.replace("Kava culture brings", "7-OH ban brings"))
        manifest = publish.stage(self.manifest)
        self.assertEqual(manifest["posts"], [])
        self.assertTrue(manifest["requires_deploy"])
        self.assertEqual(publish.read_catalog(), [])

    def test_manual_selection_does_not_publish_other_queue_items(self):
        second = copy.deepcopy(self.item)
        second["file"] = "drafts/test-kava-article-two.md"
        second["source_urls"] = ["https://example.com/another-culture-story"]
        (self.root / "daily-engine" / second["file"]).write_text(self.markdown.replace(self.item["source_urls"][0], second["source_urls"][0]))
        publish.save_json(self.queue, {"items": [self.item, second]})
        manifest = publish.stage(self.manifest, self.item["file"])
        self.assertEqual(len(manifest["posts"]), 1)
        self.assertEqual(self.queue_items()[1]["status"], "passed")

    def test_source_html_and_script_links_cannot_become_active_markup(self):
        rendered = publish.markdown_to_html('<img src=x onerror="alert(1)">\n\n[click](javascript:alert(1))\n\n[Source](https://example.com/?a=1&b=2)')
        self.assertNotIn("<img", rendered)
        self.assertNotIn('href="javascript:', rendered)
        self.assertIn("&lt;img", rendered)
        self.assertIn('href="https://example.com/?a=1&amp;b=2"', rendered)

    def test_escaping_draft_path_is_held(self):
        item = copy.deepcopy(self.item)
        item["file"] = "drafts/../../outside.md"
        publish.save_json(self.queue, {"items": [item]})
        manifest = publish.stage(self.manifest)
        self.assertEqual(manifest["posts"], [])
        self.assertEqual(self.queue_items()[0]["status"], "held")

    def test_wrong_live_catalogue_does_not_allow_finalization(self):
        publish.stage(self.manifest)
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self): return b"old catalogue"
        with patch.object(publish.urllib.request, "urlopen", return_value=Response()):
            with self.assertRaisesRegex(ValueError, "not served"):
                publish.verify_live(self.manifest)
        self.assertNotIn("verified_at", json.loads(self.manifest.read_text()))


if __name__ == "__main__":
    unittest.main()
