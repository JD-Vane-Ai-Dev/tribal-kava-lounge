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
from html.parser import HTMLParser
from pathlib import Path

from compliance import (check_candidate, check_publishable, published_datetime,
                        publisher_source_url, MAX_SOURCE_AGE_DAYS, TRUSTED_RESPONSIBLE_USE_FOOTER, parse_article)

# Daily editorial policy: culture, flavor, community, lounge life, and
# non-alcoholic social culture. Flagged stories remain held for review.

ROOT = Path(__file__).resolve().parent
STATE_DIR = ROOT / "state"
DRAFTS_DIR = ROOT / "drafts"
SOURCES = ROOT / "sources.json"
SEEN_PATH = STATE_DIR / "seen_urls.json"
QUEUE_PATH = STATE_DIR / "queue.json"
CANDIDATES_PATH = STATE_DIR / "candidates.json"
MANUSCRIPTS_DIR = ROOT / "manuscripts"

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
    q = urllib.parse.quote_plus(f"{query} when:{MAX_SOURCE_AGE_DAYS}d")
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
        if source and title.endswith(" - " + source):
            title = title[:-(len(source) + 3)].strip()
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
                "source_url": source_el.get("url", "") if source_el is not None else "",
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


class _SourceMetadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.canonical = ""
        self.meta = {}
        self.google_params = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("data-n-a-sg") and attrs.get("data-n-a-ts"):
            self.google_params = {"signature": attrs["data-n-a-sg"], "timestamp": attrs["data-n-a-ts"]}
        if tag == "link" and "canonical" in attrs.get("rel", "").lower().split():
            self.canonical = attrs.get("href", "")
        if tag == "meta":
            key = (attrs.get("property") or attrs.get("name") or "").lower()
            self.meta[key] = attrs.get("content", "")


