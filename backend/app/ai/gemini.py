"""Google Gemini provider.

This is the only module in the codebase that imports the Gemini SDK, so the rest
of the application stays vendor-neutral.

It uses the current official SDK (``google-genai``) and its async API:
``Client.aio.models.generate_content`` with a ``GenerateContentConfig``. Structured
output is requested with ``response_mime_type="application/json"`` plus
``response_schema``, which is the SDK's supported way to constrain generation.
Deprecated patterns from the old ``google-generativeai`` package (``genai.configure``,
``GenerativeModel.generate_content(config=GenerationConfig(...))``) are not used.
"""

from __future__ import annotations

import asyncio
import importlib.metadata
import logging
from typing import Any

import httpx
from pydantic import BaseModel

from app.ai.base import AIErrorCategory, AIProvider, AIProviderError

logger = logging.getLogger("synex.ai.gemini")

#: Timeouts arrive either from our own deadline or from the SDK's HTTP client;
#: both mean the same thing to the analyst, so both map to ``AI_TIMEOUT``.
TIMEOUT_EXCEPTIONS: tuple[type[BaseException], ...] = (TimeoutError, httpx.TimeoutException)
TRANSPORT_EXCEPTIONS: tuple[type[BaseException], ...] = (httpx.TransportError,)

#: HTTP statuses that mean "ask again later" rather than "the request is wrong".
RETRYABLE_STATUSES = frozenset({429, 500, 502, 503, 504})
AUTH_STATUSES = frozenset({401, 403})
def sdk_version() -> str:
    """Installed SDK version, reported by tests and the health payload."""
    try:
        return importlib.metadata.version("google-genai")
    except importlib.metadata.PackageNotFoundError:  # pragma: no cover - dependency is declared
        return "not installed"


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        timeout_seconds: float = 120.0,
        temperature: float = 0.2,
        base_url: str | None = None,
        max_output_tokens: int = 4096,
    ) -> None:
        if not api_key:
            # Defensive: the factory already checks. Never construct a client that
            # would silently pick up ambient credentials.
            raise AIProviderError(AIErrorCategory.NOT_CONFIGURED, "No Gemini API key is configured.")

        from google import genai  # imported lazily so the rest of the app can load without the SDK
        from google.genai import types as genai_types

        self._types = genai_types
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.temperature = temperature
        self.max_output_tokens = max_output_tokens
        self._api_error = genai.errors.APIError

        # HttpOptions.timeout is documented in *milliseconds*; asyncio.wait_for below
        # applies the same budget in seconds so the deadline holds either way.
        self.timeout_ms = max(1, int(round(timeout_seconds * 1000)))
        http_options = genai_types.HttpOptions(
            timeout=self.timeout_ms,
            **({"base_url": base_url} if base_url else {}),
        )

        self._client = genai.Client(api_key=api_key, http_options=http_options)

    # -- generation ---------------------------------------------------------

    async def generate(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        response_schema: type[BaseModel] | None = None,
        temperature: float | None = None,
    ) -> str:
        config_kwargs: dict[str, Any] = {
            "temperature": self.temperature if temperature is None else temperature,
            "max_output_tokens": self.max_output_tokens,
            "response_mime_type": "application/json" if response_schema is not None else "text/plain",
        }
        if response_schema is not None:
            config_kwargs["response_schema"] = response_schema
        if system_instruction:
            config_kwargs["system_instruction"] = system_instruction

        config = self._types.GenerateContentConfig(**config_kwargs)

        try:
            response = await asyncio.wait_for(
                self._client.aio.models.generate_content(model=self.model, contents=prompt, config=config),
                timeout=self.timeout_seconds,
            )
        except TIMEOUT_EXCEPTIONS as exc:
            raise AIProviderError(
                AIErrorCategory.TIMEOUT,
                f"Gemini did not answer within {int(self.timeout_seconds)} seconds.",
                details={"timeoutSeconds": int(self.timeout_seconds)},
                provider=self.name,
            ) from exc
        except TRANSPORT_EXCEPTIONS as exc:  # refused connections, DNS, resets
            logger.warning("Gemini is unreachable (%s)", type(exc).__name__)
            raise AIProviderError(
                AIErrorCategory.PROVIDER_FAILURE,
                "The Gemini API could not be reached.",
                details={"reason": type(exc).__name__},
                provider=self.name,
            ) from exc
        except self._api_error as exc:
            raise self._map_api_error(exc) from exc
        except Exception as exc:  # SDK internals we did not anticipate
            logger.warning("Gemini request failed unexpectedly (%s)", type(exc).__name__)
            raise AIProviderError(
                AIErrorCategory.PROVIDER_FAILURE,
                "The Gemini API could not be reached.",
                details={"reason": type(exc).__name__},
                provider=self.name,
            ) from exc

        return self._extract_text(response)

    # -- helpers ------------------------------------------------------------

    def _map_api_error(self, exc: Exception) -> AIProviderError:
        """Translate an SDK error into a category, without leaking provider internals."""
        status = getattr(exc, "code", None) or 0
        message = str(getattr(exc, "message", "") or "").strip()
        lowered = message.lower()
        details: dict[str, Any] = {}
        if status:
            details["status"] = int(status)

        if status in AUTH_STATUSES:
            return AIProviderError(
                AIErrorCategory.NOT_CONFIGURED,
                "The configured Gemini API key was rejected.",
                details=details,
                provider=self.name,
            )
        if status == 429:
            return AIProviderError(
                AIErrorCategory.RATE_LIMITED,
                "Gemini is rate limiting this request.",
                details=details,
                provider=self.name,
            )
        if status in (404, 400) and ("model" in lowered or "not found" in lowered):
            return AIProviderError(
                AIErrorCategory.MODEL_UNAVAILABLE,
                f"The model {self.model!r} is not available to the configured Gemini account.",
                details={"model": self.model, **details},
                provider=self.name,
            )
        if status >= 500:
            return AIProviderError(
                AIErrorCategory.PROVIDER_FAILURE,
                "Gemini reported a server-side problem.",
                details=details,
                provider=self.name,
            )
        return AIProviderError(
            AIErrorCategory.PROVIDER_FAILURE if status in RETRYABLE_STATUSES else AIErrorCategory.INVALID_OUTPUT,
            "Gemini could not complete the request.",
            details=details,
            provider=self.name,
        )

    def _extract_text(self, response: Any) -> str:
        """Return the model's text or raise; an empty/blocked answer is a failure."""
        text = getattr(response, "text", None)
        if isinstance(text, str) and text.strip():
            return text.strip()

        finish = _finish_reason(response)
        if finish == "MAX_TOKENS":
            raise AIProviderError(
                AIErrorCategory.INVALID_OUTPUT,
                "The model response was cut off before it was complete.",
                details={"finishReason": finish},
                provider=self.name,
            )
        if finish:
            raise AIProviderError(
                AIErrorCategory.PROVIDER_FAILURE,
                "Gemini returned no usable answer for this input.",
                details={"finishReason": finish},
                provider=self.name,
            )
        raise AIProviderError(
            AIErrorCategory.INVALID_OUTPUT,
            "Gemini returned an empty response.",
            provider=self.name,
        )

    async def aclose(self) -> None:
        aio_client = getattr(self._client, "aio", None)
        closer = getattr(aio_client, "close_async_client", None)
        if callable(closer):  # pragma: no cover - depends on SDK internals
            try:
                await closer()
            except Exception:  # noqa: BLE001 - closing must never mask a result
                logger.debug("Ignoring failure while closing the Gemini async client")


def _finish_reason(response: Any) -> str | None:
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        reason = getattr(candidate, "finish_reason", None)
        value = getattr(reason, "value", reason)
        if isinstance(value, str) and value:
            return value.upper()
    return None
