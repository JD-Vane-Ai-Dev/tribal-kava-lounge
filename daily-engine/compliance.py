#!/usr/bin/env python3
"""
v0 Compliance API — deterministic rules from Master Build Document §3.

Returns: { "pass": bool, "score": 0-100, "flags": [...], "required_additions": [...] }
No medical advice. No network. Safe to run offline on every draft.
"""

from __future__ import annotations

import re
import json
import html
import hashlib
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit

MAX_SOURCE_AGE_DAYS = 14
TRUSTED_RESPONSIBLE_USE_FOOTER = (
    "**Responsible use:** Kratom products are for adults 21+ only. Valid ID required. "
    "Products are not intended to diagnose, treat, cure, or prevent any disease. "
    "Do not mix kava or kratom with alcohol or other substances. "
    "If you are pregnant, nursing, taking medications, or have health concerns, speak with a qualified professional."
)


def published_datetime(value: Any) -> datetime | None:
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None


def is_fresh_published(value: Any, now: datetime | None = None) -> bool:
    published = published_datetime(value)
    current = now or datetime.now(timezone.utc)
    return published is not None and 0 <= (current.date() - published.date()).days <= MAX_SOURCE_AGE_DAYS


def valid_source_url(value: Any) -> bool:
    if not isinstance(value, str) or re.search(r"[\s<>\"'()]", value):
        return False
    try:
        parsed = urlsplit(value)
        return bool(parsed.scheme in {"http", "https"} and parsed.hostname and not parsed.username and not parsed.password)
    except ValueError:
        return False


def publisher_source_url(value: Any) -> bool:
    """Attribution must point to an article, not a discovery/consent wrapper."""
    if not valid_source_url(value):
        return False
    parsed = urlsplit(value)
    host = parsed.hostname.lower()
    return (host not in {"google.com", "www.google.com", "news.google.com", "consent.google.com"}
            and bool(parsed.path.strip("/")))

# Standard disclaimer language is ALLOWED (strip before claim scan)
ALLOWED_DISCLAIMER_PATTERNS = [
    r"not intended to diagnose,? treat,? cure,? or prevent any disease",
    r"products? are not intended to diagnose",
    r"do not mix kava or kratom with alcohol",
    r"speak with a qualified professional",
    r"valid (government-issued )?id required",
    r"kratom products are for adults 21\+",
]

# §3.1-style prohibited patterns (case-insensitive) — marketing claims only
PROHIBITED = [
    (r"\breliev(?:e|es|ing)\s+pain\b", "pain-relief claim"),
    (r"\bpain\s+relief\b", "pain-relief claim"),
    (r"\b(treats?|treating)\s+(anxiety|pain|depression|addiction|withdrawal|insomnia|stress)\b", "treatment claim"),
    (r"\btreatment for\b", "treatment claim"),
    (r"\b(cures?|curing)\s+\w+", "cure claim"),
    (r"\bprevents?\s+(disease|illness|addiction|anxiety|pain)\b", "prevention claim"),
    (r"\bopioid\s+withdrawal\b", "opioid/withdrawal claim"),
    (r"\b(helps? with|for) addiction\b", "addiction framing"),
    (r"\b(cures?|treats?) addiction\b", "addiction framing"),
    (r"\b(anxiety|depression|insomnia)\s+(relief|remedy|medicine)\b", "mental-health condition claim"),
    (r"\bhelps?\s+(you\s+)?(with\s+)?(sleep|anxiety|depression|stress)\b", "sleep/mood claim"),
    (r"\bmelts?\s+stress\b", "stress/effect claim"),
    (r"\b(sedative|euphoria|euphoric)\b", "effect hype"),
    (r"\b(herbal )?supplement\b", "supplement framing"),
    (r"\bnootropic\b", "supplement framing"),
    (r"\b(energy\s+boost|boosts?\s+energy|gives?\s+energy)\b", "energy claim"),
    (r"\b(workout|productivity)\s+(boost|aid|enhancer)?\b", "performance claim"),
    (r"\bsafe\s+for\s+daily\s+use\b", "daily-use safety claim"),
    (r"\brisk[-\s]?free\b", "risk-free claim"),
    (r"\bguaranteed?\s+effects?\b", "guaranteed effects"),
    (r"\b(recommended dosing|dosage instructions|mg\s+per\s+day)\b", "dosing advice"),
    (r"\b(strong|powerful|potent)\b.{0,30}\b(extract|shot|kratom)\b", "extract/shot intensity hype"),
    (r"\b(extract|shot)s?\b.{0,30}\b(strong|powerful|potent|energy)\b", "extract/shot intensity hype"),
]



