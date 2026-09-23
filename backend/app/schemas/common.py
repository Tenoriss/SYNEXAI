"""Shared API schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(description="Stable machine-readable error code.")
    message: str = Field(description="Human-readable explanation safe to show to users.")
    details: list[dict] | None = Field(
        default=None, description="Optional structured details (e.g. validation issues)."
    )


class ErrorResponse(BaseModel):
    error: ErrorDetail


class AIStatus(BaseModel):
    provider: str
    supported: bool
    configured: bool = Field(
        description="Whether credentials for the provider are present. The key itself is never returned."
    )


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    ai: AIStatus
