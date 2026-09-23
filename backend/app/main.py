"""SYNEX AI — FastAPI application entry point.

Run locally:
    uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.schemas.common import ErrorResponse
from app.utils.errors import register_error_handlers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("synex")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=f"{settings.app_name} API",
        version=settings.app_version,
        description="AI analysis engine for the SYNEX AI system analysis platform.",
        # Interactive docs only in development.
        docs_url="/api/docs" if settings.is_development else None,
        redoc_url=None,
        openapi_url="/api/openapi.json" if settings.is_development else None,
        responses={422: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    register_error_handlers(app)
    app.include_router(api_router)

    if not settings.ai_provider_supported:
        logger.warning("AI_PROVIDER=%r is not supported yet.", settings.ai_provider)
    elif not settings.ai_configured:
        logger.warning("No API key configured for AI provider %r. AI features will be unavailable.", settings.ai_provider)

    return app


app = create_app()
