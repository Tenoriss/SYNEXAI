"""AI provider abstraction.

The analysis layer never talks to a vendor SDK directly: it asks for an
``AIProvider`` and gets text back. That keeps Gemini behind one boundary so an
OpenAI / Ollama / Groq provider can be added by registering it in the factory,
without touching prompts, validation or the API routes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any

from pydantic import BaseModel


class AIErrorCategory(str, Enum):
    """Every failure the API layer has to explain to a user.

    The categories are deliberately few and stable: the HTTP layer maps them to
    error codes, and the UI can react (configure the key, wait, retry).
    """

    NOT_CONFIGURED = "not_configured"
    TIMEOUT = "timeout"
    RATE_LIMITED = "rate_limited"
    PROVIDER_FAILURE = "provider_failure"
    MODEL_UNAVAILABLE = "model_unavailable"
    INVALID_OUTPUT = "invalid_output"
    UNSUPPORTED = "unsupported"

    @property
    def retryable(self) -> bool:
        return self in {AIErrorCategory.TIMEOUT, AIErrorCategory.RATE_LIMITED, AIErrorCategory.PROVIDER_FAILURE}


class AIProviderError(Exception):
    """A provider failure, already stripped of anything sensitive.

    ``details`` may only contain values that are safe to show an operator
    (an HTTP status, a model name) — never response bodies, headers or keys.
    """

    def __init__(
        self,
        category: AIErrorCategory,
        message: str,
        *,
        details: dict[str, Any] | None = None,
        provider: str | None = None,
    ) -> None:
        super().__init__(message)
        self.category = category
        self.message = message
        self.details = details or {}
        self.provider = provider


class AIProvider(ABC):
    """Minimal interface every provider implements."""

    #: Stable identifier used in responses and logs (``gemini``, ``openai``, …).
    name: str = "unknown"
    #: Model actually used for generation, reported for transparency only.
    model: str = ""

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        response_schema: type[BaseModel] | None = None,
        temperature: float | None = None,
    ) -> str:
        """Return the model's raw text answer.

        Implementations must raise :class:`AIProviderError` for every failure so
        callers never have to know which SDK produced it.
        """
        raise NotImplementedError

    async def aclose(self) -> None:  # pragma: no cover - optional hook
        """Release any network resources. Override when the SDK needs it."""
        return None
