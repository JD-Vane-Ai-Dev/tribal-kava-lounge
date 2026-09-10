"""Read curated public sources completely; returned text is untrusted evidence.

Only repository-authored source URLs belong here. Never pass URLs proposed by a
model. This module does not execute page content or treat it as instructions.
"""

import hashlib
import http.client
import ipaddress
import re
import socket
import ssl
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser


MAX_SOURCES = 6
MAX_SOURCE_BYTES = 150_000
MIN_SOURCE_WORDS = 100
TIMEOUT_SECONDS = 25


class SourceResearchError(ValueError):
    """A source cannot safely supply complete evidence; never includes a payload."""


def _public_addresses(hostname):
    try:
        addresses = tuple(dict.fromkeys(
            item[4][0] for item in socket.getaddrinfo(
                hostname, 443, type=socket.SOCK_STREAM
            )
        ))
        parsed_addresses = [ipaddress.ip_address(value) for value in addresses]
        if not addresses or any(not address.is_global or address.is_multicast
                                or address.is_reserved for address in parsed_addresses):
            raise ValueError()
        return addresses
    except (OSError, ValueError):
        raise SourceResearchError("Source destination must resolve only to public addresses.") from None


def validate_source_url(url):
    """Validate each URL before a request or redirect; return its ASCII host."""
    try:
        if not isinstance(url, str) or len(url) > 2048 or any(
            ord(character) <= 32 or ord(character) == 127 for character in url
        ):
            raise ValueError()
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username is not None
                or parsed.password is not None or parsed.port not in (None, 443)
                or parsed.fragment or "\\" in url):
            raise ValueError()
        hostname = parsed.hostname.encode("idna").decode("ascii").lower()
        if (hostname.endswith(".") or hostname in {"localhost", "metadata.google.internal"}
                or hostname.endswith((".localhost", ".local", ".internal", ".test", ".invalid"))):
            raise ValueError()
        # Search/RSS endpoints provide discovery material, not a full source.
        path = urllib.parse.unquote(parsed.path).lower()
        query_keys = {key.lower() for key in urllib.parse.parse_qs(parsed.query)}
        if (re.search(r"(?:^|/)(?:search|rss|feed|feeds)(?:[/.]|$)", path)
                or path.endswith((".rss", ".atom"))
                or query_keys.intersection({"q", "query", "search"})
                or hostname in {"news.google.com", "google.com", "www.google.com",
                                "bing.com", "www.bing.com", "duckduckgo.com"}):
            raise ValueError()
    except (ValueError, UnicodeError):
        raise SourceResearchError("Source URL must be a direct public HTTPS article URL.") from None
    _public_addresses(hostname)
    return hostname


class _PublicHTTPSConnection(http.client.HTTPSConnection):
    """Connect to a validated IP while verifying TLS for the requested hostname."""

    def connect(self):
        if self._tunnel_host:
            raise SourceResearchError("Source proxies are not supported.")
        addresses = _public_addresses(self.host)
        for address in addresses:
            connection = None
            try:
                connection = socket.create_connection((address, self.port), self.timeout,
                                                      self.source_address)
                self.sock = self._context.wrap_socket(connection, server_hostname=self.host)
                return
            except OSError:
                if connection is not None:
                    connection.close()
        raise SourceResearchError("Source HTTPS connection failed.")


class _PublicHTTPSHandler(urllib.request.HTTPSHandler):
    def https_open(self, request):
        return self.do_open(_PublicHTTPSConnection, request, context=self._context)


class SameHostRedirectHandler(urllib.request.HTTPRedirectHandler):
    def __init__(self, hostname):
        super().__init__()
        self.hostname = hostname

    def redirect_request(self, request, fp, code, message, headers, newurl):
        hostname = validate_source_url(newurl)
        if hostname != self.hostname:
            raise SourceResearchError("Source redirects must stay on the same hostname.")
        return super().redirect_request(request, fp, code, message, headers, newurl)


