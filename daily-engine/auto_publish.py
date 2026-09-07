#!/usr/bin/env python3
"""Stage checked Daily posts; acknowledge publication only after live verification."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

from compliance import check_publishable

ROOT = Path(__file__).resolve().parent.parent
DAILY_KAVA_JS = ROOT / "daily-kava.js"
QUEUE_PATH = ROOT / "daily-engine/state/queue.json"
DRAFTS_DIR = ROOT / "daily-engine/drafts"
CATALOG_END = "\n];\n\nfunction getDailyKavaPost"
PRODUCTION_ORIGIN = "https://www.thetribalkavalounge.com"


def sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def save_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n")
    temporary.replace(path)


def load_queue() -> dict:
    return json.loads(QUEUE_PATH.read_text()) if QUEUE_PATH.exists() else {"items": []}


def draft_path(relative: str) -> Path:
    if not isinstance(relative, str) or not relative.startswith("drafts/"):
        raise ValueError("Draft must be a queue path within drafts/.")
    path = ROOT / "daily-engine" / relative
    if path.is_symlink() or not path.resolve().is_relative_to(DRAFTS_DIR.resolve()):
        raise ValueError("Draft path escapes drafts/.")
    if not re.fullmatch(r"digest-\d{4}-\d{2}-\d{2}(?:-\d+)?\.md", path.name):
        raise ValueError("Unsupported Daily draft filename.")
    return path


def read_catalog() -> list[dict]:
    # The repository catalogue is code owned by this project. Feed data is never
    # executed: new entries are serialized JSON with an escaped HTML body.
    program = (
        "const fs=require('node:fs'),vm=require('node:vm');"
        "const code=fs.readFileSync(process.argv[1],'utf8');"
        "const posts=vm.runInNewContext(code+';dailyKavaPosts',{}, {timeout:1000});"
        "if(!Array.isArray(posts))throw Error('Invalid catalogue');"
        "process.stdout.write(JSON.stringify(posts));"
    )
    result = subprocess.run(
        ["node", "-e", program, str(DAILY_KAVA_JS)],
        check=True, capture_output=True, text=True, timeout=5,
    )
    return json.loads(result.stdout)


def markdown_to_html(markdown: str) -> str:
    """Render the small, known digest format without accepting source HTML."""
    def inline(value: str) -> str:
        parts = []
        cursor = 0
        for match in re.finditer(r"\[([^\]\n]+)\]\((https?://[^\s)]+)\)", value):
            parts.append(html.escape(value[cursor:match.start()]))
            label, url = match.groups()
            parsed = urllib.parse.urlsplit(url)
            if parsed.scheme not in {"http", "https"} or not parsed.netloc:
                raise ValueError("Invalid source link.")
            parts.append('<a href="' + html.escape(url, quote=True) + '" rel="noopener noreferrer">' + html.escape(label) + '</a>')
            cursor = match.end()
        parts.append(html.escape(value[cursor:]))
        value = "".join(parts)
        value = re.sub(r"\*\*([^*\n]+)\*\*", r"<strong>\1</strong>", value)
        return re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", value)

    result = []
    paragraph = []

    def flush():
        if paragraph:
            result.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    for line in markdown.splitlines():
        stripped = line.strip()
        heading = re.match(r"^(#{1,3}) (.+)$", stripped)
        if not stripped or heading or stripped == "---":
            flush()
            if heading:
                # The page already provides the H1 title.
                if len(heading[1]) > 1:
                    level = len(heading[1])
                    result.append(f"<h{level}>" + inline(heading[2]) + f"</h{level}>")
            elif stripped == "---":
                result.append("<hr>")
        else:
            paragraph.append(stripped)
    flush()
    return "\n".join(result)


def create_post(path: Path, markdown: str, source_urls: list[str]) -> dict:
    title = re.search(r"^# (.+)$", markdown, re.M)[1]
    day = re.search(r"\d{4}-\d{2}-\d{2}", title)[0]
    description = "A linked reading list on kava culture, flavor, community, and alcohol-free social life from Tribal Kava Lounge in West Palm Beach."
    return {
        "slug": path.stem.replace("digest-", "daily-digest-", 1),
        "title": title,
        "seoTitle": f"Daily Kava Reading List — {day}",
        "metaDescription": description,
        "dek": description,
        "date": day,
        "modified": day,
        "category": "Community",
        "readMin": max(1, round(len(markdown.split()) / 200)),
        "tags": ["kava culture", "community", "alcohol-free social life"],
        "keywords": ["kava culture", "Tribal Kava Lounge", "West Palm Beach"],
        "body": markdown_to_html(markdown),
        "sourceUrls": source_urls,
        "contentSha256": sha256(markdown.encode()),
    }


def hold(item: dict, reason: str, now: str) -> None:
    item["status"] = "held"
    item["held_at"] = now
    item["hold_reason"] = reason


def stage(manifest_path: Path, selected_file: str | None = None) -> dict:
    queue = load_queue()
    files = [item.get("file") for item in queue.get("items", [])]
    if len(files) != len(set(files)):
        raise ValueError("Duplicate draft records in queue; resolve before publishing.")
    catalogue = DAILY_KAVA_JS.read_text()
    if catalogue.count(CATALOG_END) != 1:
        raise ValueError("Catalogue insertion point must be unique.")
    posts = read_catalog()
    # A previous attempt may have committed staged content before deployment.
    # Rebuild those pending entries from current checked bytes so a subsequently
    # held/edited/expired draft cannot hitchhike on another post's deployment.
    restage_files = set()
    for item in queue.get("items", []):
        if item.get("published_at") or item.get("status") == "published":
            continue
        relative = item.get("file", "")
        if not isinstance(relative, str) or not re.fullmatch(r"drafts/digest-\d{4}-\d{2}-\d{2}(?:-\d+)?\.md", relative):
            continue
        pending_slug = Path(relative).stem.replace("digest-", "daily-digest-", 1)
        # Match by deterministic file identity too: a crash may replace the
        # catalogue before staged_sha256 reaches the queue.
        matching = [post for post in posts if post.get("slug") == pending_slug and post.get("contentSha256")]
        for post in matching:
            encoded = "  " + json.dumps(post, ensure_ascii=True, indent=2)
            if catalogue.count(",\n" + encoded) == 1:
                catalogue = catalogue.replace(",\n" + encoded, "", 1)
            elif catalogue.count("[\n" + encoded) == 1:
                catalogue = catalogue.replace("[\n" + encoded + ",\n", "[\n", 1) if "[\n" + encoded + ",\n" in catalogue else catalogue.replace("[\n" + encoded, "[", 1)
            else:
                raise ValueError("Pending catalogue entry changed outside the publisher; repair before deployment.")
            posts.remove(post)
            restage_files.add(item["file"])
    by_slug = {post["slug"]: post for post in posts}
    used_urls = {url for post in posts for url in post.get("sourceUrls", [])}
    for item in queue.get("items", []):
        if item.get("status") == "published" or item.get("published_at"):
            used_urls.update(item.get("source_urls") or [])
    now = datetime.now(timezone.utc).isoformat()
    manifest = {"posts": [], "held": [], "catalog_sha256": None}
    selected_found = selected_file is None
    additions = []
    for item in queue.get("items", []):
        if selected_file and item.get("file") != selected_file and item.get("file") not in restage_files:
            continue
        selected_found = selected_found or item.get("file") == selected_file
        if item.get("published_at") or item.get("status") == "published":
            continue
        try:
            path = draft_path(item.get("file"))
            markdown = path.read_bytes().decode("utf-8")
            source_urls = item.get("source_urls") or []
            result = check_publishable(markdown, source_urls)
            item["compliance"] = result
            item["checked_at"] = now
            item["checked_sha256"] = sha256(markdown.encode())
            if not result["pass"] or result.get("flags"):
                raise ValueError(result["summary"] + ": " + ", ".join(flag["rule"] for flag in result.get("flags", [])))
            post = create_post(path, markdown, source_urls)
            existing = by_slug.get(post["slug"])
            if existing and existing.get("contentSha256") != post["contentSha256"]:
                raise ValueError("Slug already exists with different or unverified content.")
            if not existing and used_urls.intersection(source_urls):
                raise ValueError("Source already appears in a published or staged post.")
            if not existing:
                additions.append(post)
                by_slug[post["slug"]] = post
                used_urls.update(source_urls)
            item["status"] = "staged"
            item["staged_at"] = now
            item["staged_sha256"] = post["contentSha256"]
            item.pop("hold_reason", None)
            item.pop("held_at", None)
            manifest["posts"].append({"file": item["file"], "slug": post["slug"], "content_sha256": post["contentSha256"]})
        except (ValueError, OSError, TypeError) as error:
            hold(item, str(error), now)
            manifest["held"].append({"file": item.get("file"), "reason": str(error)})
    if not selected_found:
        raise ValueError("Requested draft is not in the queue.")
    if additions:
        serialized = (",\n" if posts else "\n") + ",\n".join("  " + json.dumps(post, ensure_ascii=True, indent=2) for post in additions)
        catalogue = catalogue.replace(CATALOG_END, serialized + CATALOG_END, 1)
    catalogue_changed = catalogue != DAILY_KAVA_JS.read_text()
    if catalogue_changed:
        # Validate the complete generated JS before replacing the live source file.
        subprocess.run(["node", "--check"], input=catalogue, text=True, check=True, capture_output=True, timeout=5)
        DAILY_KAVA_JS.write_text(catalogue)
    manifest["catalog_sha256"] = sha256(DAILY_KAVA_JS.read_bytes())
    manifest["requires_deploy"] = bool(manifest["posts"]) or catalogue_changed
    save_json(QUEUE_PATH, queue)
    save_json(manifest_path, manifest)
    print(f"Staged: {len(manifest['posts'])}. Held: {len(manifest['held'])}.")
    return manifest


def verify_live(manifest_path: Path, origin: str = PRODUCTION_ORIGIN) -> None:
    if origin.rstrip("/") != PRODUCTION_ORIGIN:
        raise ValueError("Live verification must target the Tribal production site.")
    manifest = json.loads(manifest_path.read_text())
    expected = manifest["catalog_sha256"]
    if sha256(DAILY_KAVA_JS.read_bytes()) != expected:
        raise ValueError("Local catalogue changed after staging.")
    request = urllib.request.Request(
        origin.rstrip("/") + "/daily-kava.js?version=" + expected,
        headers={"Cache-Control": "no-cache", "User-Agent": "TribalDailyKavaDeploy/1.0"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        if sha256(response.read()) != expected:
            raise ValueError("Production has not served the staged catalogue yet.")
    manifest["verified_catalog_sha256"] = expected
    manifest["verified_at"] = datetime.now(timezone.utc).isoformat()
    save_json(manifest_path, manifest)
    print("Production catalogue matches the staged content.")


def finalize(manifest_path: Path) -> None:
    manifest = json.loads(manifest_path.read_text())
    expected = manifest["catalog_sha256"]
    if manifest.get("verified_catalog_sha256") != expected or not manifest.get("verified_at"):
        raise ValueError("Live verification is required before marking posts published.")
    if sha256(DAILY_KAVA_JS.read_bytes()) != expected:
        raise ValueError("Catalogue changed after live verification.")
    queue = load_queue()
    items = {item["file"]: item for item in queue.get("items", [])}
    # Validate every item before mutating any status.
    for post in manifest["posts"]:
        item = items.get(post["file"])
        if not item or item.get("staged_sha256") != post["content_sha256"]:
            raise ValueError("Queue no longer matches the staged draft.")
        if sha256(draft_path(post["file"]).read_bytes()) != post["content_sha256"]:
            raise ValueError("Draft changed after staging; publication cannot be acknowledged.")
    for post in manifest["posts"]:
        item = items[post["file"]]
        item["status"] = "published"
        item["published_at"] = manifest["verified_at"]
        item["published_sha256"] = post["content_sha256"]
        item["published_url"] = PRODUCTION_ORIGIN + "/the-daily-kava/" + post["slug"]
    save_json(QUEUE_PATH, queue)
    print(f"Confirmed published: {len(manifest['posts'])}.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["stage", "verify-live", "finalize"])
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--file", help="One queue path, e.g. drafts/digest-2026-09-07.md")
    parser.add_argument("--origin", default=PRODUCTION_ORIGIN)
    args = parser.parse_args()
    if args.command == "stage":
        stage(args.manifest, args.file)
    elif args.command == "verify-live":
        verify_live(args.manifest, args.origin)
    else:
        finalize(args.manifest)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
