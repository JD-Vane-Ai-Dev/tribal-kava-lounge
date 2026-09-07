#!/usr/bin/env python3
"""
v0 Compliance API — deterministic rules from Master Build Document §3.

Returns: { "pass": bool, "score": 0-100, "flags": [...], "required_additions": [...] }
No medical advice. No network. Safe to run offline on every draft.
"""

from __future__ import annotations

import re
import html
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
    (r"\b(?:kratom|mitragynine)\b", "kratom news is outside the Daily editorial scope"),
    (r"\b(?:anxiety|depression|pain|sleep|insomnia|health|medical)\b", "health or medical framing"),
]

def check_candidate(item: dict[str, Any], *, category: str = "", require_fresh: bool = False, now: datetime | None = None) -> dict[str, Any]:
    """Reject Daily candidates that conflict with Tribal's positive editorial scope."""
    text = html.unescape(" ".join(str(item.get(k, "")) for k in ("title", "summary", "source")))
    flags = []
    for pattern, label in EDITORIAL_REJECT_PATTERNS:
        match = re.search(pattern, text, flags=re.I)
        if match:
            flags.append({"severity": "error", "rule": "editorial-" + label.lower().replace(" ", "-"), "match": match.group(0)})
    if category.lower() in {"regulation", "legal", "politics"}:
        flags.append({"severity": "error", "rule": "editorial-disallowed-category", "match": category})
    if require_fresh:
        if not is_fresh_published(item.get("published"), now):
            flags.append({"severity": "error", "rule": "source-date-unknown-or-stale", "match": str(item.get("published"))})
        if not valid_source_url(item.get("url")):
            flags.append({"severity": "error", "rule": "invalid-source-url", "match": str(item.get("url"))})
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
        editorial = check_candidate({"title": editorial_body, "summary": ""})
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
    if len(text) > 6000:
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


def check_publishable(text: str, source_urls: list[str], now: datetime | None = None) -> dict[str, Any]:
    """Fail closed on unfinished, uncredited, stale, or flagged Daily content.

    Source headlines and publication dates are carried from the feed into each
    numbered section; no article-body summary is inferred from an RSS snippet.
    This check is run again on the exact bytes immediately before staging.
    """
    result = check_text(text, context="daily")
    flags = result["flags"]

    def reject(rule: str, match: str) -> None:
        flags.append({"severity": "error", "rule": rule, "match": match})

    title = re.match(r"\A# The Daily Kava Digest — (\d{4}-\d{2}-\d{2})\s*\n", text)
    if not title or not is_fresh_published(title.group(1), now):
        reject("missing-or-stale-digest-title", "A current, dated Daily Kava title is required")
    for pattern in (
        r"\b(?:TODO|TBD|placeholder|lorem ipsum)\b", r"\[insert\b",
        r"human approval required", r"Snippet context", r"add a specific",
        r"before approval", r"we summarize in our own words", r"worth a glance if you care",
    ):
        if re.search(pattern, text, re.I):
            reject("unfinished-draft", pattern)
    if TRUSTED_RESPONSIBLE_USE_FOOTER not in text.splitlines():
        reject("missing-trusted-footer", "The complete responsible-use footer is required")
    if re.search(r"</?[A-Za-z][^>]*>", text):
        reject("raw-html", "Raw HTML is not eligible for automatic publication")

    urls = source_urls if isinstance(source_urls, list) else []
    if not urls or any(not valid_source_url(url) for url in urls):
        reject("invalid-source-urls", "At least one valid HTTP(S) source URL is required")
    elif len(set(urls)) != len(urls):
        reject("duplicate-source-url", "Each source must appear once")

    headings = list(re.finditer(r"^## (\d+)\. (.+)$", text, re.M))
    cited = []
    if not headings or len(headings) != len(urls):
        reject("incomplete-story-sections", "Each source needs a completed numbered story section")
    for index, heading in enumerate(headings):
        section = text[heading.end():headings[index + 1].start() if index + 1 < len(headings) else len(text)]
        metadata = re.search(r"^\*\*Source:\*\* (.+?) · \*\*Published:\*\* (\d{4}-\d{2}-\d{2})\s*$", section, re.M)
        if not metadata or not is_fresh_published(metadata.group(2), now):
            reject("missing-or-stale-source-attribution", heading.group(2))
        links = re.findall(r"\[Read the source\]\(([^)]+)\)", section)
        if len(links) != 1 or len(heading.group(2).strip()) < 6:
            reject("incomplete-story-section", heading.group(2))
        cited.extend(links)
    if not all(isinstance(url, str) for url in urls) or sorted(cited) != sorted(urls):
        reject("source-links-mismatch", "Story links must match the queued sources exactly")
    for url in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
        if not valid_source_url(url):
            reject("unsafe-link", url)

    errors = sum(flag["severity"] == "error" for flag in flags)
    warnings = sum(flag["severity"] == "warning" for flag in flags)
    result.update({
        "pass": not flags,
        "score": max(0, 100 - 25 * errors - 5 * warnings),
        "summary": "PASS" if not flags else f"HOLD ({errors} error(s), {warnings} warning(s))",
    })
    return result


if __name__ == "__main__":
    import json
    import sys

    sample = sys.stdin.read() if not sys.argv[1:] else open(sys.argv[1]).read()
    print(json.dumps(check_text(sample), indent=2))