# Daily editorial gate — separate from product-claim compliance.
# These topics are disallowed in Daily stories even when reported neutrally.
EDITORIAL_REJECT_PATTERNS = [
    (r"\b(?:7[\s-]?oh|7-hydroxymitragynine)\b", "7-OH coverage"),
    (r"\b(?:regulation|regulatory|legislation|legislative|bill|law|laws|legal|policy|political|lobby(?:ing|ist)?)\b", "legal or political coverage"),
    (r"\b(?:fda|dea|ban(?:ned|s)?|crackdown|fine|penalt(?:y|ies)|enforcement|court|lawsuit|recall|warning)\b", "regulatory or enforcement coverage"),
    (r"\b(?:addiction|addicted|withdrawal|overdoses?|deaths?|died|fatal(?:ity|ities)?|hospitali[sz]\w*|poison\w*|contaminat\w*|danger\w*|risks?|scares?|harms?)\b", "negative or scare coverage"),
    (r"\b(?:anxiety|depression|pain|sleep|insomnia|health|medical)\b", "health or medical framing"),
    (r"\b(?:smoking|tobacco)\b|\b(?:reduce|stop|quit|curb)\s+kava\s+(?:drinking|consumption)\b", "health or consumption-warning coverage"),
]

TOPIC_ANCHOR = re.compile(
    r"\b(?:kava|kratom|botanical[\s-]+(?:tea|drink|beverage|lounge)s?|"
    r"non[\s-]?alcoholic|alcohol[\s-]?free|zero[\s-]?proof|sober(?:[\s-]curious)?)\b", re.I
)


def alcohol_promotion_flags(text: str) -> list[dict[str, str]]:
    """Screen actual drink/event words, preserving explicit alcohol-free contexts.

    Qualifying one drink does not exempt the rest of a mixed roundup.
    """
    text = html.unescape(re.sub(r"<[^>]+>", " ", text))
    text = re.sub(
        r"\b(?:non[\s-]?alcoholic|alcohol[\s-]?free|zero[\s-]?proof)\s+"
        r"(?:craft\s+)?(?:beers?|wines?|cocktails?|brews?|champagne|mimosas?)\b", " ", text, flags=re.I
    )
    text = re.sub(r"\b(?:kava|kratom|tea|coffee)\s+(?:brews?|cocktails?)\b", " ", text, flags=re.I)
    text = re.sub(r"\bcold[\s-]+brew\s+(?:coffee|tea)\b", " ", text, flags=re.I)
    text = re.sub(
        r"\b(?:without(?:\s+(?:the|any|mandatory))?|no|skip(?:ping)?)\s+"
        r"(?:beer|wine|champagne|alcohol|cocktails?)\b", " ", text, flags=re.I
    )
    match = re.search(
        r"\b(?:beers?|beerfest|brews?|brewery|breweries|brewfest|wines?|champagne|"
        r"liquor|booze|mimosas?|cocktails?|oktoberfest)\b", text, re.I
    )
    return ([{"severity": "error", "rule": "editorial-alcohol-promotion", "match": match.group(0)}]
            if match else [])

