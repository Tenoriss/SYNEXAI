"""AI execution service.

Everything between "the analyst pressed Analyze" and "validated JSON back out"
lives here: it builds the prompt, asks the configured provider, parses and
validates the answer, retries only transient failures (max 2 retries), enforces
the timeout budget, and translates provider errors into safe API errors.

Route functions stay thin; the prompt builder stays in ``services/prompts.py``;
the vendor call stays in ``ai/gemini.py``.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from datetime import UTC, datetime

from pydantic import ValidationError

from app.ai.base import AIErrorCategory, AIProvider, AIProviderError
from app.ai.factory import get_ai_provider
from app.config import RECOMMENDED_GEMINI_MODELS, Settings, get_settings
from app.schemas.ai import AnalysisMeta, SystemInformationInput, SystemUnderstanding, SystemUnderstandingResponse
from app.services.prompts import SYSTEM_UNDERSTANDING_INSTRUCTIONS, build_system_understanding_prompt
from app.utils.errors import AppError

logger = logging.getLogger("synex.ai.service")


class AIError(AppError):
    """An AI failure expressed for the API layer: code + status + safe message.

    Messages are written to be shown as they are: they name what to do next and
    never carry provider payloads, headers or credentials.
    """

    status_code = 502
    code = "AI_PROVIDER_FAILURE"

    def __init__(
        self,
        message: str,
        *,
        code: str | None = None,
        status_code: int | None = None,
        details: dict | None = None,
    ) -> None:
        super().__init__(message, code=code, status_code=status_code)
        self.details = details or {}


class AIInputRequiredError(AIError):
    status_code = 400
    code = "AI_INPUT_REQUIRED"


class AIInvalidResponseError(AIError):
    status_code = 502
    code = "AI_INVALID_RESPONSE"


_CATEGORY_MAP: dict[AIErrorCategory, tuple[str, int, str]] = {
    AIErrorCategory.NOT_CONFIGURED: (
        "AI_NOT_CONFIGURED",
        503,
        "AI provider is not configured. Add GEMINI_API_KEY to backend/.env and restart the server.",
    ),
    AIErrorCategory.UNSUPPORTED: ("AI_PROVIDER_UNSUPPORTED", 503, "The configured AI provider is not supported."),
    AIErrorCategory.TIMEOUT: (
        "AI_TIMEOUT",
        504,
        "The AI provider took too long to answer. Try again, or shorten the input.",
    ),
    AIErrorCategory.RATE_LIMITED: (
        "AI_RATE_LIMITED",
        429,
        "The AI provider is rate limiting requests. Wait a moment and try again.",
    ),
    AIErrorCategory.MODEL_UNAVAILABLE: (
        "AI_MODEL_UNAVAILABLE",
        503,
        "The configured Gemini model is not available to this account. Set GEMINI_MODEL to a model the account can use.",
    ),
    AIErrorCategory.PROVIDER_FAILURE: ("AI_PROVIDER_FAILURE", 502, "The AI provider could not process the request."),
    AIErrorCategory.INVALID_OUTPUT: (
        "AI_INVALID_RESPONSE",
        502,
        "The AI response could not be validated against the expected structure.",
    ),
}


def to_api_error(exc: AIProviderError, settings: Settings | None = None) -> AIError:
    code, status, fallback = _CATEGORY_MAP.get(
        exc.category, ("AI_PROVIDER_FAILURE", 502, "The AI provider could not process the request.")
    )
    details = dict(exc.details)
    if settings is not None and exc.category is AIErrorCategory.MODEL_UNAVAILABLE:
        details["configuredModel"] = settings.gemini_model
        # Names the operator can switch to without reading the SDK docs again.
        details["alternatives"] = list(RECOMMENDED_GEMINI_MODELS)
    return AIError(exc.message or fallback, code=code, status_code=status, details=details)


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$", re.IGNORECASE | re.MULTILINE)


def parse_json_object(raw: str) -> dict:
    """Parse the model's answer as one JSON object.

    Code fences and leading prose are tolerated because models occasionally add
    them even when told not to; anything that is still not a single JSON object is
    an invalid response, never a silently trusted blob.
    """
    text = _FENCE.sub("", (raw or "").strip()).strip()
    if not text.startswith("{"):
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("the response is not a JSON object")
        text = text[start : end + 1]
    loaded = json.loads(text)
    if not isinstance(loaded, dict):
        raise ValueError("the response must be a single JSON object")
    return loaded


class AIService:
    """Runs analysis tasks against the configured provider."""

    def __init__(
        self,
        settings: Settings | None = None,
        *,
        provider: AIProvider | None = None,
        retry_delay: float = 0.5,
    ) -> None:
        self.settings = settings or get_settings()
        self._provider = provider
        self.retry_delay = retry_delay

    # -- wiring --------------------------------------------------------------

    @property
    def provider(self) -> AIProvider:
        return self._provider or get_ai_provider(self.settings)

    # -- tasks ---------------------------------------------------------------

    async def analyze_system_understanding(self, record: SystemInformationInput) -> SystemUnderstandingResponse:
        """Turn one saved System Information record into validated system understanding."""
        if record.is_minimal:
            raise AIInputRequiredError(
                "There is nothing to analyze yet: record at least the system name, purpose or current process first."
            )

        prompt = build_system_understanding_prompt(record)
        attempts_allowed = self.settings.ai_retry_budget
        started = time.perf_counter()

        try:
            provider = self.provider
        except AIProviderError as exc:
            # Missing key / unsupported provider: reported before anything is sent.
            logger.warning(
                "AI request refused: reason=no-provider project=%s category=%s",
                record.project_id or "(none)",
                exc.category.value,
            )
            raise to_api_error(exc, self.settings) from exc

        logger.info(
            "AI request started: task=system-understanding project=%s provider=%s promptChars=%d attemptBudget=%d",
            record.project_id or "(none)",
            provider.name,
            len(prompt),
            attempts_allowed,
        )

        last_error: AIProviderError | None = None
        for attempt in range(1, attempts_allowed + 1):
            try:
                raw = await provider.generate(
                    prompt,
                    system_instruction=SYSTEM_UNDERSTANDING_INSTRUCTIONS,
                    response_schema=SystemUnderstanding,
                )
            except AIProviderError as exc:
                last_error = exc
                retryable = exc.category.retryable and attempt < attempts_allowed
                logger.warning(
                    "AI request failed: task=system-understanding attempt=%d/%d category=%s retry=%s",
                    attempt,
                    attempts_allowed,
                    exc.category.value,
                    retryable,
                )
                if not retryable:
                    break
                await asyncio.sleep(self.retry_delay * attempt)
            else:
                data, validation_note = self._validate(raw)
                duration_ms = int((time.perf_counter() - started) * 1000)
                logger.info(
                    "AI request completed: task=system-understanding attempt=%d/%d (of budget) "
                    "durationMs=%d responseChars=%d validation=%s",
                    attempt,
                    attempts_allowed,
                    duration_ms,
                    len(raw),
                    validation_note,
                )
                return SystemUnderstandingResponse(
                    success=True,
                    data=data,
                    meta=AnalysisMeta(
                        provider=provider.name,
                        model=getattr(provider, "model", None) or self.settings.gemini_model,
                        generatedAt=datetime.now(UTC).isoformat(timespec="seconds").replace("+00:00", "Z"),
                        durationMs=duration_ms,
                        attempts=attempt,
                        promptChars=len(prompt),
                        responseChars=len(raw),
                    ),
                )

        assert last_error is not None  # the loop always sets it when it reaches here
        raise to_api_error(last_error, self.settings)

    # -- validation ----------------------------------------------------------

    def _validate(self, raw: str) -> tuple[SystemUnderstanding, str]:
        """Validate the model output. Never return unvalidated text as analysis."""
        try:
            payload = parse_json_object(raw)
        except (ValueError, json.JSONDecodeError) as exc:
            logger.warning("AI response rejected: reason=not-json detail=%s", type(exc).__name__)
            raise AIInvalidResponseError(
                "The AI response could not be validated: it was not a JSON object. Nothing was stored."
            ) from exc

        try:
            data = SystemUnderstanding.model_validate(payload)
        except ValidationError as exc:
            fields = sorted({ ".".join(str(part) for part in issue["loc"]) for issue in exc.errors() })
            logger.warning("AI response rejected: reason=schema fields=%s", ",".join(fields) or "(unknown)")
            raise AIInvalidResponseError(
                "The AI response did not match the expected structure"
                + (f" ({', '.join(fields[:5])})" if fields else "")
                + ". Nothing was stored.",
                details={"fields": fields[:10]},
            ) from exc

        # A schema-valid object can still be useless: an all-empty answer is reported
        # as an invalid response instead of being saved as "analysis".
        if not (data.summary.strip() or data.purpose.strip() or _has_items(data)):
            raise AIInvalidResponseError(
                "The AI returned an empty understanding, so nothing was stored. "
                "Add more system information and try again."
            )
        return data, "ok"


def _has_items(data: SystemUnderstanding) -> bool:
    return any(
        getattr(data, name)
        for name in (
            "actors",
            "stakeholders",
            "processes",
            "inputs",
            "outputs",
            "data_entities",
            "technologies",
            "business_rules",
            "assumptions",
            "missing_information",
        )
    )
