"""Shared API schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class _Camel(BaseModel):
    """API JSON is camelCase, matching what the frontend already speaks."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ErrorDetail(BaseModel):
    code: str = Field(description="Stable machine-readable error code.")
    message: str = Field(description="Human-readable explanation safe to show to users.")
    details: list[dict] | dict | None = Field(
        default=None, description="Optional structured details (e.g. validation issues)."
    )


class ErrorResponse(BaseModel):
    error: ErrorDetail


class AIStatus(_Camel):
    provider: str
    supported: bool
    configured: bool = Field(
        description="Whether credentials for the provider are present. The key itself is never returned."
    )
    model: str | None = Field(default=None, description="Configured model id, so the client can show what will run.")
    timeout_seconds: float | None = Field(default=None, description="Per-request timeout budget enforced by the backend.")


class HealthResponse(_Camel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    ai: AIStatus
