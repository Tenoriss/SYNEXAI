"""Application configuration.

Settings are loaded from environment variables (optionally via ``backend/.env``).
Secrets such as ``GEMINI_API_KEY`` are only ever read here on the backend and are
never serialised into API responses.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_DIR / ".env"

SUPPORTED_AI_PROVIDERS = frozenset({"gemini"})
DEFAULT_CORS_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")
PLACEHOLDER_KEYS = frozenset({"", "your_key_here", "changeme", "your_api_key_here"})

#: Default model for structured extraction work. It is a *default*, not a claim:
#: anything the configured account cannot see is reported as ``AI_MODEL_UNAVAILABLE``
#: and can be changed with ``GEMINI_MODEL`` without touching code.
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
#: Alternative model IDs documented by Google at the time of writing, listed so an
#: operator can switch deliberately (see README). Nothing here is auto-selected.
RECOMMENDED_GEMINI_MODELS = (
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.8-flash",
)

#: An AI request must never hang a worker: 120s covers a long structured answer.
DEFAULT_AI_TIMEOUT_SECONDS = 120.0
#: Transient failures are retried at most this often (spec: max 2 retries).
DEFAULT_AI_MAX_RETRIES = 2
DEFAULT_AI_TEMPERATURE = 0.2


def _positive_float(value: str | None, default: float) -> float:
    """Environment overrides must not be able to produce a zero/negative timeout."""
    try:
        parsed = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


def _bounded_float(value: str | None, default: float, low: float, high: float) -> float:
    try:
        parsed = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return min(max(parsed, low), high)


def _bounded_int(value: str | None, default: int, low: int, high: int) -> int:
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return min(max(parsed, low), high)


def _split_csv(value: str | None) -> tuple[str, ...]:
    if not value:
        return ()
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    app_name: str = "SYNEX AI"
    app_version: str = "0.1.0"
    app_env: str = "development"
    ai_provider: str = "gemini"
    gemini_model: str = DEFAULT_GEMINI_MODEL
    # Optional endpoint override. Used by the test harness to point the real SDK
    # at a local stub; harmless in production and never contains credentials.
    gemini_base_url: str | None = field(default=None, repr=False)
    ai_timeout_seconds: float = DEFAULT_AI_TIMEOUT_SECONDS
    ai_max_retries: int = DEFAULT_AI_MAX_RETRIES
    ai_temperature: float = DEFAULT_AI_TEMPERATURE
    cors_origins: tuple[str, ...] = DEFAULT_CORS_ORIGINS
    # repr=False keeps the key out of logs / tracebacks that print the settings object.
    gemini_api_key: str | None = field(default=None, repr=False)

    @property
    def is_development(self) -> bool:
        return self.app_env == "development"

    @property
    def ai_provider_supported(self) -> bool:
        return self.ai_provider in SUPPORTED_AI_PROVIDERS

    @property
    def ai_retry_budget(self) -> int:
        """Total attempts = 1 initial try + the configured retries, clamped to 2 retries."""
        try:
            retries = int(self.ai_max_retries)
        except (TypeError, ValueError):
            retries = DEFAULT_AI_MAX_RETRIES
        return 1 + max(0, min(retries, 2))

    @property
    def ai_configured(self) -> bool:
        """True when the active provider has the credentials it needs."""
        if self.ai_provider == "gemini":
            return bool(self.gemini_api_key) and self.gemini_api_key not in PLACEHOLDER_KEYS
        return False


def load_settings() -> Settings:
    # Real environment variables take precedence over values in backend/.env.
    load_dotenv(ENV_FILE, override=False)

    return Settings(
        app_env=os.getenv("APP_ENV", "development").strip().lower(),
        ai_provider=os.getenv("AI_PROVIDER", "gemini").strip().lower(),
        gemini_model=os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip(),
        gemini_base_url=(os.getenv("GEMINI_BASE_URL") or "").strip() or None,
        ai_timeout_seconds=_positive_float(os.getenv("AI_TIMEOUT_SECONDS"), DEFAULT_AI_TIMEOUT_SECONDS),
        ai_max_retries=_bounded_int(os.getenv("AI_MAX_RETRIES"), DEFAULT_AI_MAX_RETRIES, 0, 2),
        ai_temperature=_bounded_float(os.getenv("AI_TEMPERATURE"), DEFAULT_AI_TEMPERATURE, 0.0, 1.0),
        cors_origins=_split_csv(os.getenv("CORS_ORIGINS")) or DEFAULT_CORS_ORIGINS,
        gemini_api_key=(os.getenv("GEMINI_API_KEY") or "").strip() or None,
    )


@lru_cache
def get_settings() -> Settings:
    return load_settings()
