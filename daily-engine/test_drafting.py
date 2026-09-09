"""Offline regression cases for editorial, freshness, and queue integrity gates."""

import hashlib
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import compliance
import run_daily


NOW = datetime(2026, 9, 7, 12, tzinfo=timezone.utc)

REJECTED_SEPTEMBER_HEADLINES = (
    "Enjoy BBQ, Brews and Blues in Historic Northwest - Palm Beach Illustrated",
    "It’s September! Check out BBQ & beer in West Palm Beach; Hispanic Heritage Month events and much more - Sun Sentinel",
    "West Palm Beach is “Fired Up” for 11th Annual BBQ, Brews and Blues - City of West Palm Beach",
)


def candidate(**overrides):
    item = {
        "title": "Community gathers for kava culture festival",
        "url": "https://example.com/culture",
        "source": "Culture Daily",
        "published": NOW.isoformat(),
        "summary": "A neighborhood gathering celebrates food and music.",
        "category": "culture",
        **overrides,
    }
    return {"canonical_url": item["url"], "source_verified_at": NOW.isoformat(), **item}


from test_article_fixture import article, encode

class SourceResolutionTests(unittest.TestCase):
    def test_google_wrapper_resolves_only_the_original_article_rpc_result(self):
        metadata = run_daily._SourceMetadata()
        metadata.feed('<c-wiz data-n-a-sg="signature" data-n-a-ts="1788967175"></c-wiz>')
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def read(self, limit):
                return (')]}' + "\n\n" + json.dumps([
                    ["wrb.fr", "Fbv4je", json.dumps(["garturlres", "https://example.com/culture", 1])],
                ])).encode()
        with patch.object(run_daily.urllib.request, "urlopen", return_value=Response()):
            self.assertEqual(run_daily._google_destination(
                "https://news.google.com/rss/articles/article123", metadata,
            ), "https://example.com/culture")
        with self.assertRaises(ValueError):
            run_daily._google_destination("https://news.google.com/articles/id", run_daily._SourceMetadata())

    def test_discovery_requests_the_same_freshness_window_as_validation(self):
        query = run_daily.urllib.parse.parse_qs(run_daily.urllib.parse.urlsplit(
            run_daily.google_news_rss_url('"West Palm Beach" kava')
        ).query)["q"][0]
        self.assertEqual(query, f'"West Palm Beach" kava when:{compliance.MAX_SOURCE_AGE_DAYS}d')

    def test_rss_publisher_suffix_cannot_supply_headline_relevance(self):
        item = run_daily.parse_rss(b'''<rss><channel><item>
          <title>Neighborhood arts weekend - Kava Culture Daily</title>
          <link>https://example.com/arts</link>
          <source url="https://example.com">Kava Culture Daily</source>
        </item></channel></rss>''')[0]
        self.assertEqual(item["title"], "Neighborhood arts weekend")
        self.assertEqual(item["source_url"], "https://example.com")
        self.assertFalse(compliance.check_candidate(item)["pass"])

    def resolve(self, *, final_url="https://example.com/culture?tracking=rss", canonical="/culture",
                title="Community gathers for kava culture festival", published=NOW.isoformat(), source_url="https://example.com"):
        class Response:
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def geturl(self): return final_url
            def read(self, limit):
                return (f'<link rel="canonical" href="{canonical}">'
                        f'<meta property="og:title" content="{title}">'
                        '<meta property="og:site_name" content="Culture Daily">'
                        f'<meta property="article:published_time" content="{published}">').encode()
        with patch.object(run_daily.urllib.request, "urlopen", return_value=Response()):
            return run_daily._resolve_source(candidate(
                url="https://news.google.com/rss/articles/wrapper", source_url=source_url,
            ))

    def test_publisher_redirect_resolves_title_date_and_canonical_link(self):
        item = self.resolve()
        self.assertEqual(item["url"], "https://example.com/culture")
        self.assertEqual(item["canonical_url"], item["url"])
        self.assertEqual(item["title"], candidate()["title"])
        self.assertEqual(item["source"], "Culture Daily")
        self.assertTrue(item["discovery_url"].startswith("https://news.google.com/"))

    def test_wrapper_missing_title_and_mismatched_canonical_are_rejected(self):
        for changes in (
            {"final_url": "https://news.google.com/rss/articles/wrapper"},
            {"canonical": ""}, {"canonical": "/"},
            {"canonical": "https://unrelated.example/culture"},
            {"source_url": "https://another-publisher.example"}, {"title": ""},
        ):
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                self.resolve(**changes)

    def test_current_publisher_metadata_cannot_be_hidden_by_feed_metadata(self):
        for changes in (
            {"title": REJECTED_SEPTEMBER_HEADLINES[2]},
            {"published": (NOW - timedelta(days=15)).isoformat()},
        ):
            with self.subTest(changes=changes):
                item = self.resolve(**changes)
                self.assertFalse(compliance.check_candidate(item, require_fresh=True, now=NOW)["pass"])