def check_candidate(item: dict[str, Any], *, category: str = "", require_fresh: bool = False, now: datetime | None = None, require_relevant: bool = True, require_canonical: bool = False) -> dict[str, Any]:
    """Reject Daily candidates that conflict with Tribal's positive editorial scope."""
    text = html.unescape(" ".join(str(item.get(k, "")) for k in ("title", "summary", "source")))
    flags = alcohol_promotion_flags(text)
    # The headline is what we publish. A snippet or publisher name cannot make
    # an unrelated headline eligible at intake but fail later in the publisher.
    topic = html.unescape(re.sub(r"<[^>]+>", " ", str(item.get("title") or "")))
    if require_relevant and not TOPIC_ANCHOR.search(topic):
        flags.append({"severity": "error", "rule": "editorial-unrelated-topic", "match": str(item.get("title", ""))})
    for pattern, label in EDITORIAL_REJECT_PATTERNS:
        match = re.search(pattern, text, flags=re.I)
        if match:
            flags.append({"severity": "error", "rule": "editorial-" + label.lower().replace(" ", "-"), "match": match.group(0)})
    if category.lower() in {"regulation", "legal", "politics"}:
        flags.append({"severity": "error", "rule": "editorial-disallowed-category", "match": category})
    if require_fresh:
        # Apply the publisher's claim checks before assembling a multi-source
        # draft, so one performance/medical headline cannot hold clean stories.
        for pattern, label in PROHIBITED:
            match = re.search(pattern, text, re.I)
            if match:
                flags.append({"severity": "error", "rule": label, "match": match.group(0)})
        if len(topic.strip()) < 6:
            flags.append({"severity": "error", "rule": "missing-source-title", "match": topic})
        if not is_fresh_published(item.get("published"), now):
            flags.append({"severity": "error", "rule": "source-date-unknown-or-stale", "match": str(item.get("published"))})
        if not valid_source_url(item.get("url")):
            flags.append({"severity": "error", "rule": "invalid-source-url", "match": str(item.get("url"))})
    if require_canonical:
        if (not publisher_source_url(item.get("url"))
                or item.get("canonical_url") != item.get("url")
                or not str(item.get("source") or "").strip()
                or not is_fresh_published(item.get("source_verified_at"), now)):
            flags.append({"severity": "error", "rule": "unverified-canonical-attribution", "match": str(item.get("url"))})
    return {
        "pass": not flags,
        "flags": flags,
        "summary": "PASS" if not flags else "REJECTED: " + flags[0]["rule"],
    }


def _strip_allowed(text: str) -> str:
    out = text
    for pat in ALLOWED_DISCLAIMER_PATTERNS:
        out = re.sub(pat, " ", out, flags=re.I)
    return out

REQUIRED_PHRASES_IF_KRATOM = [
    ("21+", "Kratom content should mention 21+"),
]

RESPONSIBLE_USE_HINTS = [
    "not intended to diagnose",
    "do not mix",
    "valid id",
    "qualified professional",
]


def check_text(text: str, *, context: str = "daily") -> dict[str, Any]:
    flags: list[dict[str, str]] = []
    lower = text.lower()
    scan = _strip_allowed(text)

    if context == "daily":
        # Exempt only the exact trusted paragraph. A separator is not a boundary
        # that can conceal another story or arbitrary footer text from the gate.
        editorial_body = "\n".join(line for line in text.splitlines() if line != TRUSTED_RESPONSIBLE_USE_FOOTER)
        editorial = check_candidate({"title": editorial_body, "summary": ""}, require_relevant=False)
        flags.extend(editorial["flags"])

    for pattern, label in PROHIBITED:
        for m in re.finditer(pattern, scan, flags=re.I):
            flags.append(
                {
                    "severity": "error",
                    "rule": label,
                    "match": m.group(0),
                    "span": f"{m.start()}-{m.end()}",
                }
            )

    required_additions: list[str] = []
    mentions_kratom = bool(re.search(r"\bkratom\b", text, re.I))
    if mentions_kratom:
        for needle, msg in REQUIRED_PHRASES_IF_KRATOM:
            if needle.lower() not in lower:
                required_additions.append(msg)
                flags.append({"severity": "error", "rule": "missing-21-plus", "match": msg})

        # Soft warnings for missing responsible-use language on longer posts
        if len(text) > 400:
            if not any(h in lower for h in RESPONSIBLE_USE_HINTS):
                flags.append(
                    {
                        "severity": "warning",
                        "rule": "missing-responsible-use-language",
                        "match": "Consider footer-style responsible-use lines on longer kratom posts",
                    }
                )

    # Copyright: huge pasted blocks (heuristic)
    if len(text) > 30000:
        flags.append(
            {
                "severity": "warning",
                "rule": "length",
                "match": "Very long draft — ensure this is original summary, not republished article text",
            }
        )

    errors = [f for f in flags if f["severity"] == "error"]
    warnings = [f for f in flags if f["severity"] == "warning"]
    score = max(0, 100 - 25 * len(errors) - 5 * len(warnings))

    return {
        "pass": len(errors) == 0,
        "score": score,
        "flags": flags,
        "required_additions": required_additions,
        "context": context,
        "summary": "PASS" if not errors else f"FAIL ({len(errors)} error(s))",
    }


def parse_article(text: str) -> tuple[dict, str]:
    """JSON front matter is part of the exact checked manuscript bytes."""
    match = re.match(r"\A---\r?\n(.*?)\r?\n---\r?\n(.*)\Z", text, re.S)
    if not match:
        raise ValueError("Original article JSON front matter is required")
    try:
        metadata = json.loads(match[1])
    except (ValueError, TypeError) as error:
        raise ValueError("Invalid article metadata") from error
    if not isinstance(metadata, dict):
        raise ValueError("Article metadata must be an object")
    return metadata, match[2]


