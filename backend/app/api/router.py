"""Aggregates all API routers under the ``/api`` prefix."""

from fastapi import APIRouter

from app.api import analyze, health

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(analyze.router)
