"""End-to-end checks against a local stub of the Gemini REST API.

These use the **real** ``google-genai`` client — nothing here is monkeypatched —
so they prove that our provider actually speaks the SDK correctly: the model name
goes into the URL, the key goes into the header, structured output is requested
through ``config``, and failures become our error categories. The base URL is
pointed at a local process, so no API key and no network access are needed.
"""

from __future__ import annotations

import json
import threading
import time
from functools import partial
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import anyio
import pytest

from app.ai.base import AIErrorCategory, AIProviderError
from app.ai.gemini import GeminiProvider
from app.schemas.ai import SystemUnderstanding

pytest.importorskip("google.genai")

ANSWER = {
    "summary": "A library lending system.",
    "purpose": "Replace the paper cards.",
    "missingInformation": ["Which branches?"],
}


class StubHandler(BaseHTTPRequestHandler):
    server_version = "SynexStub/1.0"

    def do_POST(self) -> None:  # noqa: N802 - http.server naming
        length = int(self.headers.get("content-length", 0))
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        state = self.server.state  # type: ignore[attr-defined]
        state["requests"].append({"path": self.path, "headers": dict(self.headers), "body": raw})

        mode = state.get("mode", "ok")
        if mode == "slow":
            time.sleep(state.get("delay", 0.5))
        if mode in {"error", "slow"} and state.get("status"):
            payload = json.dumps({"error": {"code": state["status"], "message": "stub failure", "status": "UNAVAILABLE"}})
            self.send_response(state["status"])
        elif mode == "empty":
            payload = json.dumps(
                {"candidates": [{"index": 0, "content": {"parts": [], "role": "model"}, "finishReason": "SAFETY"}]}
            )
            self.send_response(200)
        else:
            payload = json.dumps(
                {
                    "candidates": [
                        {
                            "index": 0,
                            "content": {"parts": [{"text": json.dumps(ANSWER)}], "role": "model"},
                            "finishReason": "STOP",
                        }
                    ],
                    "modelVersion": "gemini-test",
                    "usageMetadata": {"promptTokenCount": 11, "candidatesTokenCount": 7, "totalTokenCount": 18},
                }
            )
            self.send_response(200)
        body = payload.encode("utf-8")
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args: Any) -> None:  # noqa: ANN401 - silence the stub
        return


@pytest.fixture
def stub():
    server = ThreadingHTTPServer(("127.0.0.1", 0), StubHandler)
    server.state = {"requests": [], "mode": "ok"}  # type: ignore[attr-defined]
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    class Handle:
        def __init__(self, url: str, state: dict[str, Any]) -> None:
            self.base_url = url
            self._state = state

        @property
        def requests(self) -> list[dict[str, Any]]:
            return self._state["requests"]

        @property
        def last_body(self) -> dict[str, Any]:
            return json.loads(self.requests[-1]["body"])

        def configure(self, **values: Any) -> None:
            self._state.update(values)

    try:
        yield Handle(f"http://127.0.0.1:{server.server_address[1]}", server.state)
    finally:
        server.shutdown()
        server.server_close()


def provider_for(stub: Any, **overrides: Any) -> GeminiProvider:  # noqa: ANN401
    settings = {"api_key": "stub-key-abcdef", "model": "gemini-test", "timeout_seconds": 5.0}
    settings.update(overrides)
    return GeminiProvider(base_url=stub.base_url, **settings)


def generate(provider: GeminiProvider, prompt: str = "the analyst's notes") -> str:
    call = partial(
        provider.generate,
        prompt,
        system_instruction="Do not invent anything.",
        response_schema=SystemUnderstanding,
    )
    return anyio.run(call)


def test_the_real_sdk_call_round_trips(stub) -> None:
    provider = provider_for(stub)

    raw = generate(provider)

    assert json.loads(raw) == ANSWER
    request = stub.requests[-1]
    assert request["path"].endswith("/models/gemini-test:generateContent")
    assert request["headers"]["x-goog-api-key"] == "stub-key-abcdef"


def test_the_request_asks_for_json_shaped_by_our_schema(stub) -> None:
    generate(provider_for(stub))

    # The SDK flattens GenerateContentConfig into the request's generationConfig.
    config = stub.last_body["generationConfig"]
    assert config["responseMimeType"] == "application/json"
    assert config["maxOutputTokens"] == 4096
    properties = config["responseSchema"]["properties"]
    assert "summary" in properties
    assert config["responseSchema"]["required"] == ["summary", "purpose"]
    # camelCase on the wire, snake_case in Python — asserted on the field that differs.
    assert "missingInformation" in properties
    assert "missing_information" not in properties
    assert stub.last_body["contents"][0]["parts"][0]["text"] == "the analyst's notes"
    assert "Do not invent anything." in json.dumps(stub.last_body["systemInstruction"])


def test_the_key_is_never_sent_in_the_url_or_the_prompt(stub) -> None:
    generate(provider_for(stub, model="gemini-test"))

    request = stub.requests[-1]
    assert "stub-key-abcdef" not in request["path"]
    assert "stub-key-abcdef" not in request["body"]


def test_http_errors_become_categorised_failures(stub) -> None:
    stub.configure(mode="error", status=429)
    with pytest.raises(AIProviderError) as excinfo:
        generate(provider_for(stub))
    assert excinfo.value.category is AIErrorCategory.RATE_LIMITED
    assert "stub failure" not in excinfo.value.message

    stub.configure(status=401)
    with pytest.raises(AIProviderError) as excinfo:
        generate(provider_for(stub))
    assert excinfo.value.category is AIErrorCategory.NOT_CONFIGURED


def test_timeout_budget_is_enforced(stub) -> None:
    stub.configure(mode="slow", delay=0.4, status=500)
    with pytest.raises(AIProviderError) as excinfo:
        generate(provider_for(stub, timeout_seconds=0.05))
    assert excinfo.value.category is AIErrorCategory.TIMEOUT


def test_a_refused_connection_does_not_crash_the_process() -> None:
    class Dead:
        base_url = "http://127.0.0.1:1"

    with pytest.raises(AIProviderError) as excinfo:
        generate(provider_for(Dead(), timeout_seconds=2.0))
    assert excinfo.value.category is AIErrorCategory.PROVIDER_FAILURE


def test_a_blocked_answer_is_not_reported_as_success(stub) -> None:
    stub.configure(mode="empty")
    with pytest.raises(AIProviderError) as excinfo:
        generate(provider_for(stub))
    assert excinfo.value.category is AIErrorCategory.PROVIDER_FAILURE
    assert excinfo.value.details["finishReason"] == "SAFETY"
