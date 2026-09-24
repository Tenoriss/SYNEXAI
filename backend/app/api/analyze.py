"""Analysis endpoints.

Thin by design: parse and validate the request, hand it to :class:`AIService`,
return the validated envelope. Prompt building, provider choice, retries,
validation and error mapping all live in the service layer.
"""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import Field

from app.schemas.ai import (
    AnalysisTaskInfo,
    AnalyzeAvailabilityResponse,
    SystemUnderstandingRequest,
    SystemUnderstandingResponse,
)
from app.services.ai_service import AIError, AIService

logger = logging.getLogger("synex.api.analyze")

router = APIRouter(prefix="/analyze", tags=["analysis"])


class AnalyzeRequest(SystemUnderstandingRequest):
    """The general entry point: dispatches to whichever task is implemented."""

    task: Literal["system-understanding"] | str = Field(
        default="system-understanding",
        description="Analysis task to run. Only system-understanding is implemented in this phase.",
    )


def get_ai_service() -> AIService:
    """Dependency so tests (and later phases) can substitute a service."""
    return AIService()


#: What this phase actually does, and what it deliberately does not do.
ANALYSIS_TASKS: tuple[AnalysisTaskInfo, ...] = (
    AnalysisTaskInfo(
        type="system-understanding",
        label="System understanding",
        status="available",
        note="Restates the saved System Information as a structured understanding. Nothing is inferred into a fact.",
    ),
    AnalysisTaskInfo(
        type="pieces",
        label="PIECES analysis",
        status="not-implemented",
        note="Arrives with the analysis phases. It is not approximated here.",
    ),
    AnalysisTaskInfo(
        type="requirements",
        label="Requirements",
        status="not-implemented",
        note="Functional and non-functional requirements are a later phase.",
    ),
    AnalysisTaskInfo(
        type="findings",
        label="Findings and recommendations",
        status="not-implemented",
        note="Findings need evidence links and severity from the analysis phase.",
    ),
    AnalysisTaskInfo(
        type="diagrams",
        label="Diagrams",
        status="not-implemented",
        note="Diagram generation is a later phase.",
    ),
    AnalysisTaskInfo(
        type="report",
        label="Report and PDF export",
        status="not-implemented",
        note="Report building is a later phase.",
    ),
)

_AVAILABLE = {task.type for task in ANALYSIS_TASKS if task.status == "available"}


@router.post(
    "/system-understanding",
    response_model=SystemUnderstandingResponse,
    summary="Turn saved system information into a structured system understanding",
)
async def analyze_system_understanding(
    payload: SystemUnderstandingRequest,
    service: AIService = Depends(get_ai_service),
) -> SystemUnderstandingResponse:
    # The service refuses an empty record before any provider call, so an unfilled
    # form never reaches Gemini (and never costs a request).
    return await service.analyze_system_understanding(payload.system_information)


@router.post(
    "",
    response_model=SystemUnderstandingResponse,
    summary="Run a configured analysis task",
)
async def analyze(
    payload: AnalyzeRequest,
    service: AIService = Depends(get_ai_service),
) -> SystemUnderstandingResponse:
    if payload.task not in _AVAILABLE:
        raise AIError(
            f"{payload.task!r} is not implemented yet."
            if payload.task
            else "No analysis task was requested.",
            code="AI_TASK_NOT_IMPLEMENTED",
            status_code=501,
            details={
                "requested": payload.task,
                "available": sorted(_AVAILABLE),
                "note": "This phase provides the AI infrastructure; only system-understanding runs.",
            },
        )
    return await service.analyze_system_understanding(payload.system_information)


@router.get(
    "/tasks",
    response_model=AnalyzeAvailabilityResponse,
    summary="Which analysis tasks this server can run",
)
async def list_tasks() -> AnalyzeAvailabilityResponse:
    return AnalyzeAvailabilityResponse(success=True, data=list(ANALYSIS_TASKS))
