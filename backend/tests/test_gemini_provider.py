"""Unit tests for the Gemini provider's translation layer.

No network access: the SDK client is replaced by a recorder, so these tests pin
down exactly which arguments we hand to ``generate_content`` and how responses and
errors are interpreted. ``anyio.run`` (already a dependency via Starlette) drives
the coroutines, so no extra pytest plugin is needed.
"""

from __future__ import annotations

import asyncio
import json
from functools import partial
from typing import Any

import anyio
import pytest

from app.ai.base import AIErrorCategory, AIProviderError
from app.ai.gemini import GeminiProvider
from app.schemas.ai import SystemUnderstanding

from tests.fakes import understanding_payload

pytest.importorskip("google.genai")


def run(fn, /, *args: Any, **kwargs: Any) -> Any:  # noqa: ANN001, ANN401
    return anyio.run(partial(fn, *args, **kwargs))


class Recorder:
    def __init__(self, response: Any = None, error: Exception | None = None) -> None:
        self.kwargs: dict[str, Any] = {}
        self._response = response
        self._error = error

    async def generate_content(self, **kwargs: Any) -> Any:  # noqa: ANN401
        self.kwargs = kwargs
        if self._error:
            raise self._error
        return self._response


def build_part_response(text: str | None, *, finish: str | None = "STOP") -> Any:  # noqa: ANN401
    from google import genai

    part: dict[str, Any] = {} if text is None else {"text": text}
    candidate: dict[str, Any] = {"index": 0}
    if part:
        candidate["content"] = {"parts": [part], "role": "model"}
    if finish:
        candidate["finishReason"] = finish
    return genai.types.GenerateContentResponse.model_validate({"candidates": [candidate]})


def api_error(status: int, message: str) -> Exception:
    """An SDK error shaped the way the SDK builds one from an HTTP response body."""
    from google.genai import errors

    return errors.APIError(status, {"error": {"code": status, "message": message, "status": "ERR"}})


def make_provider(recorder: Recorder, **overrides: Any) -> GeminiProvider:
    provider = GeminiProvider(api_key=overrides.pop("api_key", "test-key"), model="gemini-test", **overrides)
    # Replace only the transport boundary; the mapping logic under test stays ours.
    provider._client = type("Stub", (), {"aio": type("Aio", (), {"models": recorder})()})()  # noqa: SLF001
    return provider


def test_structured_output_is_requested_through_the_config() -> None:
    recorder = Recorder(build_part_response('{"summary": "ok", "purpose": "ok"}'))
    provider = make_provider(recorder)

    run(provider.generate, "the prompt", system_instruction="rules", response_schema=SystemUnderstanding)

    config = recorder.kwargs["config"]
    assert recorder.kwargs["model"] == "gemini-test"
    assert recorder.kwargs["contents"] == "the prompt"
    assert config.response_mime_type == "application/json"
    assert config.response_schema is SystemUnderstanding
    assert config.system_instruction == "rules"
    assert config.temperature == pytest.approx(0.2)


def test_plain_calls_ask_for_text_and_honour_the_temperature() -> None:
    recorder = Recorder(build_part_response("hello"))
    provider = make_provider(recorder, temperature=0.7)

    assert run(provider.generate, "prompt", temperature=0.9) == "hello"
    config = recorder.kwargs["config"]
    assert config.response_mime_type == "text/plain"
    assert config.response_schema is None
    assert config.temperature == pytest.approx(0.9)


@pytest.mark.parametrize(
    ("status", "message", "category"),
    [
        (401, "API key not valid.", AIErrorCategory.NOT_CONFIGURED),
        (403, "Permission denied on project.", AIErrorCategory.NOT_CONFIGURED),
        (404, "Publisher model projects/x is not found for API version v1beta.", AIErrorCategory.MODEL_UNAVAILABLE),
        (429, "Resource has been exhausted.", AIErrorCategory.RATE_LIMITED),
        (503, "The service is currently unavailable.", AIErrorCategory.PROVIDER_FAILURE),
        (400, "Invalid JSON payload received.", AIErrorCategory.INVALID_OUTPUT),
    ],
)
def test_api_errors_are_categorised_without_leaking_the_payload(
    status: int, message: str, category: AIErrorCategory
) -> None:
    from google.genai import errors

    provider = make_provider(Recorder(error=api_error(status, message)))

    with pytest.raises(AIProviderError) as excinfo:
        run(provider.generate, "prompt")

    mapped = excinfo.value
    assert mapped.category is category
    assert mapped.details.get("status") == status
    # A provider payload is never copied into the client-visible message.
    assert message not in mapped.message
    assert "raw provider body" not in repr(mapped.details)


def test_model_unavailable_names_the_configured_model() -> None:
    provider = make_provider(Recorder(error=api_error(404, "Publisher model is not found for API version v1beta.")))

    with pytest.raises(AIProviderError) as excinfo:
        run(provider.generate, "prompt")

    assert excinfo.value.category is AIErrorCategory.MODEL_UNAVAILABLE
    assert excinfo.value.details["model"] == "gemini-test"


def test_missing_key_never_builds_a_client() -> None:
    with pytest.raises(AIProviderError) as excinfo:
        GeminiProvider(api_key="", model="gemini-test")
    assert excinfo.value.category is AIErrorCategory.NOT_CONFIGURED


@pytest.mark.parametrize("text", [None, "", "   "])
def test_a_response_without_text_is_not_treated_as_an_answer(text: str | None) -> None:
    finish = "SAFETY" if text is None else None
    provider = make_provider(Recorder(build_part_response(text, finish=finish)))

    with pytest.raises(AIProviderError) as excinfo:
        run(provider.generate, "prompt")
    assert excinfo.value.category in {AIErrorCategory.INVALID_OUTPUT, AIErrorCategory.PROVIDER_FAILURE}


def test_truncated_output_is_reported_as_invalid() -> None:
    provider = make_provider(Recorder(build_part_response(None, finish="MAX_TOKENS")))

    with pytest.raises(AIProviderError) as excinfo:
        run(provider.generate, "prompt")
    assert excinfo.value.category is AIErrorCategory.INVALID_OUTPUT
    assert "cut off" in excinfo.value.message


def test_timeout_budget_reaches_the_http_layer_in_milliseconds() -> None:
    provider = GeminiProvider(api_key="k", model="gemini-test", timeout_seconds=7.5)
    # HttpOptions.timeout is documented in milliseconds; the app configures seconds.
    assert provider.timeout_ms == 7500
    assert provider._client._api_client._http_options.timeout == 7500  # noqa: SLF001


def test_a_slow_provider_becomes_a_timeout_error() -> None:
    class Slow(Recorder):
        async def generate_content(self, **kwargs: Any) -> Any:  # noqa: ANN401, ARG002
            await asyncio.sleep(1)
            raise AssertionError("unreachable")

    provider = make_provider(Slow(), timeout_seconds=0.01)

    with pytest.raises(AIProviderError) as excinfo:
        run(provider.generate, "prompt")
    assert excinfo.value.category is AIErrorCategory.TIMEOUT


def test_valid_json_round_trips_through_the_provider() -> None:
    payload = understanding_payload()
    provider = make_provider(Recorder(build_part_response(json.dumps(payload))))

    raw = run(provider.generate, "prompt", response_schema=SystemUnderstanding)

    assert SystemUnderstanding.model_validate_json(raw).summary == payload["summary"]
