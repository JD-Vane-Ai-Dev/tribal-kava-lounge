"""Offline regressions for the bounded footwear house-rule exception."""

import copy
import hashlib
import unittest
from datetime import datetime, timezone
from pathlib import Path

import compliance
from test_article_fixture import article, encode


HOUSE_RULES = "Are there house rules (no food at the table, footwear policy, cue care, max players per table)?"
LEGAL_RULE = "editorial-legal-or-political-coverage"


class EditorialPolicyTests(unittest.TestCase):
    def check_article(self, meta, body):
        return compliance.check_publishable(encode(meta, body), [s["url"] for s in meta["sources"]])

    def assert_legal_hold(self, result):
        self.assertFalse(result["pass"], result)
        self.assertIn(LEGAL_RULE, [flag["rule"] for flag in result["flags"]], result)

    def test_unchanged_reviewed_pool_article_passes(self):
        path = Path(__file__).parent / "drafts/pool-tables-kava-lounge-hang.md"
        raw = path.read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(), "ff6ca9841a259e61dc944c9107dc99fa1061a9e5b4e7395b91dcb3755e237757")
        meta, body = compliance.parse_article(raw.decode())
        self.assertIn(HOUSE_RULES, body)
        self.assertEqual(meta["writerReview"]["contentSha256"], compliance.article_review_hash(meta, body))
        result = compliance.check_publishable(raw.decode(), [s["url"] for s in meta["sources"]],
                                              now=datetime(2026, 10, 8, 12, tzinfo=timezone.utc))
        self.assertTrue(result["pass"], result)
        self.assertEqual(path.read_bytes(), raw)

    def test_exact_operational_item_passes_body_candidate_and_metadata(self):
        for text in (HOUSE_RULES, HOUSE_RULES.upper(), HOUSE_RULES.replace("footwear policy", "footwear\tpolicy")):
            with self.subTest(text=text):
                self.assertTrue(compliance.check_text(text)["pass"])
                self.assertTrue(compliance.check_candidate({"title": "Kava lounge visit", "summary": text})["pass"])
        meta, body = compliance.parse_article(article())
        self.assertTrue(self.check_article(meta, body + "\n" + HOUSE_RULES)["pass"])
        for key in ("title", "seoTitle", "metaDescription", "dek", "category", "primaryKeyword", "tags", "keywords", "faq_question", "faq_answer"):
            changed, changed_body = self.with_field(meta, body, key, "Kava lounge: " + HOUSE_RULES)
            with self.subTest(field=key):
                result = self.check_article(changed, changed_body)
                self.assertTrue(result["pass"], result)

    def with_field(self, meta, body, key, text):
        changed = copy.deepcopy(meta)
        if key in {"tags", "keywords"}:
            changed[key] = [text]
        elif key.startswith("faq_"):
            changed["faq"][0][key.removeprefix("faq_")] = text
        else:
            changed[key] = text
            if key == "title":
                body = body.replace("# " + meta["title"] + "\n", "# " + text + "\n", 1)
        return changed, body

    def test_generic_and_government_policy_remain_blocked(self):
        for phrase in ("policy", "public policy", "government policy", "kratom policy", "foreign policy",
                       "footwear policy", "government footwear policy", "footwear policy enforcement",
                       "house rules (government footwear policy, cue care)",
                       "house rules (footwear policy mandated by government, cue care)",
                       "house rules (footwear policy reform, cue care)",
                       "house rules (barefootwear policy, cue care)",
                       "house rules (footwear\npolicy, cue care)",
                       "house rules (no food,\nfootwear policy, cue care)",
                       "house rules (no food, footwear policy", "footwear policy (house rules)"):
            with self.subTest(phrase=phrase):
                self.assert_legal_hold(compliance.check_text("Kava lounge: " + phrase))

    def test_skip_one_token_never_skips_remaining_legal_or_other_flags(self):
        for phrase in ("public policy", "government policy", "kratom policy", "law", "laws", "bill",
                       "legislation", "regulation", "regulatory", "legal", "political", "lobbying"):
            for text in (HOUSE_RULES + " " + phrase, phrase + " " + HOUSE_RULES,
                         HOUSE_RULES.replace("cue care", phrase)):
                with self.subTest(text=text):
                    self.assert_legal_hold(compliance.check_text(text))
        for phrase in ("enforcement", "FDA", "DEA", "7-OH", "pain", "medical", "treats anxiety", "beer"):
            for text in (HOUSE_RULES + " " + phrase, HOUSE_RULES.replace("cue care", phrase)):
                with self.subTest(text=text):
                    self.assertFalse(compliance.check_text(text)["pass"])

    def test_metadata_body_and_faq_flags_still_hold_with_operational_item(self):
        meta, body = compliance.parse_article(article())
        for key in ("title", "seoTitle", "metaDescription", "dek", "category", "primaryKeyword", "tags", "keywords", "faq_question", "faq_answer"):
            for phrase in ("public policy", "government policy", "kratom policy", "laws", "bill", "regulation", "political"):
                changed, changed_body = self.with_field(meta, body + "\n" + HOUSE_RULES, key, "Kava " + phrase)
                with self.subTest(field=key, phrase=phrase):
                    self.assert_legal_hold(self.check_article(changed, changed_body))
            changed, changed_body = self.with_field(meta, body, key, "Kava lounge: " + HOUSE_RULES)
            self.assert_legal_hold(self.check_article(changed, changed_body + "\nKratom policy changes."))
        for position in ("question", "answer"):
            changed = copy.deepcopy(meta)
            changed["faq"][0][position] = HOUSE_RULES + " Government policy changes."
            self.assert_legal_hold(self.check_article(changed, body))

    def test_operational_context_cannot_be_assembled_across_fields(self):
        for separator in ("\n", "\r", "\v", "\f", "\x1c", "\x1d", "\x1e", "\x85", "\u2028", "\u2029"):
            with self.subTest(separator=repr(separator)):
                self.assert_legal_hold(compliance.check_candidate({
                    "title": "Kava lounge", "summary": f"house rules (cue{separator}care, footwear policy, no food)",
                }))
        for fields in (
            {"title": "Kava house rules (no food, footwear", "summary": "policy, cue care)"},
            {"title": "Kava visit", "summary": "house rules (no food,", "source": "footwear policy, cue care)"},
            {"title": HOUSE_RULES + " Kava", "summary": "Government policy"},
            {"title": "Kava public policy", "summary": HOUSE_RULES},
        ):
            with self.subTest(fields=fields):
                self.assert_legal_hold(compliance.check_candidate(fields))
        meta, body = compliance.parse_article(article())
        changed = copy.deepcopy(meta)
        changed.update(seoTitle="Kava house rules (no food, footwear", metaDescription="policy, cue care)")
        self.assert_legal_hold(self.check_article(changed, body))
        changed = copy.deepcopy(meta)
        changed["title"] = "footwear policy, cue care) Kava lounge"
        body = body.replace(meta["title"], changed["title"], 1) + "\nhouse rules (no food, "
        self.assert_legal_hold(self.check_article(changed, body))
        meta, body = compliance.parse_article(article())
        for key in ("faq", "tags", "keywords"):
            changed = copy.deepcopy(meta)
            if key == "faq":
                changed[key][0] = {"question": "house rules (cue care", "answer": ", footwear policy, no food)"}
            else:
                changed[key] = ["house rules (cue care", ", footwear policy, no food)"]
            with self.subTest(field=key):
                self.assert_legal_hold(self.check_article(changed, body))

    def test_exception_does_not_bypass_writer_review_binding(self):
        path = Path(__file__).parent / "drafts/pool-tables-kava-lounge-hang.md"
        meta, body = compliance.parse_article(path.read_text())
        result = self.check_article(meta, body + "\nAn added sentence.")
        self.assertIn("writer-review-required", [flag["rule"] for flag in result["flags"]])

    def test_field_boundaries_do_not_weaken_existing_claim_or_footer_checks(self):
        result = compliance.check_candidate({
            "title": "Kava strong", "summary": "kratom tea", "url": "https://example.com/tea",
            "published": "2026-10-08",
        }, require_fresh=True, now=datetime(2026, 10, 8, 12, tzinfo=timezone.utc))
        self.assertIn("extract/shot intensity hype", [flag["rule"] for flag in result["flags"]])
        meta, body = compliance.parse_article(article())
        for key in ("dek", "metaDescription"):
            changed = {**meta, key: compliance.TRUSTED_RESPONSIBLE_USE_FOOTER}
            with self.subTest(field=key):
                result = self.check_article(changed, body)
                self.assertIn("editorial-health-or-medical-framing", [flag["rule"] for flag in result["flags"]])
        changed = {**meta, "seoTitle": "Kava strong", "metaDescription": "kratom tea"}
        result = self.check_article(changed, body)
        self.assertIn("extract/shot intensity hype", [flag["rule"] for flag in result["flags"]])


if __name__ == "__main__":
    unittest.main()
