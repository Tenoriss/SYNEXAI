"""Provider factory.

Callers ask for *the* configured provider; only this module knows which class the
``AI_PROVIDER`` environment variable selects. Adding OpenAI, Ollama or Groq means
adding a branch here (plus a provider module) and nothing else.
"""

from __future__ import annotations

import logging

from app.ai.base import AIErrorCategory, AIProvider, AIProviderError
from app.config import SUPPORTED_AI_PROVIDERS, Settings, get_settings

logger = logging.getLogger("synex.ai.factory")

_provider: AIProvider | None = None
_provider_key: tuple[str, str, float, float] | None = None


def build_provider(settings: Settings) -> AIProvider:
    """Create the provider described by ``settings`` (no caching)."""
    if settings.ai_provider not in SUPPORTED_AI_PROVIDERS:
        raise AIProviderError(
            AIErrorCategory.UNSUPPORTED,
            f"AI provider {settings.ai_provider!r} is not supported yet.",
        )

    if not settings.ai_configured:
        raise AIProviderError(
            AIErrorCategory.NOT_CONFIGURED,
            "The Gemini API key is not configured, so AI analysis cannot run.",
            provider=settings.ai_provider,
        )

    if settings.ai_provider == "gemini":
        from app.ai.gemini import GeminiProvider  # imported here, not at module scope

        return GeminiProvider(
            api_key=settings.gemini_api_key or "",
            model=settings.gemini_model,
            timeout_seconds=settings.ai_timeout_seconds,
            temperature=settings.ai_temperature,
            base_url=settings.gemini_base_url,
        )

    raise AIProviderError(  # pragma: no cover - guarded by SUPPORTED_AI_PROVIDERS
        AIErrorCategory.UNSUPPORTED,
        f"AI provider {settings.ai_provider!r} has no implementation.",
    )


def get_ai_provider(settings: Settings | None = None) -> AIProvider:
    """Return the configured provider, reusing one client per configuration.

    The client is cached because it owns an HTTP connection pool. If the settings
    change (different provider, model or timeout) a fresh one is built, so a
    restart-free configuration change still takes effect.
    """
    global _provider, _provider_key

    current = settings or get_settings()
    key = (current.ai_provider, current.gemini_model, current.ai_timeout_seconds, current.ai_temperature)

    if _provider is not None and _provider_key == key:
        return _provider

    provider = build_provider(current)
    _provider, _provider_key = provider, key
    logger.info("AI provider selected: %s (model=%s)", provider.name, getattr(provider, "model", "?"))
    return provider


def set_ai_provider(provider: AIProvider | None) -> None:
    """Test seam: inject a fake provider (or ``None`` to go back to configuration)."""
    global _provider, _provider_key
    _provider = provider
    _provider_key = None if provider is None else ("injected", "", 0.0, 0.0)
    if provider is not None:
        logger.info("AI provider overridden for this process: %s", provider.name)