class _PageText(HTMLParser):
    EXCLUDED = {"script", "style", "nav", "footer", "header", "noscript", "svg",
                "canvas", "template", "iframe", "form"}
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
            "meta", "param", "source", "track", "wbr"}
    BLOCKS = {"p", "div", "section", "article", "main", "li", "h1", "h2", "h3",
              "h4", "h5", "h6", "blockquote", "tr", "br"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.all_text = []
        self.main_text = []
        self.article_text = []
        self.title_text = []

    def _add(self, text):
        if any(entry[1] for entry in self.stack):
            return
        tags = {entry[0] for entry in self.stack}
        if "title" in tags:
            self.title_text.append(text)
            return
        if "head" in tags:
            return
        self.all_text.append(text)
        if "main" in tags:
            self.main_text.append(text)
        if "article" in tags:
            self.article_text.append(text)

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        excluded = (tag in self.EXCLUDED or "hidden" in attributes
                    or attributes.get("aria-hidden", "").lower() == "true")
        if tag not in self.VOID:
            self.stack.append((tag, excluded))
        if tag in self.BLOCKS:
            self._add("\n")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in self.VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag in self.BLOCKS:
            self._add("\n")
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self._add(data)


def _normalize_text(parts):
    return "\n\n".join(
        line for line in (re.sub(r"\s+", " ", line).strip()
                          for line in "".join(parts).splitlines()) if line
    )


def extract_source_text(payload, content_type):
    """Return (title, complete text); reject unsupported, short, or oversized pages."""
    if not isinstance(payload, bytes) or len(payload) > MAX_SOURCE_BYTES:
        raise SourceResearchError("Source exceeds the complete-page size limit.")
    media_type = content_type.split(";", 1)[0].strip().lower()
    if media_type not in {"text/html", "application/xhtml+xml", "text/plain"}:
        raise SourceResearchError("Source must be a complete HTML or plain-text page.")
    charset = re.search(r"charset\s*=\s*[\"']?([\w.-]+)", content_type, re.I)
    try:
        decoded = payload.decode(charset.group(1) if charset else "utf-8")
    except (UnicodeError, LookupError):
        raise SourceResearchError("Source text encoding could not be read completely.") from None
    if re.search(r"<(?:rss|feed)(?:\s|>)", decoded[:1000], re.I):
        raise SourceResearchError("Source feeds cannot substitute for full articles.")
    if media_type == "text/plain":
        text = _normalize_text([decoded])
        title = text.splitlines()[0] if text else ""
    else:
        parser = _PageText()
        try:
            parser.feed(decoded)
            parser.close()
        except Exception:
            raise SourceResearchError("Source HTML could not be read completely.") from None
        text = _normalize_text(parser.main_text or parser.article_text or parser.all_text)
        title = re.sub(r"\s+", " ", "".join(parser.title_text)).strip()
    if len(text.encode("utf-8")) > MAX_SOURCE_BYTES:
        raise SourceResearchError("Source exceeds the complete-text size limit.")
    if len(text.split()) < MIN_SOURCE_WORDS:
        raise SourceResearchError("Source has fewer than 100 readable words; full evidence is required.")
    if not title or len(title) > 500:
        raise SourceResearchError("Source must have a usable page title.")
    return title, text


def fetch_sources(sources):
    """Fetch every curated source or fail; never return partial or truncated evidence."""
    if not isinstance(sources, list) or not 1 <= len(sources) <= MAX_SOURCES:
        raise SourceResearchError("A research packet requires between one and six sources.")
    evidence = []
    used = set()
    for source in sources:
        if (not isinstance(source, dict) or not isinstance(source.get("supports"), str)
                or not source["supports"].strip() or len(source["supports"]) > 2000):
            raise SourceResearchError("Each curated source needs a concise support description.")
        url = source.get("url")
        hostname = validate_source_url(url)
        if url in used:
            raise SourceResearchError("Research source URLs must be distinct.")
        used.add(url)
        opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}), _PublicHTTPSHandler(context=ssl.create_default_context()),
            SameHostRedirectHandler(hostname),
        )
        request = urllib.request.Request(url, headers={
            "User-Agent": "TribalKavaEditorial/1.0 (+https://www.thetribalkavalounge.com)",
            "Accept": "text/html, application/xhtml+xml, text/plain",
            "Accept-Encoding": "identity",
        })
        try:
            with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
                if validate_source_url(response.geturl()) != hostname:
                    raise SourceResearchError("Source redirects must stay on the same hostname.")
                length = response.headers.get("Content-Length")
                expected_length = None
                if length is not None:
                    if not re.fullmatch(r"[0-9]+", length.strip()):
                        raise SourceResearchError("Source has an invalid content length.")
                    expected_length = int(length)
                    if expected_length > MAX_SOURCE_BYTES:
                        raise SourceResearchError("Source exceeds the complete-page size limit.")
                if response.headers.get("Content-Encoding", "identity").lower() != "identity":
                    raise SourceResearchError("Source must provide an uncompressed complete page.")
                payload = response.read(MAX_SOURCE_BYTES + 1)
                if expected_length is not None and len(payload) != expected_length:
                    raise SourceResearchError("Source body does not match its declared content length.")
                title, text = extract_source_text(payload, response.headers.get("Content-Type", ""))
        except SourceResearchError:
            raise
        except Exception:
            raise SourceResearchError("Source could not be fetched completely.") from None
        evidence.append({
            "url": url,
            "title": title,
            "verifiedAt": datetime.now(timezone.utc).isoformat(),
            "supports": source["supports"].strip(),
            "text": text,
            "sha256": hashlib.sha256(text.encode("utf-8")).hexdigest(),
        })
    return evidence
