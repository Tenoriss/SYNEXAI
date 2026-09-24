"""Test doubles for the AI layer.

The fake provider keeps the tests independent of any network call, while
exercising exactly the same interface the real Gemini provider implements.
"""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel

from app.ai.base import AIErrorCategory, AIProvider, AIProviderError


def understanding_payload(**overrides: Any) -> dict[str, Any]:
    """A schema-valid answer of the kind Gemini is asked to produce."""
    payload: dict[str, Any] = {
        "summary": "A four-branch library system that records loans, reservations and fines.",
        "purpose": "Replace the desk-based card process used by the branches.",
        "systemScope": "Covers check-out and return at the service desk; nothing else is described.",
        "actors": ["Desk clerk", "Library member"],
        "stakeholders": ["Head librarian (Owner)"],
        "processes": ["Member queues at a desk", "Clerk writes the due date on a card"],
        "inputs": ["Member card", "Book"],
        "outputs": ["Stamped due date"],
        "dataEntities": ["Loan"],
        "technologies": [],
        "businessRules": ["Fines apply after the due date"],
        "assumptions": ["'Four branches' implies each branch keeps its own desk (from the stated purpose)."],
        "missingInformation": ["Are branch managers separate users from desk clerks?"],
    }
    payload.update(overrides)
    return payload


class FakeProvider(AIProvider):
    """Replays a list of results; each item is either text, an exception, or callable."""

    name = "fake"

    def __init__(self, results: list[Any], *, model: str = "fake-model") -> None:
        self._results = list(results)
        self.model = model
        self.calls: list[dict[str, Any]] = []

    @property
    def prompt(self) -> str:
        return self.calls[-1]["prompt"]

    @property
    def call_count(self) -> int:
        return len(self.calls)

    async def generate(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        response_schema: type[BaseModel] | None = None,
        temperature: float | None = None,
    ) -> str:
        self.calls.append(
            {
                "prompt": prompt,
                "system_instruction": system_instruction,
                "response_schema": response_schema,
                "temperature": temperature,
            }
        )
        if not self._results:
            result: Any = json.dumps(understanding_payload())
        else:
            # The last scripted result repeats, so "fails like this forever" needs one item.
            result = self._results.pop(0) if len(self._results) > 1 else self._results[0]
        if isinstance(result, Exception):
            raise result
        if callable(result):
            return result()
        if isinstance(result, dict):
            return json.dumps(result)
        return str(result)

    async def aclose(self) -> None:
        return None


def provider_error(
    category: AIErrorCategory = AIErrorCategory.PROVIDER_FAILURE,
    message: str = "boom",
) -> AIProviderError:
    return AIProviderError(category, message, provider="fake")