class OriginalArticleTests(unittest.TestCase):
    def check(self, text=None):
        text = text or article()
        try:
            meta, _ = compliance.parse_article(text)
            urls = [source["url"] for source in meta["sources"]]
        except (ValueError, KeyError):
            urls = []
        return compliance.check_publishable(text, urls)

    def test_complete_original_passes(self):
        self.assertTrue(self.check()["pass"], self.check())

    def test_old_dated_headline_digest_is_always_held(self):
        text = "# The Daily Kava Digest — 2026-09-09\n\n## 1. Kava culture\n\n[Read the source](https://example.com/kava-culture)"
        self.assertFalse(self.check(text)["pass"])

    def test_kratom_is_not_limited_to_flavor(self):
        for title in ("Kratom tea at a kava bar", "Kratom cultural history", "Kratom leaves and tea terminology", "Kratom lounge humor", "Kratom tea flavor ideas"):
            with self.subTest(title=title):
                self.assertTrue(compliance.check_candidate({"title": title})["pass"])
                self.assertTrue(self.check(article(title=title))["pass"])

    def test_topic_and_claim_exclusions_remain(self):
        for title in (*REJECTED_SEPTEMBER_HEADLINES, "Kratom bill passes", "Kava laws", "7-OH news", "Kava pain relief", "Kratom guaranteed effects"):
            with self.subTest(title=title):
                self.assertFalse(self.check(article(title=title))["pass"])

    def test_body_faq_and_metadata_cannot_hide_flags(self):
        meta, body = compliance.parse_article(article())
        self.assertFalse(self.check(encode(meta,body+"\n7-OH news"))["pass"])
        for key in ("title", "dek", "seoTitle", "metaDescription", "primaryKeyword"):
            changed = {**meta, key: "Kratom pain relief"}
            self.assertFalse(self.check(encode(changed,body))["pass"])
        meta["faq"][0]["answer"] = "Kratom treats anxiety"
        self.assertFalse(self.check(encode(meta,body))["pass"])

    def test_thin_unfinished_or_outbound_only_text_is_held(self):
        meta, body = compliance.parse_article(article())
        for changed in (body[:200], body+"\nTODO add more", body.replace("## Start", "## 1. Start"), body+"\n[Read the source](https://example.com/culture)"):
            self.assertFalse(self.check(encode(meta,changed))["pass"])

    def test_source_age_does_not_expire_evergreen_article(self):
        meta, body = compliance.parse_article(article())
        meta["date"] = meta["modified"] = "2020-01-01"
        meta["sources"][0]["verifiedAt"] = "2020-01-01"
        self.assertTrue(self.check(encode(meta,body))["pass"])

    def test_missing_or_mismatched_evidence_is_held(self):
        meta, body = compliance.parse_article(article())
        for key in ("url", "title", "verifiedAt", "supports"):
            changed = json.loads(json.dumps(meta)); changed["sources"][0].pop(key)
            result = compliance.check_publishable(encode(changed,body), ["https://example.com/kava-culture"])
            self.assertFalse(result["pass"])
        self.assertFalse(compliance.check_publishable(article(), ["https://example.com/other"])["pass"])

    def test_reported_visit_requires_real_bar_evidence_and_attribution(self):
        meta, body = compliance.parse_article(article()); meta["storyType"] = "reported-experience"
        self.assertFalse(self.check(encode(meta,body))["pass"])
        meta["experienceEvidence"] = dict(kind="home-preparation",url=meta["sources"][0]["url"], attribution="A named writer",visitEvidence="Made kava in a kitchen")
        self.assertFalse(self.check(encode(meta,body))["pass"])
        meta["experienceEvidence"].update(kind="actual-kava-bar-visit",visitEvidence="The source describes entering a bar and asking about its menu")
        self.assertFalse(self.check(encode(meta,body))["pass"])
        self.assertTrue(self.check(encode(meta,body+"\nA named writer describes a visit in the cited account."))["pass"])

    def test_fake_first_person_and_unsafe_markup_hold(self):
        meta, body = compliance.parse_article(article())
        for suffix in ('\nI walked into a kava bar.', '\n<img src=x onerror=alert(1)>', '\n[click](javascript:alert)'):
            self.assertFalse(self.check(encode(meta,body+suffix))["pass"])

    def test_footer_and_faq_are_required(self):
        meta, body = compliance.parse_article(article())
        self.assertFalse(self.check(encode(meta,body.replace(compliance.TRUSTED_RESPONSIBLE_USE_FOOTER,"")))["pass"])
        meta["faq"] = []
        self.assertFalse(self.check(encode(meta,body))["pass"])


class ManuscriptIntakeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name, path in {"ROOT":self.root,"STATE_DIR":self.root/"state","DRAFTS_DIR":self.root/"drafts","MANUSCRIPTS_DIR":self.root/"manuscripts","QUEUE_PATH":self.root/"state/queue.json","SEEN_PATH":self.root/"state/seen.json"}.items():
            patcher=patch.object(run_daily,name,path);patcher.start();self.addCleanup(patcher.stop)
        run_daily.MANUSCRIPTS_DIR.mkdir()

    def test_complete_manuscript_is_copied_once_and_checked(self):
        path=run_daily.MANUSCRIPTS_DIR/"test-kava-article.md"; path.write_text(article())
        run_daily.cmd_draft();run_daily.cmd_draft()
        queue=json.loads(run_daily.QUEUE_PATH.read_text())["items"]
        self.assertEqual(len(queue),1)
        self.assertEqual(queue[0]["status"],"passed")
        self.assertEqual((run_daily.DRAFTS_DIR/path.name).read_bytes(),path.read_bytes())

    def test_flagged_manuscript_is_held(self):
        (run_daily.MANUSCRIPTS_DIR/"test-kava-article.md").write_text(article(title="Kratom bill passes"))
        run_daily.cmd_draft()
        self.assertEqual(json.loads(run_daily.QUEUE_PATH.read_text())["items"][0]["status"],"held")

    def test_empty_inventory_never_falls_back_to_headline_generation(self):
        with patch.object(run_daily,"cmd_fetch",side_effect=AssertionError("Automatic news fetch is retired")):
            with redirect_stdout(io.StringIO()) as output:
                run_daily.cmd_run()
        self.assertIn("EDITORIAL INVENTORY EMPTY",output.getvalue())
        self.assertEqual(list(run_daily.DRAFTS_DIR.glob("*.md")),[])

    def test_conflicting_existing_draft_is_not_overwritten(self):
        run_daily._ensure_dirs()
        (run_daily.MANUSCRIPTS_DIR/"test-kava-article.md").write_text(article())
        (run_daily.DRAFTS_DIR/"test-kava-article.md").write_text("Existing edited work")
        with self.assertRaisesRegex(ValueError,"Existing draft differs"):
            run_daily.cmd_draft()
        self.assertEqual((run_daily.DRAFTS_DIR/"test-kava-article.md").read_text(),"Existing edited work")

if __name__ == "__main__":
    unittest.main()
