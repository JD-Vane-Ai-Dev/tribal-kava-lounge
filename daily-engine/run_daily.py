#!/usr/bin/env python3
"""
The Daily Kava — fetch → dedupe → draft → compliance check → queue.

Usage:
  python3 run_daily.py fetch|draft|check|status|approve|run [--llm] [--file PATH]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import html
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

from compliance import (check_candidate, check_publishable, published_datetime,
                        TRUSTED_RESPONSIBLE_USE_FOOTER)

# Daily editorial policy: culture, flavor, community, lounge life, and
# non-alcoholic social culture. Flagged stories remain held for review.

ROOT = Path(__file__).resolve().parent
STATE_DIR = ROOT / "state"
DRAFTS_DIR = ROOT / "drafts"
SOURCES = ROOT / "sources.json"
SEEN_PATH = STATE_DIR / "seen_urls.json"
QUEUE_PATH = STATE_DIR / "queue.json"
CANDIDATES_PATH = STATE_DIR / "candidates.json"

UA = "TribalDailyKavaBot/1.0 (+https://www.thetribalkavalounge.com; educational lounge content)"


def _ensure_dirs() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    DRAFTS_DIR.mkdir(parents=True, exist_ok=True)
    (ROOT / "logs").mkdir(parents=True, exist_ok=True)
    if not SEEN_PATH.exists():
        SEEN_PATH.write_text(json.dumps({"urls": {}}, indent=2))
    if not QUEUE_PATH.exists():
        QUEUE_PATH.write_text(json.dumps({"items": []}, indent=2))


def _load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text())


def _save_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def _fetch_url(url: str, timeout: int = 25) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/rss+xml, application/xml, text/xml, */*"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def google_news_rss_url(query: str) -> str:
    q = urllib.parse.quote_plus(query)
    return f"https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"


def parse_rss(xml_bytes: bytes) -> list[dict]:
    items = []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return items

    # RSS 2.0
    for item in root.findall(".//item"):
        title = html.unescape((item.findtext("title") or "").strip())
        link = (item.findtext("link") or "").strip()
        pub = (item.findtext("pubDate") or "").strip()
        source_el = item.find("source")
        source = (source_el.text or "").strip() if source_el is not None else ""
        desc = (item.findtext("description") or "").strip()
        # strip html tags lightly
        desc = html.unescape(re.sub(r"<[^>]+>", "", desc))
        if not title or not link:
            continue
        published = None
        if pub:
            try:
                published = parsedate_to_datetime(pub).astimezone(timezone.utc).isoformat()
            except Exception:
                published = pub
        items.append(
            {
                "title": title,
                "url": link,
                "published": published,
                "source": source,
                "summary": desc[:400],
            }
        )

    # Atom
    if not items:
        ns = {"a": "http://www.w3.org/2005/Atom"}
        for entry in root.findall("a:entry", ns):
            title = (entry.findtext("a:title", default="", namespaces=ns) or "").strip()
            link_el = entry.find("a:link", ns)
            link = link_el.get("href") if link_el is not None else ""
            if title and link:
                items.append({"title": title, "url": link, "published": None, "source": "", "summary": ""})

    return items


def cmd_fetch() -> int:
    _ensure_dirs()
    sources = _load_json(SOURCES, {"feeds": []})
    seen = _load_json(SEEN_PATH, {"urls": {}})
    candidates = []
    new_count = 0

    for feed in sources.get("feeds", []):
        fid = feed.get("id", "feed")
        category = feed.get("category", "general")
        if feed.get("type") == "google_news":
            url = google_news_rss_url(feed["query"])
        else:
            url = feed.get("url")
        if not url:
            continue
        try:
            raw = _fetch_url(url)
            entries = parse_rss(raw)
        except Exception as e:
            print(f"[warn] {fid}: {e}", file=sys.stderr)
            continue

        keywords = [k.lower() for k in feed.get("filter_keywords") or []]
        for entry in entries[:15]:
            if keywords:
                blob = f"{entry['title']} {entry.get('summary','')}".lower()
                if not any(k in blob for k in keywords):
                    continue
            editorial = check_candidate(entry, category=category, require_fresh=True)
            if not editorial["pass"]:
                print(f"[skip] {fid}: {editorial['summary']} — {entry['title'][:90]}")
                continue
            url_key = entry["url"]
            url_hash = hashlib.sha256(url_key.encode()).hexdigest()[:16]
            if url_key in seen["urls"] or url_hash in seen["urls"]:
                continue
            seen["urls"][url_key] = {
                "hash": url_hash,
                "seen_at": datetime.now(timezone.utc).isoformat(),
                "feed": fid,
                "title": entry["title"],
            }
            candidates.append({**entry, "feed": fid, "category": category, "hash": url_hash})
            new_count += 1

    # Keep last run candidates for drafting
    prev = _load_json(CANDIDATES_PATH, {"items": []})
    # Merge unique by url
    by_url = {c["url"]: c for c in prev.get("items", [])}
    for c in candidates:
        by_url[c["url"]] = c
    merged = list(by_url.values())
    # Prefer newest first — no reliable date always
    _save_json(CANDIDATES_PATH, {"updated_at": datetime.now(timezone.utc).isoformat(), "items": merged[-40:]})
    _save_json(SEEN_PATH, seen)
    print(f"Fetched. New unique URLs: {new_count}. Candidate pool: {len(merged[-40:])}.")
    return 0


def _plain_feed_text(value: str) -> str:
    """Keep source metadata on one line and outside Markdown/HTML syntax."""
    value = re.sub(r"<[^>]*>", "", html.unescape(str(value)))
    value = re.sub(r"[\\`*#_\[\]<>]", "", value)
    return " ".join(value.split())


def _template_draft(items: list[dict], day: str) -> str:
    lines = [
        f"# The Daily Kava Digest — {day}",
        "",
        "Fresh reading on culture, community, lounge life, and non-alcoholic social life. "
        "Explore this selection of source headlines, with links to each publisher’s coverage.",
        "",
    ]
    for i, item in enumerate(items[:5], 1):
        published = published_datetime(item.get("published"))
        source = item.get("source") or urllib.parse.urlsplit(item["url"]).hostname
        lines += [
            f"## {i}. {_plain_feed_text(item['title'])}",
            "",
            f"**Source:** {_plain_feed_text(source)} · **Published:** {published.strftime('%Y-%m-%d') if published else 'Unknown'}",
            "",
            f"[Read the source]({item['url']})",
            "",
        ]
    lines += [
        "---", "",
        "Continue the conversation at Tribal. "
        "[Explore the menu](https://www.thetribalkavalounge.com/menu) · "
        "[New here?](https://www.thetribalkavalounge.com/new-here) · "
        "[Plan a visit](https://www.thetribalkavalounge.com/visit)",
        "",
        TRUSTED_RESPONSIBLE_USE_FOOTER,
        "",
        "*Tribal Kava Lounge — 770 S Military Trail, Unit A1, West Palm Beach, FL 33415 · (561) 355-0561*",
        "",
    ]
    return "\n".join(lines)


def cmd_draft(use_llm: bool = False) -> int:
    _ensure_dirs()
    if use_llm:
        print("[info] --llm is retired; using the attributed headline roundup.")
    pool = _load_json(CANDIDATES_PATH, {"items": []}).get("items", [])
    # Re-screen old persisted candidates using today's dates and editorial rules.
    pool = [c for c in pool if check_candidate(c, category=c.get("category", ""), require_fresh=True)["pass"]]
    queue = _load_json(QUEUE_PATH, {"items": []})
    used = {u for item in queue.get("items", []) for u in item.get("source_urls", [])}
    eligible = {c["url"]: c for c in pool if c["url"] not in used}
    fresh = sorted(eligible.values(), key=lambda c: published_datetime(c["published"]), reverse=True)[:5]
    if not fresh:
        print("No fresh, eligible, unused sources. Nothing to draft.")
        return 0

    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    md = _template_draft(fresh, day)
    slug = f"digest-{day}"
    out = DRAFTS_DIR / f"{slug}.md"
    n = 2
    while out.exists():
        # A retry after writing a draft but before saving its queue must recover
        # that same file instead of creating another copy of today's content.
        if out.read_text() == md:
            break
        out = DRAFTS_DIR / f"{slug}-{n}.md"
        n += 1
    out.write_text(md)
    queue.setdefault("items", []).append({
        "file": str(out.relative_to(ROOT)),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "drafted",
        "source_urls": [c["url"] for c in fresh],
        "source_published": {c["url"]: c["published"] for c in fresh},
        "content_sha256": hashlib.sha256(md.encode()).hexdigest(),
        "compliance": None,
    })
    _save_json(QUEUE_PATH, queue)
    print(f"Draft written: {out}")
    return 0


def _resolve_draft(file: str) -> Path:
    path = Path(file)
    if not path.is_absolute() and not path.exists():
        path = ROOT / path
    return path


def _record_check(item: dict, text: str, result: dict) -> None:
    digest = hashlib.sha256(text.encode()).hexdigest()
    old_digest = item.get("checked_sha256")
    previous = item.get("status")
    item["compliance"] = result
    item["checked_at"] = datetime.now(timezone.utc).isoformat()
    item["checked_sha256"] = digest
    item["content_sha256"] = digest
    if previous == "published" or item.get("published_at"):
        return
    if previous in {"approved", "staged"} and old_digest == digest and result["pass"]:
        return
    item["status"] = "passed" if result["pass"] else "held"
    if old_digest != digest:
        item.pop("approved_at", None)
        item.pop("approved_sha256", None)


def cmd_check(file: str | None = None) -> int:
    _ensure_dirs()
    queue = _load_json(QUEUE_PATH, {"items": []})
    targets = [_resolve_draft(file)] if file else sorted(DRAFTS_DIR.glob("*.md"))
    if not targets:
        print("No drafts to check.")
        return 0
    exit_code = 0
    for path in targets:
        if not path.exists():
            print(f"Missing draft: {path}", file=sys.stderr)
            exit_code = 2
            continue
        text = path.read_bytes().decode("utf-8")
        try:
            rel = str(path.resolve().relative_to(ROOT))
        except ValueError:
            rel = str(path)
        item = next((i for i in queue.get("items", []) if i.get("file") in {rel, str(path)}), None)
        if item is None:
            item = {"file": rel, "source_urls": []}
            queue.setdefault("items", []).append(item)
        result = check_publishable(text, item.get("source_urls", []))
        _record_check(item, text, result)
        print(f"{rel}: {result['summary']} (score {result['score']})")
        for flag in result["flags"]:
            print(f"  - [{flag['severity']}] {flag['rule']}: {flag.get('match', '')[:80]}")
        if not result["pass"]:
            exit_code = 2
    _save_json(QUEUE_PATH, queue)
    return exit_code


def cmd_status() -> int:
    _ensure_dirs()
    queue = _load_json(QUEUE_PATH, {"items": []})
    items = queue.get("items", [])
    if not items:
        print("Queue empty.")
        return 0
    for item in items[-20:]:
        print(f"{item.get('status','?'):10}  {item.get('file')}  sources={len(item.get('source_urls') or [])}")
    return 0


def cmd_approve(file: str) -> int:
    _ensure_dirs()
    queue = _load_json(QUEUE_PATH, {"items": []})
    path = _resolve_draft(file)
    if not path.exists():
        print("Draft file does not exist.")
        return 1
    try:
        rel = str(path.resolve().relative_to(ROOT))
    except ValueError:
        rel = str(path)
    item = next((i for i in queue.get("items", []) if i.get("file") in {rel, file}), None)
    if item is None:
        print("File not in queue. Run check first.")
        return 1
    if item.get("status") == "published" or item.get("published_at"):
        print(f"Already published: {rel}")
        return 0
    # An old successful check never approves changed bytes or a now-stale post.
    text = path.read_bytes().decode("utf-8")
    result = check_publishable(text, item.get("source_urls", []))
    _record_check(item, text, result)
    if not result["pass"]:
        _save_json(QUEUE_PATH, queue)
        print(f"Refusing approval: {result['summary']}. Fix the flagged draft and re-check.")
        return 1
    if item.get("status") != "staged":
        item["status"] = "approved"
    item["approved_at"] = datetime.now(timezone.utc).isoformat()
    item["approved_sha256"] = item["checked_sha256"]
    _save_json(QUEUE_PATH, queue)
    print(f"Approved exact checked content: {rel}")
    return 0


def cmd_run(use_llm: bool = False) -> int:
    rc = cmd_fetch()
    if rc != 0:
        return rc
    rc = cmd_draft(use_llm=use_llm)
    if rc != 0:
        return rc
    # Content rejection is a normal review outcome. Persist holds so the routine
    # job can continue to stage passing posts while keeping flagged drafts back.
    rc = cmd_check()
    return 0 if rc == 2 else rc


def main() -> int:
    parser = argparse.ArgumentParser(description="The Daily Kava content engine")
    parser.add_argument("command", choices=["fetch", "draft", "check", "status", "approve", "run"])
    parser.add_argument("--llm", action="store_true", help="Compatibility flag; deterministic drafting does not use an AI API")
    parser.add_argument("--file", help="Specific draft for check/approve")
    args = parser.parse_args()

    if args.command == "fetch":
        return cmd_fetch()
    if args.command == "draft":
        return cmd_draft(use_llm=args.llm)
    if args.command == "check":
        return cmd_check(file=args.file)
    if args.command == "status":
        return cmd_status()
    if args.command == "approve":
        if not args.file:
            print("--file required for approve")
            return 1
        return cmd_approve(args.file)
    if args.command == "run":
        return cmd_run(use_llm=args.llm)
    return 1


if __name__ == "__main__":
    sys.exit(main())
