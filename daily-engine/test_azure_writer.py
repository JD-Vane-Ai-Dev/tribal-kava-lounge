"""Offline checks for Azure request boundaries, auth isolation and fail-closed JSON."""

import http.client
import io
import json
import unittest
import urllib.error
import urllib.parse
from unittest.mock import Mock, patch

import azure_writer
from azure_writer import AzureWriter, WriterConnectionError


API_ENV = {
    "AZURE_OPENAI_ENDPOINT": "https://tribal-example.openai.azure.com/",
    "AZURE_OPENAI_DEPLOYMENT": "editorial-deployment",
    "AZURE_OPENAI_API_KEY": "fake-test-api-secret",
}
MI_ENV = {
    **API_ENV,
    "IDENTITY_ENDPOINT": "http://localhost:42356/msi/token",
    "IDENTITY_HEADER": "fake-test-identity-secret",
    "AZURE_CLIENT_ID": "00000000-1111-2222-3333-444444444444",
}


def completion(content=None, *, finish="stop", **message):
    return {
        "choices": [{"finish_reason": finish, "message": {
            "content": json.dumps({"article": "Complete draft"}) if content is None else content,
            **message,
        }}],
        "usage": {"prompt_tokens": 50, "completion_tokens": 100, "total_tokens": 150},
    }


class Response(io.BytesIO):
    def __init__(self, value):
        super().__init__(json.dumps(value).encode() if not isinstance(value, bytes) else value)