def article_review_hash(meta: dict, body: str) -> str:
    """Bind a model review to all manuscript data except the review itself."""
    reviewed = {key: value for key, value in meta.items() if key != 'writerReview'}
    value = json.dumps({'metadata': reviewed, 'body': body}, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(value.encode()).hexdigest()


def check_publishable(text: str, source_urls: list[str], now: datetime | None = None) -> dict[str, Any]:
    """Require a complete original manuscript; headlines never become a post.

    These structural checks supplement editorial review, not proof of factual
    accuracy or originality. All metadata, FAQs and text are checked together.
    Evergreen references do not expire just because they are over 14 days old.
    """
    flags = []
    def reject(rule, match):
        flags.append({"severity": "error", "rule": rule, "match": str(match)})
    try:
        meta, body = parse_article(text)
    except ValueError as error:
        return {"pass": False, "score": 0, "flags": [{"severity": "error", "rule": "original-article-required", "match": str(error)}], "required_additions": [], "summary": "HOLD: original article required"}
    if 'writer' in meta or 'writerReview' in meta:
        review = meta.get('writerReview')
        if (not isinstance(meta.get('writer'), dict) or not isinstance(review, dict)
                or review.get('status') != 'pass' or review.get('issues') != []
                or review.get('contentSha256') != article_review_hash(meta, body)):
            reject('writer-review-required', 'Exact current article must pass the grounded writer review')
    visible_meta = " ".join(str(meta.get(k, "")) for k in ("title", "seoTitle", "metaDescription", "dek", "category", "primaryKeyword", "tags", "keywords", "faq"))
    flags.extend(check_text(body + "\n" + visible_meta, context="daily")["flags"])
    for key in ("title", "seoTitle", "metaDescription", "dek", "category", "primaryKeyword"):
        if not isinstance(meta.get(key), str) or not meta[key].strip() or re.search(r"[<>]", meta[key]):
            reject("missing-or-unsafe-metadata", key)
    if meta.get("contentFormat") != "original-article":
        reject("original-article-required", "contentFormat")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", str(meta.get("slug", ""))) or str(meta.get("slug", "")).startswith("daily-digest-"):
        reject("invalid-article-slug", meta.get("slug"))
    today = (now or datetime.now(timezone.utc)).date()
    for key in ("date", "modified"):
        value = meta.get(key)
        stamp = published_datetime(value)
        if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) or not stamp or stamp.date() > today:
            reject("invalid-article-date", key)
    if str(meta.get("modified", "")) < str(meta.get("date", "")):
        reject("modified-before-publication", "modified")
    if not re.search(r"^# " + re.escape(str(meta.get("title", ""))) + r"\s*$", body, re.M) or len(re.findall(r"^# ", body, re.M)) != 1:
        reject("article-title-mismatch", "One matching H1 is required")
    if not TOPIC_ANCHOR.search(str(meta.get("title", ""))):
        reject("editorial-unrelated-topic", meta.get("title"))
    main = body.split("\n## Sources")[0].replace(TRUSTED_RESPONSIBLE_USE_FOOTER, "")
    prose = re.sub(r"\[[^\]]+\]\([^)]+\)", "", main)
    words = re.findall(r"\b[\w’'-]+\b", prose)
    if len(words) < 450:
        reject("thin-article", "At least 450 substantive words; write to answer the question, never pad")
    if len(re.findall(r"^## ", main, re.M)) < 3:
        reject("incomplete-article-sections", "Three useful sections are required")
    for pattern in (r"\b(?:TODO|TBD|placeholder|lorem ipsum)\b", r"\[insert\b", r"Read the source", r"selection of source headlines", r"^## \d+\. "):
        if re.search(pattern, body, re.I | re.M):
            reject("unfinished-or-headline-digest", pattern)
    if re.search(r"</?[A-Za-z][^>]*>", body):
        reject("raw-html", "Use manuscript Markdown")
    if TRUSTED_RESPONSIBLE_USE_FOOTER not in body.splitlines():
        reject("missing-trusted-footer", "Complete footer required")
    for key in ("tags", "keywords"):
        values = meta.get(key)
        if not isinstance(values, list) or not values or any(not isinstance(v, str) or not v.strip() or re.search(r"[<>]", v) for v in values):
            reject("invalid-metadata-list", key)
    faq = meta.get("faq")
    if not isinstance(faq, list) or len(faq) < 2 or any(not isinstance(f, dict) or any(not isinstance(f.get(k), str) or not f[k].strip() or re.search(r"[<>]", f[k]) for k in ("question", "answer")) for f in faq):
        reject("incomplete-faq", "At least two useful answers are required")
    links = re.findall(r"\[[^\]]+\]\(([^)]+)\)", body)
    if any(not valid_source_url(url) for url in links):
        reject("unsafe-link", "Use complete https links")
    internal = {urlsplit(url).path for url in links if valid_source_url(url) and urlsplit(url).hostname == "www.thetribalkavalounge.com"}
    if len(internal) < 2 or not internal.intersection({"/menu", "/visit", "/new-here"}):
        reject("missing-internal-links", "Link relevant learning and visit/menu pages")
    sources = meta.get("sources")
    if not isinstance(sources, list) or not sources:
        reject("missing-evidence", "Read sources and document what each supports")
        sources = []
    urls = []
    for source in sources:
        if not isinstance(source, dict):
            reject("invalid-evidence", source)
            continue
        url = source.get("url")
        urls.append(url)
        checked = published_datetime(source.get("verifiedAt"))
        if not publisher_source_url(url) or url not in links or not source.get("title") or not source.get("supports") or not checked or checked.date() > today:
            reject("incomplete-source-evidence", url)
    if not isinstance(source_urls, list) or urls != source_urls or len(set(str(u) for u in urls)) != len(urls):
        reject("source-links-mismatch", "Queue and manuscript evidence must match")
    if meta.get("storyType") not in {"guide", "culture", "humor", "reported-experience"}:
        reject("invalid-story-type", meta.get("storyType"))
    if meta.get("storyType") == "reported-experience":
        evidence = meta.get("experienceEvidence")
        if not isinstance(evidence, dict) or evidence.get("kind") != "actual-kava-bar-visit" or evidence.get("url") not in urls or not evidence.get("attribution") or not evidence.get("visitEvidence"):
            reject("unverified-first-visit-story", "A real bar visit and visible attribution are required")
        elif evidence["attribution"] not in body:
            reject("missing-story-attribution", evidence["attribution"])
    if re.search(r"\b(?:I|we) (?:visited|walked into|tried kava for the first time)\b", body, re.I) and meta.get("storyType") != "reported-experience":
        reject("unsupported-first-person-experience", "Use a sourced account; do not invent a visit")
    paragraphs = [re.sub(r"\W+", " ", p).strip().lower() for p in main.split("\n\n") if len(p.split()) > 35]
    if len(paragraphs) != len(set(paragraphs)):
        reject("repeated-prose", "Repeated paragraphs do not make a complete article")
    return {"pass": not flags, "score": max(0, 100 - 25 * len(flags)), "flags": flags, "required_additions": [], "summary": "PASS" if not flags else "HOLD: " + ", ".join(f["rule"] for f in flags)}


