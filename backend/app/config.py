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
PLACEHOLDER_KEYS = frozenset({"", "your_key_here", "changeme"})


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
    gemini_model: str = "gemini-2.5-flash"
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
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip(),
        cors_origins=_split_csv(os.getenv("CORS_ORIGINS")) or DEFAULT_CORS_ORIGINS,
        gemini_api_key=(os.getenv("GEMINI_API_KEY") or "").strip() or None,
    )


@lru_cache
def get_settings() -> Settings:
    return load_settings()
