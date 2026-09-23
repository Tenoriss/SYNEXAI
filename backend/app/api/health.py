from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.schemas.common import AIStatus, HealthResponse

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse, summary="Service health check")
async def health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=settings.app_version,
        environment=settings.app_env,
        ai=AIStatus(
            provider=settings.ai_provider,
            supported=settings.ai_provider_supported,
            configured=settings.ai_configured,
        ),
    )
