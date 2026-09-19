"""Bounded Azure OpenAI JSON client; no third-party package or retry loop.

AZURE_OPENAI_ENDPOINT is an Azure resource origin, and AZURE_OPENAI_DEPLOYMENT
is a deployment name (not a guessed model name). Container Apps managed identity
is preferred in the default auto mode; AZURE_OPENAI_AUTH_MODE can explicitly
select api_key or managed_identity. Failed identity calls never fall back to a
key. Credentials and remote error bodies never enter error messages.
"""
from __future__ import annotations

import http.client
import ipaddress
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping


MAX_CALLS = 3
MAX_COMPLETION_TOKENS = 12000
MAX_INPUT_BYTES = 120_000
MAX_RESPONSE_BYTES = 256_000
REQUEST_TIMEOUT_SECONDS = 180
IDENTITY_TIMEOUT_SECONDS = 10
IDENTITY_RESOURCE = "https://cognitiveservices.azure.com/"
REASONING_EFFORTS = frozenset(("low", "medium", "high", "minimal", "none", "xhigh", "max"))
AUTH_MODES = frozenset(("auto", "api_key", "managed_identity"))


class WriterConnectionError(RuntimeError):
    """Safe-to-display connection or model-output failure."""


def configured(environ: Mapping[str, str] | None = None) -> bool:
    """Presence only: this does not prove access, configuration validity or credit."""
    env = os.environ if environ is None else environ
    try:
        mode = _auth_mode(env)
    except WriterConnectionError:
        return False
    identity_selected = _uses_identity(env, mode)
    credential_present = (
        env.get("IDENTITY_ENDPOINT", "").strip() and env.get("IDENTITY_HEADER", "").strip()
        if identity_selected else env.get("AZURE_OPENAI_API_KEY", "").strip()
    )
    return bool(
        env.get("AZURE_OPENAI_ENDPOINT", "").strip()
        and env.get("AZURE_OPENAI_DEPLOYMENT", "").strip()
        and credential_present
    )


def _auth_mode(env):
    mode = env.get("AZURE_OPENAI_AUTH_MODE", "auto").strip() or "auto"
    if mode not in AUTH_MODES:
        raise WriterConnectionError("AZURE_OPENAI_AUTH_MODE must be auto, api_key, or managed_identity.")
    return mode


def _uses_identity(env, mode):
    return mode == "managed_identity" or (
        mode == "auto" and bool(env.get("IDENTITY_ENDPOINT") or env.get("IDENTITY_HEADER"))
    )


def _reject_constant(_value):
    raise ValueError("Non-finite JSON value")


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("Duplicate JSON key")
        result[key] = value
    return result


def _json_object(data, label):
    try:
        value = json.loads(data, parse_constant=_reject_constant, object_pairs_hook=_unique_object)
    except (ValueError, TypeError, UnicodeError, RecursionError):
        raise WriterConnectionError(f"{label} was not valid JSON.") from None
    if not isinstance(value, dict):
        raise WriterConnectionError(f"{label} must be a JSON object.")
    return value


def _header_value(value, label):
    if not isinstance(value, str) or not value or len(value) > 16_384 or any(
        ord(char) < 32 or ord(char) > 126 for char in value
    ):
        raise WriterConnectionError(f"{label} is invalid.")
    return value


def _azure_origin(value):
    try:
        parts = urllib.parse.urlsplit(value)
        host = parts.hostname or ""
        valid = (
            parts.scheme == "https"
            and re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:openai\.azure\.com|services\.ai\.azure\.com)", host)
            and parts.port in (None, 443)
            and parts.path in ("", "/")
            and not parts.query and not parts.fragment
            and not parts.username and not parts.password
            and not any(char.isspace() for char in value)
        )
    except ValueError:
        valid = False
    if not valid:
        raise WriterConnectionError("AZURE_OPENAI_ENDPOINT must be an HTTPS Azure resource origin.")
    return f"https://{host}"


def _identity_url(value, client_id):
    try:
        parts = urllib.parse.urlsplit(value)
        host = parts.hostname or ""
        if host == "localhost":
            local = True
        else:
            address = ipaddress.ip_address(host)
            local = address.is_loopback or address.is_link_local or any(
                address in network for network in (
                    ipaddress.ip_network("10.0.0.0/8"),
                    ipaddress.ip_network("172.16.0.0/12"),
                    ipaddress.ip_network("192.168.0.0/16"),
                    ipaddress.ip_network("fc00::/7"),
                ) if address.version == network.version
            )
        valid = (
            local and parts.scheme in ("http", "https") and parts.port != 0
            and not parts.query and not parts.fragment
            and not parts.username and not parts.password
            and not any(char.isspace() for char in value)
        )
    except ValueError:
        valid = False
    if not valid:
        raise WriterConnectionError("IDENTITY_ENDPOINT must be the local Container Apps token endpoint.")
    query = {"resource": IDENTITY_RESOURCE, "api-version": "2019-08-01"}
    if client_id:
        if not re.fullmatch(r"[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}", client_id):
            raise WriterConnectionError("AZURE_CLIENT_ID must be a managed identity client ID.")
        query["client_id"] = client_id
    return value + "?" + urllib.parse.urlencode(query)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise WriterConnectionError("Azure request redirected; no credentials were forwarded.")


