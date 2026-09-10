"""Offline research boundaries: complete text and only public curated HTTPS URLs."""

import hashlib
import io
import socket
import unittest
import urllib.request
from email.message import Message
from unittest.mock import patch

import writer_research as research


PUBLIC_DNS = [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", 443))]
WORDS = " ".join(f"word{number}" for number in range(120))
PAGE = f"<html><head><title>A complete source</title></head><body><main><p>{WORDS}</p></main></body></html>".encode()


class ExtractionTests(unittest.TestCase):
    def test_full_main_text_excludes_chrome_and_preserves_inline_words(self):
        payload = f"""<title>Tea &amp; culture</title><header>HEADER</header>
            <article>OUTSIDE ARTICLE</article><main><h1>Read <em>this</em> page</h1>
            <nav>MENU</nav><p>{WORDS}</p><script>INSTRUCTIONS</script>
            <div hidden>HIDDEN</div><footer>FOOTER</footer><p>Final paragraph.</p></main>""".encode()
        title, text = research.extract_source_text(payload, "text/html; charset=utf-8")
        self.assertEqual(title, "Tea & culture")
        self.assertIn("Read this page", text)
        self.assertIn(WORDS, text)
        self.assertTrue(text.endswith("Final paragraph."))
        for excluded in ("HEADER", "OUTSIDE ARTICLE", "MENU", "INSTRUCTIONS", "HIDDEN", "FOOTER"):
            self.assertNotIn(excluded, text)

    def test_article_then_page_fallback(self):
        for markup in (f"<article>{WORDS}</article>", f"<body><p>{WORDS}</p></body>"):
            self.assertEqual(research.extract_source_text(
                f"<title>Source</title>{markup}".encode(), "text/html"
            )[1], WORDS)

    def test_oversize_short_feed_and_nontext_are_rejected(self):
        for payload, kind in (
            (b"x" * (research.MAX_SOURCE_BYTES + 1), "text/plain"),
            (b"<title>Short</title><main>Only a snippet</main>", "text/html"),
            (f"<rss><title>Feed</title>{WORDS}</rss>".encode(), "text/html"),
            (PAGE, "application/pdf"),
        ):
            with self.subTest(kind=kind, size=len(payload)), self.assertRaises(research.SourceResearchError):
                research.extract_source_text(payload, kind)


class DestinationTests(unittest.TestCase):
    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_public_https_article_only(self, resolver):
        self.assertEqual(research.validate_source_url("https://example.org/culture"), "example.org")
        for url in ("http://example.org/culture", "https://user:secret@example.org/culture",
                    "https://example.org:8443/culture", "https://example.org/rss.xml",
                    "https://example.org/search?q=kava", "https://news.google.com/articles/x",
                    "https://localhost/culture", "https://example.org/culture#section"):
            with self.subTest(url=url), self.assertRaises(research.SourceResearchError):
                research.validate_source_url(url)

    def test_private_or_mixed_dns_destinations_are_rejected(self):
        for address in ("127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "fc00::1", "0.0.0.0", "224.0.0.1"):
            records = PUBLIC_DNS + [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (address, 443))]
            with self.subTest(address=address), patch.object(research.socket, "getaddrinfo", return_value=records):
                with self.assertRaises(research.SourceResearchError):
                    research.validate_source_url("https://example.org/article")

    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_tls_connection_uses_validated_ip_and_original_hostname(self, resolver):
        with patch.object(research.socket, "create_connection") as connect, \
                patch.object(research.ssl.SSLContext, "wrap_socket") as wrap:
            connection = research._PublicHTTPSConnection("example.org", timeout=25)
            connection.connect()
        self.assertEqual(connect.call_args.args[0], ("93.184.216.34", 443))
        self.assertEqual(wrap.call_args.kwargs["server_hostname"], "example.org")

    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_redirect_must_remain_https_same_host_direct_page(self, resolver):
        handler = research.SameHostRedirectHandler("example.org")
        request = urllib.request.Request("https://example.org/old")
        redirected = handler.redirect_request(request, None, 302, "Found", {}, "https://example.org/new")
        self.assertEqual(redirected.full_url, "https://example.org/new")
        for url in ("https://other.example.org/new", "http://example.org/new", "https://example.org/search"):
            with self.subTest(url=url), self.assertRaises(research.SourceResearchError):
                handler.redirect_request(request, None, 302, "Found", {}, url)


class FetchTests(unittest.TestCase):
    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_complete_evidence_contract_and_hash(self, resolver):
        response = io.BytesIO(PAGE)
        response.geturl = lambda: "https://example.org/article"
        response.headers = Message()
        response.headers["Content-Type"] = "text/html; charset=utf-8"
        response.headers["Content-Length"] = str(len(PAGE))
        with patch.object(research.urllib.request.OpenerDirector, "open", return_value=response) as opened:
            packet = research.fetch_sources([{"url": response.geturl(), "supports": "  Full article context.  "}])
        self.assertEqual(len(packet), 1)
        self.assertEqual(packet[0]["text"], WORDS)
        self.assertEqual(packet[0]["sha256"], hashlib.sha256(WORDS.encode()).hexdigest())
        self.assertEqual(packet[0]["supports"], "Full article context.")
        self.assertEqual(opened.call_args.kwargs["timeout"], 25)
        self.assertEqual(set(packet[0]), {"url", "title", "verifiedAt", "supports", "text", "sha256"})

    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_fetch_failure_does_not_expose_remote_payload(self, resolver):
        with patch.object(research.urllib.request.OpenerDirector, "open", side_effect=RuntimeError("SECRET RESPONSE")):
            with self.assertRaises(research.SourceResearchError) as raised:
                research.fetch_sources([{"url": "https://example.org/article", "supports": "Context"}])
        self.assertNotIn("SECRET RESPONSE", str(raised.exception))

    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_fetch_rejects_oversize_body_without_length_header(self, resolver):
        response = io.BytesIO(PAGE + b" " * research.MAX_SOURCE_BYTES)
        response.geturl = lambda: "https://example.org/article"
        response.headers = Message()
        response.headers["Content-Type"] = "text/html"
        with patch.object(research.urllib.request.OpenerDirector, "open", return_value=response):
            with self.assertRaisesRegex(research.SourceResearchError, "size limit"):
                research.fetch_sources([{"url": response.geturl(), "supports": "Context"}])

    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_fetch_rejects_content_length_mismatch_even_with_enough_readable_words(self, resolver):
        self.assertGreater(len(WORDS.split()), research.MIN_SOURCE_WORDS)
        for declared_length in (len(PAGE) + 100, len(PAGE) - 100):
            response = io.BytesIO(PAGE)
            response.geturl = lambda: "https://example.org/article"
            response.headers = Message()
            response.headers["Content-Type"] = "text/html"
            response.headers["Content-Length"] = str(declared_length)
            with self.subTest(declared_length=declared_length), \
                    patch.object(research.urllib.request.OpenerDirector, "open", return_value=response):
                with self.assertRaisesRegex(research.SourceResearchError, "declared content length"):
                    research.fetch_sources([{"url": response.geturl(), "supports": "Context"}])

    @patch.object(research.socket, "getaddrinfo", return_value=PUBLIC_DNS)
    def test_fetch_rejects_negative_and_invalid_content_lengths(self, resolver):
        for declared_length in ("-1", "+42", "1.2", "unknown", ""):
            response = io.BytesIO(PAGE)
            response.geturl = lambda: "https://example.org/article"
            response.headers = Message()
            response.headers["Content-Type"] = "text/html"
            response.headers["Content-Length"] = declared_length
            with self.subTest(declared_length=declared_length), \
                    patch.object(research.urllib.request.OpenerDirector, "open", return_value=response):
                with self.assertRaisesRegex(research.SourceResearchError, "invalid content length"):
                    research.fetch_sources([{"url": response.geturl(), "supports": "Context"}])

    def test_source_count_is_bounded(self):
        for sources in ([], [{}] * 7):
            with self.assertRaises(research.SourceResearchError):
                research.fetch_sources(sources)


if __name__ == "__main__":
    unittest.main()