def _google_destination(url: str, metadata: _SourceMetadata) -> str:
    """Resolve Google's article wrapper; never use a search or guessed URL.

    The public page's Fbv4je RPC returns its original article destination.
    Protocol reference: SSujitX/google-news-url-decoder (new_decoderv3.py).
    Missing parameters, changed response formats and rate limits fail closed.
    """
    article_id = urllib.parse.urlsplit(url).path.rsplit("/", 1)[-1]
    params = metadata.google_params
    if not re.fullmatch(r"[A-Za-z0-9_-]+", article_id) or not params:
        raise ValueError("Google News destination parameters are missing")
    context = [["X", "X", ["X", "X"], None, None, 1, 1, "US:en", None, 1,
                None, None, None, None, None, 0, 1],
               "X", "X", 1, [1, 1, 1], 1, 1, None, 0, 0, None, 0]
    argument = json.dumps(["garturlreq", context, article_id, int(params["timestamp"]), params["signature"]])
    body = urllib.parse.urlencode({"f.req": json.dumps([[["Fbv4je", argument]]])}).encode()
    request = urllib.request.Request(
        "https://news.google.com/_/DotsSplashUi/data/batchexecute", data=body,
        headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        payload = response.read(1_000_000).decode("utf-8")
    for line in payload.splitlines():
        if not line.startswith("["):
            continue
        for row in json.loads(line):
            if len(row) >= 3 and row[:2] == ["wrb.fr", "Fbv4je"]:
                result = json.loads(row[2])
                if result[0] == "garturlres" and publisher_source_url(result[1]):
                    return result[1]
    raise ValueError("Google News did not return an original article URL")


def _resolve_source(entry: dict, *, resolve_google: bool = True) -> dict:
    """Use the publisher's current headline and canonical link, or reject it.

    HTTP redirects are followed normally. An unresolved Google News wrapper,
    access failure, or missing publisher metadata never becomes a made-up URL.
    """
    request = urllib.request.Request(entry["url"], headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=15) as response:
        final_url = response.geturl()
        metadata = _SourceMetadata()
        metadata.feed(response.read(2_000_000).decode("utf-8", errors="replace"))
    if urllib.parse.urlsplit(final_url).hostname == "news.google.com":
        if not resolve_google:
            raise ValueError("Publisher redirected back to the discovery wrapper")
        destination = _google_destination(final_url, metadata)
        expected = (urllib.parse.urlsplit(entry.get("source_url", "")).hostname or "").lower().removeprefix("www.")
        actual = (urllib.parse.urlsplit(destination).hostname or "").lower().removeprefix("www.")
        if not expected or expected != actual:
            raise ValueError("Google News destination does not match the named publisher")
        resolved = _resolve_source({**entry, "url": destination}, resolve_google=False)
        return {**resolved, "discovery_url": entry["url"]}
    if not publisher_source_url(final_url):
        raise ValueError("Source did not resolve to a publisher article")
    canonical = urllib.parse.urldefrag(urllib.parse.urljoin(final_url, metadata.canonical)).url
    host = lambda url: (urllib.parse.urlsplit(url).hostname or "").lower().removeprefix("www.")
    if (not metadata.canonical or not publisher_source_url(canonical)
            or host(canonical) != host(final_url)
            or (entry.get("source_url") and host(entry["source_url"]) != host(canonical))):
        raise ValueError("Missing or mismatched publisher canonical attribution")
    title = _plain_feed_text(metadata.meta.get("og:title", ""))
    if len(title) < 6:
        raise ValueError("Publisher's current headline is missing")
    return {
        **entry, "title": title, "url": canonical, "canonical_url": canonical,
        "discovery_url": entry["url"],
        "source": metadata.meta.get("og:site_name") or entry.get("source") or host(canonical),
        "published": metadata.meta.get("article:published_time") or entry.get("published"),
        "source_verified_at": datetime.now(timezone.utc).isoformat(),
    }


def _eligible_pool(items: list[dict]) -> list[dict]:
    """Prune persisted state as well as new results under the same intake gate."""
    eligible = {c["url"]: c for c in items if check_candidate(
        c, category=c.get("category", ""), require_fresh=True, require_canonical=True,
    )["pass"]}
    return sorted(eligible.values(), key=lambda c: published_datetime(c["published"]), reverse=True)[:40]


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
            try:
                entry = _resolve_source(entry)
            except Exception as error:
                print(f"[skip] {fid}: unverified-canonical-attribution — {entry['title'][:90]} ({error})")
                continue
            editorial = check_candidate(entry, category=category, require_fresh=True, require_canonical=True)
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
    merged = _eligible_pool(list(by_url.values()))
    _save_json(CANDIDATES_PATH, {"updated_at": datetime.now(timezone.utc).isoformat(), "items": merged})
    _save_json(SEEN_PATH, seen)
    print(f"Fetched. New unique URLs: {new_count}. Eligible candidate pool: {len(merged)}.")
    return 0


def _plain_feed_text(value: str) -> str:
    """Keep source metadata on one line and outside Markdown/HTML syntax."""
    value = re.sub(r"<[^>]*>", "", html.unescape(str(value)))
    value = re.sub(r"[\\`*#_\[\]<>]", "", value)
    return " ".join(value.split())


def cmd_draft(use_llm: bool = False) -> int:
    """Enqueue one researched, authored manuscript; never turn feeds into copy.

    Manuscripts are written in the editorial workflow described in EDITORIAL.md.
    Empty inventory is visible and creates no filler, duplicates or API spend.
    """
    _ensure_dirs()
    if use_llm:
        print("[info] --llm does not call an API; supply a complete original manuscript.")
    queue = _load_json(QUEUE_PATH, {"items": []})
    used = {item.get("file") for item in queue.get("items", [])}
    for source in sorted(MANUSCRIPTS_DIR.glob("*.md")):
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*\.md", source.name):
            continue
        relative = "drafts/" + source.name
        if relative in used:
            continue
        text = source.read_bytes().decode("utf-8")
        try:
            meta, _ = parse_article(text)
            urls = [entry["url"] for entry in meta.get("sources", [])]
        except (ValueError, KeyError, TypeError):
            urls = []
        target = DRAFTS_DIR / source.name
        if target.exists() and target.read_bytes() != source.read_bytes():
            raise ValueError("Existing draft differs from manuscript; reconcile before enqueueing")
        target.write_bytes(source.read_bytes())
        item = {"file": relative, "created_at": datetime.now(timezone.utc).isoformat(), "status": "drafted", "source_urls": urls}
        result = check_publishable(text, urls)
        _record_check(item, text, result)
        queue.setdefault("items", []).append(item)
        _save_json(QUEUE_PATH, queue)
        print(f"Original manuscript queued: {source.name} — {result['summary']}")
        return 0
    print("EDITORIAL INVENTORY EMPTY: add a researched original manuscript; no headline fallback.")
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
    if previous in {"published", "withdrawn"} or item.get("published_at"):
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
    if item.get("status") == "withdrawn":
        print(f"Withdrawn content cannot be approved: {rel}")
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
    parser.add_argument("--llm", action="store_true", help="Compatibility flag; original manuscripts do not use an AI API")
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
