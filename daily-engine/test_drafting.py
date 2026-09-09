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


class EditorialTests(unittest.TestCase):
    def draft(self, **overrides):
        item = candidate(**overrides)
        return run_daily._template_draft([item], NOW.date().isoformat())

    def test_finished_roundup_is_attributed_without_copying_summary(self):
        text = self.draft(summary="Unverified copied article paragraph.")
        self.assertNotIn("Unverified copied", text)
        self.assertIn("**Source:** Culture Daily", text)
        self.assertIn("https://www.thetribalkavalounge.com/menu", text)
        self.assertTrue(compliance.check_publishable(text, [candidate()["url"]], NOW)["pass"])

    def test_all_stories_checked_even_after_separator_or_trusted_footer(self):
        for suffix in (
            "\n---\n## New kratom bill passes",
            "\n---\nKava medical benefits",
            "\n---\n7-OH products return",
            "\nHospitalization concerns",
        ):
            with self.subTest(suffix=suffix):
                self.assertFalse(compliance.check_text(self.draft() + suffix)["pass"])
        self.assertTrue(compliance.check_text(self.draft())["pass"])

    def test_trusted_footer_must_match_exactly(self):
        text = self.draft().replace("adults 21+ only", "adults 21+ and new kratom stories")
        self.assertFalse(compliance.check_publishable(text, [candidate()["url"]], NOW)["pass"])

    def test_prohibited_titles_summaries_and_sources(self):
        for field in ("title", "summary", "source"):
            for forbidden in ("new kava legislation", "kratom news", "7&#45;OH", "pain relief", "overdose deaths"):
                with self.subTest(field=field, forbidden=forbidden):
                    self.assertFalse(compliance.check_candidate(candidate(**{field: forbidden}))["pass"])

    def test_reported_beer_roundup_is_rejected_at_intake_and_publication(self):
        for title in REJECTED_SEPTEMBER_HEADLINES:
            with self.subTest(title=title):
                item = candidate(title=title, category="local")
                self.assertFalse(compliance.check_candidate(item, category="local")["pass"])
                text = self.draft(title=title)
                self.assertFalse(compliance.check_publishable(text, [item["url"]], NOW)["pass"])

    def test_local_arts_food_location_and_publisher_are_not_topic_relevance(self):
        item = candidate(
            title="West Palm Beach hosts neighborhood arts and food weekend",
            summary="Live music, dining and community activities downtown.",
            source="Kava Culture Daily", category="local",
        )
        self.assertFalse(compliance.check_candidate(item, category="local")["pass"])
        text = run_daily._template_draft([item], NOW.date().isoformat())
        self.assertFalse(compliance.check_publishable(text, [item["url"]], NOW)["pass"])

    def test_positive_kava_and_alcohol_free_topics_remain_eligible(self):
        for title in (
            "Community gathers for traditional kava brewing",
            "Kava and tea brews at a neighborhood lounge",
            "Kava lounge adds cold brew coffee",
            "Botanical tea lounge opens in West Palm Beach",
            "Alcohol-free nightlife brings neighbors together",
            "Non-alcoholic beer tasting at a sober social club",
            "Zero-proof cocktails for a community gathering",
            "Sober-curious evenings without champagne",
        ):
            with self.subTest(title=title):
                item = candidate(title=title)
                self.assertTrue(compliance.check_candidate(item)["pass"])
                self.assertTrue(compliance.check_publishable(self.draft(title=title), [item["url"]], NOW)["pass"])

    def test_relevant_summary_cannot_hide_alcohol_promotion(self):
        for title in (
            "Beerfest returns to downtown West Palm Beach",
            "New brewery celebrates opening weekend",
            "Kava lounge hosts wine and beer specials",
            "Alcohol-free options available at a beer festival",
        ):
            with self.subTest(title=title):
                self.assertFalse(compliance.check_candidate(candidate(
                    title=title, summary="Kava and non-alcoholic options are also available.",
                ))["pass"])
        self.assertFalse(compliance.check_candidate(candidate(
            summary="Join us for beer specials and wine tasting.",
        ))["pass"])

    def test_each_story_must_be_relevant_despite_roundup_wrapper(self):
        unrelated = candidate(
            title="Local arts and food festival opens this weekend",
            summary="", url="https://example.com/arts-food",
        )
        for items in ([unrelated], [candidate(), unrelated]):
            with self.subTest(story_count=len(items)):
                text = run_daily._template_draft(items, NOW.date().isoformat())
                self.assertIn("non-alcoholic social life", text)
                result = compliance.check_publishable(text, [item["url"] for item in items], NOW)
                self.assertFalse(result["pass"])

    def test_mixed_good_and_beer_stories_do_not_pass_as_a_group(self):
        bad = candidate(title=REJECTED_SEPTEMBER_HEADLINES[0], url="https://example.com/bbq-brews")
        text = run_daily._template_draft([candidate(), bad], NOW.date().isoformat())
        self.assertFalse(compliance.check_publishable(text, [candidate()["url"], bad["url"]], NOW)["pass"])

    def test_incomplete_and_unattributed_text_is_held(self):
        text = self.draft()
        for changed in (
            text + "\nTODO: add a specific takeaway",
            text + "\nSnippet context: copied text",
            text.replace("**Source:** Culture Daily · ", ""),
            text.replace("## 1. Community gathers for kava culture festival", ""),
            text.replace("[Read the source]", "[Click]"),
        ):
            with self.subTest(changed=changed[:90]):
                self.assertFalse(compliance.check_publishable(changed, [candidate()["url"]], NOW)["pass"])

    def test_source_and_digest_dates_are_fresh_and_known(self):
        for published in (None, "not-a-date", (NOW - timedelta(days=15)).isoformat(), (NOW + timedelta(days=1)).isoformat()):
            with self.subTest(published=published):
                self.assertFalse(compliance.check_candidate(candidate(published=published), require_fresh=True, now=NOW)["pass"])
                self.assertFalse(compliance.check_publishable(self.draft(published=published), [candidate()["url"]], NOW)["pass"])
        self.assertFalse(compliance.check_publishable(self.draft(), [candidate()["url"]], NOW + timedelta(days=15))["pass"])

    def test_snippet_cannot_supply_a_missing_or_unrelated_headline(self):
        for title in ("", None, "West Palm Beach hosts an arts weekend"):
            with self.subTest(title=title):
                result = compliance.check_candidate(candidate(
                    title=title, summary="Kava and alcohol-free community news.",
                ), require_fresh=True, now=NOW)
                self.assertFalse(result["pass"])

    def test_consumption_warning_is_not_positive_kava_coverage(self):
        item = candidate(title="Methodist Church backs push for ministers to stop smoking and reduce kava drinking - Fijivillage")
        self.assertFalse(compliance.check_candidate(item, require_fresh=True, now=NOW)["pass"])
        item = candidate(title="Non-Alcoholic Beer Has Changed What Happens After a Workout")
        self.assertFalse(compliance.check_candidate(item, require_fresh=True, now=NOW)["pass"])

    def test_canonical_attribution_required_before_selection(self):
        for changes in (
            {"url": "https://news.google.com/rss/articles/wrapper"},
            {"url": "https://example.com/"},
            {"canonical_url": "https://other.example/story"},
            {"source": ""}, {"source_verified_at": None},
        ):
            with self.subTest(changes=changes):
                self.assertFalse(compliance.check_candidate(candidate(**changes),
                    require_fresh=True, require_canonical=True, now=NOW)["pass"])
        url = "https://news.google.com/rss/articles/wrapper"
        self.assertFalse(compliance.check_publishable(self.draft(url=url), [url], NOW)["pass"])


    def test_unsafe_or_mismatched_links_and_warnings_hold(self):
        for url in ("javascript:alert(1)", "https://example.com/other", ""):
            with self.subTest(url=url):
                self.assertFalse(compliance.check_publishable(self.draft(), [url], NOW)["pass"])
        lengthy = self.draft() + "\n" + ("Community. " * 700)
        result = compliance.check_publishable(lengthy, [candidate()["url"]], NOW)
        self.assertFalse(result["pass"])
        self.assertTrue(any(flag["severity"] == "warning" for flag in result["flags"]))


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



class QueueTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        paths = {
            "ROOT": self.root,
            "STATE_DIR": self.root / "state",
            "DRAFTS_DIR": self.root / "drafts",
            "SEEN_PATH": self.root / "state" / "seen_urls.json",
            "QUEUE_PATH": self.root / "state" / "queue.json",
            "CANDIDATES_PATH": self.root / "state" / "candidates.json",
        }
        self.patcher = patch.multiple(run_daily, **paths)
        self.patcher.start()
        self.addCleanup(self.patcher.stop)
        self.clock = patch.object(run_daily, "datetime", wraps=datetime)
        self.clock.start().now.return_value = NOW
        self.addCleanup(self.clock.stop)
        self.gate_clock = patch.object(compliance, "datetime", wraps=datetime)
        self.gate_clock.start().now.return_value = NOW
        self.addCleanup(self.gate_clock.stop)
        self.output = io.StringIO()
        self.stdout = redirect_stdout(self.output)
        self.stderr = redirect_stderr(self.output)
        self.stdout.__enter__()
        self.stderr.__enter__()
        self.addCleanup(self.stdout.__exit__, None, None, None)
        self.addCleanup(self.stderr.__exit__, None, None, None)
        run_daily._ensure_dirs()

    def pool(self, items):
        run_daily._save_json(run_daily.CANDIDATES_PATH, {"items": items})

    def queue(self):
        return json.loads(run_daily.QUEUE_PATH.read_text())

    def save(self, queue):
        run_daily._save_json(run_daily.QUEUE_PATH, queue)

    def one_draft(self):
        self.pool([candidate()])
        self.assertEqual(run_daily.cmd_draft(), 0)
        return self.root / self.queue()["items"][0]["file"]

    def test_empty_rejected_and_used_sources_are_successful_noops(self):
        for items in ([], [candidate(title="Kratom law advances")], [candidate(published=None)]):
            self.pool(items)
            self.assertEqual(run_daily.cmd_draft(), 0)
            self.assertEqual(self.queue()["items"], [])
        self.one_draft()
        self.assertEqual(run_daily.cmd_draft(), 0)
        self.assertEqual(len(self.queue()["items"]), 1)
        self.assertEqual(len(list(run_daily.DRAFTS_DIR.glob("*.md"))), 1)

    def test_persisted_beer_and_unrelated_candidates_are_rescreened(self):
        titles = REJECTED_SEPTEMBER_HEADLINES + ("West Palm Beach arts and food weekend",)
        self.pool([candidate(title=title, url=f"https://example.com/rejected-{index}")
                   for index, title in enumerate(titles)])
        self.assertEqual(run_daily.cmd_draft(), 0)
        self.assertEqual(self.queue()["items"], [])
        self.assertEqual(list(run_daily.DRAFTS_DIR.glob("*.md")), [])
        self.assertEqual(json.loads(run_daily.CANDIDATES_PATH.read_text())["items"], [])

    def test_fetch_prunes_persisted_candidates_even_when_feed_is_unavailable(self):
        self.pool([candidate(title=REJECTED_SEPTEMBER_HEADLINES[2], url="https://example.com/bbq"),
                   candidate(published=(NOW - timedelta(days=15)).isoformat(), url="https://example.com/stale"),
                   candidate(canonical_url=None, url="https://example.com/unverified"), candidate()])
        with patch.object(run_daily, "_fetch_url", side_effect=OSError("Feed unavailable")):
            self.assertEqual(run_daily.cmd_fetch(), 0)
        pool = json.loads(run_daily.CANDIDATES_PATH.read_text())["items"]
        self.assertEqual([item["title"] for item in pool], [candidate()["title"]])

    def test_fetch_rechecks_resolved_headline_before_marking_source_seen(self):
        source_file = self.root / "sources.json"
        source_file.write_text(json.dumps({"feeds": [{"id": "test", "url": "https://example.com/rss"}]}))
        for resolved in (candidate(title=REJECTED_SEPTEMBER_HEADLINES[2]), candidate()):
            with patch.object(run_daily, "SOURCES", source_file), \
                 patch.object(run_daily, "_fetch_url", return_value=b"rss"), \
                 patch.object(run_daily, "parse_rss", return_value=[candidate()]), \
                 patch.object(run_daily, "_resolve_source", return_value=resolved):
                self.assertEqual(run_daily.cmd_fetch(), 0)
            pool = json.loads(run_daily.CANDIDATES_PATH.read_text())["items"]
            seen = json.loads(run_daily.SEEN_PATH.read_text())["urls"]
            expected = int(resolved["title"] == candidate()["title"])
            self.assertEqual(len(pool), expected)
            self.assertEqual(len(seen), expected)

    def test_same_source_in_multiple_pool_entries_and_crash_recovery(self):
        self.pool([candidate(), candidate()])
        self.assertEqual(run_daily.cmd_draft(), 0)
        self.assertEqual(self.queue()["items"][0]["source_urls"], [candidate()["url"]])
        # Reproduce a crash after file creation but before queue persistence.
        self.save({"items": []})
        self.assertEqual(run_daily.cmd_draft(), 0)
        self.assertEqual(len(list(run_daily.DRAFTS_DIR.glob("*.md"))), 1)

    def test_published_state_and_unchanged_staged_state_are_preserved(self):
        path = self.one_draft()
        self.assertEqual(run_daily.cmd_check(), 0)
        queue = self.queue()
        queue["items"][0]["status"] = "staged"
        self.save(queue)
        self.assertEqual(run_daily.cmd_check(), 0)
        self.assertEqual(self.queue()["items"][0]["status"], "staged")
        queue = self.queue()
        queue["items"][0]["status"] = "published"
        queue["items"][0]["published_at"] = NOW.isoformat()
        self.save(queue)
        path.write_text(path.read_text() + "\nA new kratom law")
        self.assertEqual(run_daily.cmd_check(), 2)
        self.assertEqual(self.queue()["items"][0]["status"], "published")

    def test_manual_approval_rechecks_changed_bytes(self):
        path = self.one_draft()
        self.assertEqual(run_daily.cmd_check(), 0)
        self.assertEqual(run_daily.cmd_approve(str(path)), 0)
        original = self.queue()["items"][0]["approved_sha256"]
        path.write_text(path.read_text() + "\nTODO: add more")
        self.assertEqual(run_daily.cmd_approve(str(path)), 1)
        item = self.queue()["items"][0]
        self.assertEqual(item["status"], "held")
        self.assertNotEqual(original, item["checked_sha256"])
        self.assertNotIn("approved_sha256", item)

    def test_hash_covers_crlf_bytes_and_staged_change_requires_restage(self):
        path = self.one_draft()
        self.assertEqual(run_daily.cmd_check(), 0)
        queue = self.queue()
        queue["items"][0]["status"] = "staged"
        self.save(queue)
        path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))
        run_daily.cmd_check()
        item = self.queue()["items"][0]
        self.assertNotEqual(item["status"], "staged")
        self.assertEqual(item["checked_sha256"], hashlib.sha256(path.read_bytes()).hexdigest())

    def test_routine_run_persists_holds_without_job_failure(self):
        path = self.one_draft()
        path.write_text(path.read_text() + "\nTODO: finish this")
        with patch.object(run_daily, "cmd_fetch", return_value=0):
            self.assertEqual(run_daily.cmd_run(), 0)
        self.assertEqual(self.queue()["items"][0]["status"], "held")
        self.assertEqual(run_daily.cmd_check(), 2)

    def test_llm_flag_makes_no_network_call(self):
        self.pool([candidate()])
        with patch.object(run_daily.urllib.request, "urlopen", side_effect=AssertionError("Unexpected network call")):
            self.assertEqual(run_daily.cmd_draft(use_llm=True), 0)


if __name__ == "__main__":
    unittest.main()