def check_catalog_post(post: dict[str, Any]) -> dict[str, Any]:
    """Recheck deployed content, including entries already marked published.

    Evergreen articles keep their approved scope. Feed roundups additionally
    apply all Daily editorial exclusions to every source headline, without
    expiring a legitimate archived article solely because it has aged.
    """
    body = str(post.get("body", ""))
    visible = " ".join(str(post.get(k, "")) for k in ("title", "seoTitle", "metaDescription", "dek")) + " " + body
    flags = alcohol_promotion_flags(visible)
    if str(post.get("slug", "")).startswith("daily-digest-") or "Read the source" in body:
        flags.append({"severity": "error", "rule": "retired-headline-digest", "match": post.get("slug", "")})
    if post.get("contentFormat") != "original-article" and (post.get("contentSha256") or str(post.get("slug", "")).startswith("daily-digest-")):
        headings = re.findall(r"<h2[^>]*>(.*?)</h2>", body, re.S | re.I)
        if not headings:
            flags.append({"severity": "error", "rule": "missing-source-headlines", "match": post.get("slug", "")})
        for heading in headings:
            title = html.unescape(re.sub(r"<[^>]+>", " ", heading))
            flags.extend(check_candidate({"title": title})["flags"])
    return {"pass": not flags, "flags": flags, "summary": "PASS" if not flags else "HOLD: catalogue editorial check"}


if __name__ == "__main__":
    import json
    import sys

    sample = sys.stdin.read() if not sys.argv[1:] else open(sys.argv[1]).read()
    print(json.dumps(check_text(sample), indent=2))
