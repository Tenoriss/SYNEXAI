"""Centralised, safe error handling.

Every error leaving the API uses the same envelope::

    {"error": {"code": "...", "message": "...", "details": [...]}}

Stack traces, secrets and internal messages are never included in responses.
"""

from __future__ import annotations

import logging
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("synex.errors")


class AppError(Exception):
    """Base class for expected, user-facing application errors."""

    status_code: int = 400
    code: str = "bad_request"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code


def _error_body(code: str, message: str, details: list[dict] | None = None) -> dict:
    body: dict = {"code": code, "message": message}
    if details:
        body["details"] = details
    return {"error": body}


async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=_error_body(exc.code, exc.message))


async def _http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    try:
        phrase = HTTPStatus(exc.status_code).phrase
    except ValueError:
        phrase = "Error"
    message = exc.detail if isinstance(exc.detail, str) else phrase
    code = phrase.lower().replace(" ", "_").replace("-", "_")
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(code, message),
        headers=getattr(exc, "headers", None),
    )


async def _validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Only expose location + message; never echo back the submitted input values.
    details = [
        {"field": ".".join(str(p) for p in err.get("loc", ()) if p != "body"), "message": err.get("msg", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=_error_body("validation_error", "Some of the submitted information is invalid.", details),
    )


async def _unhandled_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content=_error_body("internal_error", "Something went wrong on the server. Please try again."),
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppError, _app_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(RequestValidationError, _validation_error_handler)  # type: ignore[arg-type]
    app.add_exception_handler(Exception, _unhandled_error_handler)