class AzureWriter:
    def __init__(self, environ: Mapping[str, str] | None = None):
        env = os.environ if environ is None else environ
        self.endpoint = _azure_origin(env.get("AZURE_OPENAI_ENDPOINT", "").strip())
        self.deployment = env.get("AZURE_OPENAI_DEPLOYMENT", "").strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", self.deployment):
            raise WriterConnectionError("AZURE_OPENAI_DEPLOYMENT must name an existing deployment.")
        self.reasoning_effort = env.get("AZURE_OPENAI_REASONING_EFFORT", "").strip()
        if self.reasoning_effort and self.reasoning_effort not in REASONING_EFFORTS:
            raise WriterConnectionError("AZURE_OPENAI_REASONING_EFFORT is not a supported setting.")
        self.auth_mode = _auth_mode(env)
        self._identity_url = None
        self._identity_header = None
        self._api_key = None
        if _uses_identity(env, self.auth_mode):
            self._identity_url = _identity_url(
                env.get("IDENTITY_ENDPOINT", ""), env.get("AZURE_CLIENT_ID", "").strip()
            )
            self._identity_header = _header_value(env.get("IDENTITY_HEADER", ""), "Managed identity header")
        else:
            self._api_key = _header_value(env.get("AZURE_OPENAI_API_KEY", ""), "Azure API credential")
        # Explicitly bypass ambient proxies for the local identity secret and block
        # redirects for both endpoints so Authorization/API keys stay at their origin.
        self._opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())
        self.call_count = 0
        self.usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

    def _open(self, request, *, timeout, limit, label):
        try:
            return self._opener.open(request, timeout=timeout)
        except WriterConnectionError:
            raise
        except urllib.error.HTTPError as error:
            code = error.code
            error.close()
            raise WriterConnectionError(f"{label} failed (HTTP {code}).") from None
        except (OSError, ValueError, urllib.error.URLError, http.client.HTTPException):
            raise WriterConnectionError(f"{label} could not connect within its request limits.") from None

    def _request_json(self, request, *, timeout, limit, label):
        try:
            with self._open(request, timeout=timeout, limit=limit, label=label) as response:
                data = response.read(limit + 1)
        except WriterConnectionError:
            raise
        except (OSError, ValueError, http.client.HTTPException):
            raise WriterConnectionError(f"{label} could not connect within its request limits.") from None
        if len(data) > limit:
            raise WriterConnectionError(f"{label} exceeded its response size limit.")
        return _json_object(data, label)

    def _echo(self, text):
        if text:
            print(text, end="", flush=True)

    def _finish_echo(self):
        print(flush=True)

    def _read_bounded(self, response, *, remaining, label, size=4096):
        if remaining <= 0:
            raise WriterConnectionError(f"{label} exceeded its response size limit.")
        try:
            chunk = response.read(min(size, remaining))
        except (OSError, ValueError, http.client.HTTPException):
            raise WriterConnectionError(f"{label} could not connect within its request limits.") from None
        if not chunk:
            return b""
        if len(chunk) >= remaining:
            raise WriterConnectionError(f"{label} exceeded its response size limit.")
        return chunk

    def _sse_event(self, line, label):
        line = line.strip()
        if not line or line.startswith(b":") or not line.startswith(b"data:"):
            return None
        data = line[5:].strip()
        if data == b"[DONE]":
            return False
        return _json_object(data, label)

    def _apply_stream_event(self, event, parts, state):
        usage = event.get("usage")
        if isinstance(usage, dict):
            state["usage"] = usage
        choices = event.get("choices")
        if not isinstance(choices, list) or not choices or not isinstance(choices[0], dict):
            return
        choice = choices[0]
        if choice.get("finish_reason"):
            state["finish_reason"] = choice.get("finish_reason")
        delta = choice.get("delta")
        if not isinstance(delta, dict):
            return
        piece = delta.get("content")
        if isinstance(piece, str) and piece:
            parts.append(piece)
            self._echo(piece)
        for key in ("refusal", "tool_calls", "function_call"):
            if delta.get(key):
                state[key] = delta.get(key)

    def _completion_from_object(self, result, label, *, echo=False):
        usage = result.get("usage")
        if isinstance(usage, dict):
            for key in self.usage:
                count = usage.get(key, 0)
                if type(count) is int and count >= 0:
                    self.usage[key] += count
        choices = result.get("choices")
        if not isinstance(choices, list) or len(choices) != 1 or not isinstance(choices[0], dict):
            raise WriterConnectionError("Azure writer returned no single completion.")
        choice = choices[0]
        message = choice.get("message")
        if choice.get("finish_reason") != "stop":
            raise WriterConnectionError("Azure writer did not finish a complete article response.")
        if not isinstance(message, dict) or message.get("refusal") or message.get("tool_calls") or message.get("function_call"):
            raise WriterConnectionError("Azure writer refused or returned an unsupported response.")
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise WriterConnectionError("Azure writer returned no article JSON.")
        if echo:
            self._echo(content)
            self._finish_echo()
        return _json_object(content, "Azure writer content")

    def _parse_completion(self, response, *, limit, label):
        buf = b""
        remaining = limit + 1
        mode = None
        parts = []
        state = {"finish_reason": None, "usage": None, "refusal": None, "tool_calls": None, "function_call": None}
        echoed = False
        while True:
            chunk = self._read_bounded(response, remaining=remaining, label=label)
            if chunk:
                remaining -= len(chunk)
                buf += chunk
            if mode is None:
                stripped = buf.lstrip()
                if not stripped:
                    if not chunk:
                        raise WriterConnectionError(f"{label} was not valid JSON.")
                    continue
                mode = "json" if stripped.startswith(b"{") else "sse"
                buf = stripped
            if mode == "json":
                if chunk:
                    continue
                result = _json_object(buf, label)
                return self._completion_from_object(result, label, echo=True)
            while True:
                newline = buf.find(b"\n")
                if newline < 0:
                    if chunk:
                        break
                    line, buf = buf, b""
                else:
                    line, buf = buf[:newline], buf[newline + 1:]
                event = self._sse_event(line, label)
                if event is None:
                    if not chunk and not buf:
                        break
                    continue
                if event is False:
                    buf = b""
                    chunk = b""
                    break
                self._apply_stream_event(event, parts, state)
                echoed = True
            if not chunk:
                break
        if echoed:
            self._finish_echo()
        result = {
            "choices": [{
                "finish_reason": state["finish_reason"],
                "message": {
                    "content": "".join(parts),
                    **{key: state[key] for key in ("refusal", "tool_calls", "function_call") if state[key]},
                },
            }],
            "usage": state["usage"] or {},
        }
        return self._completion_from_object(result, label, echo=False)

    def _auth_headers(self):
        if self._identity_url:
            request = urllib.request.Request(
                self._identity_url,
                headers={"X-IDENTITY-HEADER": self._identity_header, "Accept": "application/json"},
            )
            result = self._request_json(
                request, timeout=IDENTITY_TIMEOUT_SECONDS, limit=32_000, label="Azure identity request"
            )
            token = _header_value(result.get("access_token"), "Azure identity access token")
            token_type = result.get("token_type", "Bearer")
            if not isinstance(token_type, str) or token_type.lower() != "bearer":
                raise WriterConnectionError("Azure identity returned an unsupported token type.")
            return {"Authorization": "Bearer " + token}
        return {"api-key": self._api_key}

    def complete(self, system: str, user: str, max_tokens: int = 4000, deployment: str | None = None) -> dict:
        """Return one complete JSON object, or fail closed without automatic retries."""
        if self.call_count >= MAX_CALLS:
            raise WriterConnectionError("Writer reached its three-call run limit.")
        if type(max_tokens) is not int or not 1 <= max_tokens <= MAX_COMPLETION_TOKENS:
            raise WriterConnectionError("Writer completion token limit must be between 1 and 12000.")
        if not isinstance(system, str) or not system.strip() or not isinstance(user, str) or not user.strip():
            raise WriterConnectionError("Writer requires nonempty system and user instructions.")
        model = self.deployment if not deployment else deployment.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._-]{0,127}", model):
            raise WriterConnectionError("AZURE_OPENAI_DEPLOYMENT must name an existing deployment.")
        try:
            input_bytes = len(system.encode("utf-8")) + len(user.encode("utf-8"))
        except UnicodeError:
            raise WriterConnectionError("Writer instructions must be valid Unicode.") from None
        if input_bytes > MAX_INPUT_BYTES:
            raise WriterConnectionError("Writer input exceeded its size limit.")
        payload_data = {
            "model": model,
            "messages": [
                {"role": "system", "content": system + "\nReturn one JSON object only."},
                {"role": "user", "content": user},
            ],
            "response_format": {"type": "json_object"},
            "max_completion_tokens": max_tokens,
            "stream": True,
        }
        if self.reasoning_effort and not model.lower().startswith("grok"):
            payload_data["reasoning_effort"] = self.reasoning_effort
        payload = json.dumps(payload_data, ensure_ascii=False).encode("utf-8")
        # Failed attempts consume a slot too; callers cannot accidentally retry forever.
        self.call_count += 1
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream, application/json",
            **self._auth_headers(),
        }
        request = urllib.request.Request(
            self.endpoint + "/openai/v1/chat/completions", data=payload, headers=headers, method="POST"
        )
        try:
            with self._open(
                request, timeout=REQUEST_TIMEOUT_SECONDS, limit=MAX_RESPONSE_BYTES, label="Azure writer request"
            ) as response:
                return self._parse_completion(response, limit=MAX_RESPONSE_BYTES, label="Azure writer request")
        except WriterConnectionError:
            raise
        except (OSError, ValueError, http.client.HTTPException):
            raise WriterConnectionError("Azure writer request could not connect within its request limits.") from None