class AzureWriterTests(unittest.TestCase):
    def setUp(self):
        self.opener = Mock()
        self.patch = patch.object(azure_writer.urllib.request, "build_opener", return_value=self.opener)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def test_presence_check_is_not_a_connectivity_claim(self):
        self.assertFalse(azure_writer.configured({}))
        self.assertFalse(azure_writer.configured({"AZURE_OPENAI_ENDPOINT": "x"}))
        self.assertTrue(azure_writer.configured(API_ENV))
        self.assertTrue(azure_writer.configured({**MI_ENV, "AZURE_OPENAI_API_KEY": ""}))
        self.opener.open.assert_not_called()

    def test_correct_v1_deployment_payload_and_usage(self):
        self.opener.open.return_value = Response(completion())
        client = AzureWriter(API_ENV)
        self.assertEqual(client.complete("Write carefully.", "Topic", 2200), {"article": "Complete draft"})
        request = self.opener.open.call_args.args[0]
        payload = json.loads(request.data)
        self.assertEqual(request.full_url, "https://tribal-example.openai.azure.com/openai/v1/chat/completions")
        self.assertEqual(payload["model"], "editorial-deployment")
        self.assertEqual(payload["max_completion_tokens"], 2200)
        self.assertEqual(payload["response_format"], {"type": "json_object"})
        self.assertNotIn("temperature", payload)
        self.assertIn("JSON", payload["messages"][0]["content"])
        self.assertEqual(request.get_header("Api-key"), API_ENV["AZURE_OPENAI_API_KEY"])
        self.assertIsNone(request.get_header("X-identity-header"))
        self.assertEqual(self.opener.open.call_args.kwargs["timeout"], 45)
        self.assertEqual(client.call_count, 1)
        self.assertEqual(client.usage, {"prompt_tokens": 50, "completion_tokens": 100, "total_tokens": 150})

    def test_managed_identity_preferred_and_secret_headers_do_not_cross_endpoints(self):
        self.opener.open.side_effect = [Response({"access_token": "test-bearer", "token_type": "Bearer"}), Response(completion())]
        client = AzureWriter(MI_ENV)
        client.complete("System", "User")
        identity, model = [call.args[0] for call in self.opener.open.call_args_list]
        query = urllib.parse.parse_qs(urllib.parse.urlsplit(identity.full_url).query)
        self.assertEqual(query["resource"], ["https://cognitiveservices.azure.com/"])
        self.assertEqual(query["api-version"], ["2019-08-01"])
        self.assertEqual(query["client_id"], [MI_ENV["AZURE_CLIENT_ID"]])
        self.assertEqual(identity.get_header("X-identity-header"), MI_ENV["IDENTITY_HEADER"])
        self.assertIsNone(identity.get_header("Api-key"))
        self.assertIsNone(identity.get_header("Authorization"))
        self.assertEqual(model.get_header("Authorization"), "Bearer test-bearer")
        self.assertIsNone(model.get_header("X-identity-header"))
        self.assertIsNone(model.get_header("Api-key"))

    def test_identity_failure_never_falls_back_to_saved_api_key(self):
        self.opener.open.side_effect = TimeoutError("sensitive remote detail")
        client = AzureWriter(MI_ENV)
        with self.assertRaisesRegex(WriterConnectionError, "Azure identity request could not connect") as caught:
            client.complete("System", "User")
        self.assertNotIn("sensitive", str(caught.exception))
        self.assertEqual(self.opener.open.call_count, 1)
        self.assertEqual(client.call_count, 1)

    def test_system_assigned_identity_omits_client_parameter(self):
        self.opener.open.side_effect = [Response({"access_token": "test-bearer"}), Response(completion())]
        AzureWriter({**MI_ENV, "AZURE_CLIENT_ID": ""}).complete("System", "User")
        self.assertNotIn("client_id", self.opener.open.call_args_list[0].args[0].full_url)

    def test_rejects_remote_identity_endpoint_before_network(self):
        for endpoint in ("https://evil.example/token", "http://8.8.8.8/token", "http://localhost@evil.example/token", "http://localhost/token?resource=evil"):
            with self.subTest(endpoint=endpoint), self.assertRaises(WriterConnectionError):
                AzureWriter({**MI_ENV, "IDENTITY_ENDPOINT": endpoint})
        self.opener.open.assert_not_called()

    def test_only_resource_origins_are_accepted(self):
        for endpoint in (
            "http://example.openai.azure.com", "https://example.openai.azure.com.attacker.com",
            "https://openai.azure.com", "https://user:pass@example.openai.azure.com",
            "https://example.openai.azure.com/openai/v1", "https://example.openai.azure.com?key=secret",
            "https://example.openai.azure.com:8443", "https://exam\nple.openai.azure.com",
        ):
            with self.subTest(endpoint=endpoint), self.assertRaises(WriterConnectionError):
                AzureWriter({**API_ENV, "AZURE_OPENAI_ENDPOINT": endpoint})
        AzureWriter({**API_ENV, "AZURE_OPENAI_ENDPOINT": "https://example.services.ai.azure.com"})
        self.opener.open.assert_not_called()

    def test_rejects_invalid_headers_and_deployment_without_exposing_values(self):
        for override in ({"AZURE_OPENAI_API_KEY": "bad\r\nsecret"}, {"AZURE_OPENAI_DEPLOYMENT": "../bad"}):
            with self.assertRaises(WriterConnectionError) as caught:
                AzureWriter({**API_ENV, **override})
            self.assertNotIn("bad", str(caught.exception))
        self.opener.open.assert_not_called()

    def test_no_retry_http_error_and_body_never_read_or_exposed(self):
        body = Mock()
        error = urllib.error.HTTPError("https://secret.example", 401, "secret reason", {}, body)
        self.opener.open.side_effect = error
        client = AzureWriter(API_ENV)
        with self.assertRaisesRegex(WriterConnectionError, r"Azure writer request failed \(HTTP 401\)") as caught:
            client.complete("System", "User")
        body.read.assert_not_called()
        self.assertNotIn("secret", str(caught.exception))
        self.assertEqual(self.opener.open.call_count, 1)
        self.assertIsNone(caught.exception.__cause__)

    def test_network_errors_are_sanitized_and_calls_are_bounded(self):
        self.opener.open.side_effect = urllib.error.URLError("fake-test-api-secret")
        client = AzureWriter(API_ENV)
        for _ in range(3):
            with self.assertRaises(WriterConnectionError) as caught:
                client.complete("System", "User")
            self.assertNotIn("fake-test", str(caught.exception))
        with self.assertRaisesRegex(WriterConnectionError, "three-call"):
            client.complete("System", "User")
        self.assertEqual(self.opener.open.call_count, 3)

    def test_successes_also_consume_three_call_budget_and_accumulate_usage(self):
        self.opener.open.side_effect = [Response(completion()) for _ in range(3)]
        client = AzureWriter(API_ENV)
        for _ in range(3):
            client.complete("System", "User")
        with self.assertRaises(WriterConnectionError):
            client.complete("System", "User")
        self.assertEqual(client.usage["total_tokens"], 450)

    def test_input_and_token_limits_precede_auth_or_network(self):
        client = AzureWriter(MI_ENV)
        for system, user, limit in (("", "u", 10), ("s", "u", 0), ("s", "u", 6001), ("s", "u", True), ("s", "é" * 60001, 10), ("s", "\ud800", 10)):
            with self.subTest(limit=limit), self.assertRaises(WriterConnectionError):
                client.complete(system, user, limit)
        self.assertEqual(client.call_count, 0)
        self.opener.open.assert_not_called()

    def test_truncated_refused_tool_and_empty_responses_fail_closed(self):
        outputs = [
            completion(finish="length"), completion(finish="content_filter"),
            completion(refusal="Cannot write this"), completion(tool_calls=[{"name": "tool"}]),
            completion(content=""), {"choices": []}, {"choices": [{"finish_reason": "stop", "message": None}]},
        ]
        for output in outputs:
            with self.subTest(output=output), self.assertRaises(WriterConnectionError):
                self.opener.open.return_value = Response(output)
                AzureWriter(API_ENV).complete("System", "User")

    def test_only_strict_json_objects_accepted(self):
        for content in ('[]', 'null', '```json\n{}\n```', '{"x":1,"x":2}', '{"x":NaN}', '{"x":Infinity}', '{unfinished'):
            with self.subTest(content=content), self.assertRaises(WriterConnectionError):
                self.opener.open.return_value = Response(completion(content=content))
                AzureWriter(API_ENV).complete("System", "User")
        for raw in (b'[]', b'not-json', b'{"choices":[],"choices":[]}'):
            with self.subTest(raw=raw), self.assertRaises(WriterConnectionError):
                self.opener.open.return_value = Response(raw)
                AzureWriter(API_ENV).complete("System", "User")

    def test_bounded_response_read_rejects_oversized_payload(self):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = b"x" * (azure_writer.MAX_RESPONSE_BYTES + 1)
        self.opener.open.return_value = response
        with self.assertRaisesRegex(WriterConnectionError, "response size limit"):
            AzureWriter(API_ENV).complete("System", "User")
        response.read.assert_called_once_with(azure_writer.MAX_RESPONSE_BYTES + 1)

    def test_identity_malformed_token_fails_before_model_request(self):
        for identity in ({"access_token": None}, {"access_token": "test", "token_type": []}, {"access_token": "bad\r\nheader"}):
            with self.subTest(identity=identity), self.assertRaises(WriterConnectionError):
                self.opener.open.reset_mock()
                self.opener.open.return_value = Response(identity)
                AzureWriter(MI_ENV).complete("System", "User")
            self.assertEqual(self.opener.open.call_count, 1)

    def test_interrupted_response_read_is_sanitized(self):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.side_effect = http.client.IncompleteRead(b"sensitive partial response")
        self.opener.open.return_value = response
        with self.assertRaises(WriterConnectionError) as caught:
            AzureWriter(API_ENV).complete("System", "User")
        self.assertNotIn("sensitive", str(caught.exception))

    def test_redirects_are_rejected_without_forwarding_headers(self):
        handler = azure_writer._NoRedirect()
        request = urllib.request.Request("https://example.openai.azure.com", headers={"api-key": "test-secret"})
        with self.assertRaisesRegex(WriterConnectionError, "no credentials were forwarded"):
            handler.redirect_request(request, None, 307, "Redirect", {}, "https://evil.example")


if __name__ == "__main__":
    unittest.main()
