"""Tests for the analysis endpoint and the AI service around it."""

from __future__ import annotations

import json

import anyio
import pytest
from fastapi.testclient import TestClient

from app.ai.base import AIErrorCategory, AIProviderError
from app.api.analyze import get_ai_service
from app.config import Settings, get_settings
from app.main import create_app
from app.schemas.ai import SystemInformationInput
from app.services.ai_service import AIService

from tests.fakes import FakeProvider, provider_error, understanding_payload

VALID_BODY = {
    "system_information": {
        "projectId": "project-1",
        "systemName": "City Library Lending System",
        "systemType": "Library",
        "systemPurpose": "Record loans, reservations and fines for four branches.",
        "currentWorkflow": "Members queue at a desk; the clerk writes the due date on a card.",
        "stakeholders": [{"name": "Head librarian", "role": "Owner", "description": "Runs all four branches."}],
        "users": [{"name": "Desk clerk", "role": "Staff", "responsibilities": "Issues and returns books."}],
        "dataEntities": [{"name": "Loan", "description": "One row per loan, with due date and fine."}],
        "objectives": ["Cut the check-out queue"],
        "sourceUpdatedAt": "2026-09-24T01:00:00.000Z",
    }
}

EXPECTED_FIELDS = [
    "summary",
    "purpose",
    "systemScope",
    "actors",
    "stakeholders",
    "processes",
    "inputs",
    "outputs",
    "dataEntities",
    "technologies",
    "businessRules",
    "assumptions",
    "missingInformation",
]


def make_client(
    provider: FakeProvider | None = None,
    settings: Settings | None = None,
) -> tuple[TestClient, FakeProvider]:
    app = create_app()
    fake = provider or FakeProvider([])
    resolved = settings or get_settings()
    app.dependency_overrides[get_ai_service] = lambda: AIService(resolved, provider=fake, retry_delay=0)
    return TestClient(app), fake


# -------------------------------------------------------------- happy path


def test_valid_analysis_returns_success_envelope_with_every_field() -> None:
    client, fake = make_client()
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["success"] is True
    assert list(body["data"]) == EXPECTED_FIELDS
    assert body["data"]["summary"].startswith("A four-branch library system")
    assert body["data"]["missingInformation"] == ["Are branch managers separate users from desk clerks?"]
    assert body["meta"]["provider"] == "fake"
    assert body["meta"]["model"] == "fake-model"
    assert body["meta"]["attempts"] == 1
    assert body["meta"]["durationMs"] >= 0
    assert body["meta"]["promptChars"] > 500
    assert body["meta"]["generatedAt"].endswith("Z")


def test_prompt_contains_only_the_analysts_own_words() -> None:
    client, fake = make_client()
    assert client.post("/api/analyze/system-understanding", json=VALID_BODY).status_code == 200

    prompt = fake.prompt
    assert "City Library Lending System" in prompt
    assert "Members queue at a desk" in prompt
    # Ids and bookkeeping never reach the model.
    assert "project-1" not in prompt
    assert "2026-09-24T01:00:00.000Z" not in prompt
    # The anti-hallucination contract is attached as the system instruction.
    instruction = fake.calls[0]["system_instruction"]
    assert "Never invent" in instruction
    assert "missingInformation" in instruction
    # Structured output is requested through the schema, not by prose alone.
    assert fake.calls[0]["response_schema"].__name__ == "SystemUnderstanding"


def test_gaps_are_labelled_not_provided_instead_of_invented() -> None:
    client, fake = make_client()
    body = {"system_information": {"systemName": "Wages system", "systemPurpose": "Calculate monthly wages."}}
    assert client.post("/api/analyze/system-understanding", json=body).status_code == 200
    assert "(not provided)" in fake.prompt


# ------------------------------------------------------------- failure modes


@pytest.mark.parametrize(
    ("category", "code", "status"),
    [
        (AIErrorCategory.NOT_CONFIGURED, "AI_NOT_CONFIGURED", 503),
        (AIErrorCategory.UNSUPPORTED, "AI_PROVIDER_UNSUPPORTED", 503),
        (AIErrorCategory.TIMEOUT, "AI_TIMEOUT", 504),
        (AIErrorCategory.RATE_LIMITED, "AI_RATE_LIMITED", 429),
        (AIErrorCategory.MODEL_UNAVAILABLE, "AI_MODEL_UNAVAILABLE", 503),
        (AIErrorCategory.PROVIDER_FAILURE, "AI_PROVIDER_FAILURE", 502),
        (AIErrorCategory.INVALID_OUTPUT, "AI_INVALID_RESPONSE", 502),
    ],
)
def test_provider_errors_map_to_safe_api_errors(category: AIErrorCategory, code: str, status: int) -> None:
    client, fake = make_client(FakeProvider([provider_error(category)]))
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == status
    body = response.json()
    assert body["success"] is False
    assert body["error"]["code"] == code
    assert "data" not in body


def test_transient_failures_are_retried_at_most_twice() -> None:
    client, fake = make_client(FakeProvider([provider_error(AIErrorCategory.TIMEOUT)] * 5))
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 504
    assert fake.call_count == 3  # 1 try + 2 retries, never more


def test_retry_succeeds_when_the_provider_recovers() -> None:
    client, fake = make_client(
        FakeProvider([provider_error(AIErrorCategory.RATE_LIMITED), understanding_payload()])
    )
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 200
    assert response.json()["meta"]["attempts"] == 2
    assert fake.call_count == 2


def test_invalid_json_is_not_retried_and_never_stored() -> None:
    client, fake = make_client(FakeProvider(["The library system seems fine to me, no JSON here."]))
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 502
    assert response.json()["error"]["code"] == "AI_INVALID_RESPONSE"
    assert fake.call_count == 1  # a malformed answer is not a transient failure


def test_schema_violations_are_reported_with_the_offending_field() -> None:
    client, _ = make_client(FakeProvider([{"summary": "ok", "purpose": "ok", "actors": "not-a-list"}]))
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 502
    body = response.json()
    assert body["error"]["code"] == "AI_INVALID_RESPONSE"
    assert "actors" in body["error"]["message"]
    assert "Nothing was stored" in body["error"]["message"]


def test_extra_keys_from_the_model_are_dropped_not_trusted() -> None:
    payload = understanding_payload(confidence=0.97, recommendations=["Add a barcode scanner"])
    client, _ = make_client(FakeProvider([payload]))
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 200
    assert "confidence" not in response.json()["data"]
    assert "recommendations" not in response.json()["data"]


def test_empty_understanding_is_rejected_as_invalid_output() -> None:
    client, _ = make_client(FakeProvider([{"summary": "", "purpose": "", "actors": []}]))
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 502
    assert "empty understanding" in response.json()["error"]["message"]


def test_model_unavailable_names_the_configured_model_and_alternatives() -> None:
    client, _ = make_client(
        FakeProvider([provider_error(AIErrorCategory.MODEL_UNAVAILABLE, "model not found")]),
        settings=Settings(gemini_api_key="k", gemini_model="gemini-ninetree"),
    )
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 503
    details = response.json()["error"]["details"]
    assert details["configuredModel"] == "gemini-ninetree"
    assert "gemini-2.5-flash" in details["alternatives"]


def test_missing_information_survives_an_omitted_assumptions_list() -> None:
    payload = {key: value for key, value in understanding_payload().items() if key != "assumptions"}
    client, _ = make_client(FakeProvider([payload]))
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 200
    assert response.json()["data"]["assumptions"] == []


# ------------------------------------------------- request validation & guards


def test_empty_system_information_never_reaches_the_provider() -> None:
    client, fake = make_client()
    response = client.post("/api/analyze/system-understanding", json={"system_information": {"additionalNotes": "   "}})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "AI_INPUT_REQUIRED"
    assert fake.call_count == 0


def test_malformed_requests_are_rejected_without_leaking_internals() -> None:
    client, fake = make_client()
    cases = [
        {},
        {"system_information": "not-an-object"},
        {"system_information": {"systemName": 12345}},
        {"system_information": {"systemName": "x" * 500}},
        {"system_information": {"systemName": "x", "stakeholders": {"not": "a list"}}},
        {"system_information": {"objectives": ["x"] * 500}},
    ]
    for body in cases:
        response = client.post("/api/analyze/system-understanding", json=body)
        assert response.status_code == 422, body
        error = response.json()["error"]
        assert error["code"] == "validation_error"
        assert all(set(detail) <= {"field", "message"} for detail in error["details"])
    assert fake.call_count == 0


def test_overlong_list_items_are_rejected_before_the_prompt_is_built() -> None:
    client, fake = make_client()
    response = client.post(
        "/api/analyze/system-understanding",
        json={"system_information": {"systemName": "Ok", "objectives": ["x" * 800]}},
    )
    assert response.status_code == 422
    assert fake.call_count == 0


def test_general_endpoint_runs_the_one_available_task() -> None:
    client, fake = make_client()
    response = client.post("/api/analyze", json={"task": "system-understanding", **VALID_BODY})

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert fake.call_count == 1


@pytest.mark.parametrize("task", ["pieces", "requirements", "diagrams", "report", "made-up"])
def test_unimplemented_tasks_say_so_instead_of_faking_results(task: str) -> None:
    client, fake = make_client()
    response = client.post("/api/analyze", json={"task": task, **VALID_BODY})

    assert response.status_code == 501
    error = response.json()["error"]
    assert error["code"] == "AI_TASK_NOT_IMPLEMENTED"
    assert error["details"]["available"] == ["system-understanding"]
    assert fake.call_count == 0


def test_tasks_endpoint_lists_what_can_run() -> None:
    client, _ = make_client()
    response = client.get("/api/analyze/tasks")
    assert response.status_code == 200
    tasks = {item["type"]: item["status"] for item in response.json()["data"]}
    assert tasks["system-understanding"] == "available"
    assert tasks["pieces"] == "not-implemented"


# --------------------------------------------------------------- secrets


def test_a_real_missing_key_produces_a_useful_503(client: TestClient) -> None:
    """Without an override: the configured provider is genuinely unconfigured."""
    response = client.post("/api/analyze/system-understanding", json=VALID_BODY)

    assert response.status_code == 503
    message = response.json()["error"]["message"]
    assert "GEMINI_API_KEY" in message or "not configured" in message
    assert "api_key" not in response.text.lower()


def test_logs_never_contain_the_key_or_the_full_input(monkeypatch, caplog) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "SECRET-KEY-123")
    monkeypatch.delenv("GEMINI_BASE_URL", raising=False)
    get_settings.cache_clear()
    settings = get_settings()
    record = SystemInformationInput.model_validate(VALID_BODY["system_information"])
    service = AIService(settings, provider=FakeProvider([understanding_payload()]), retry_delay=0)

    with caplog.at_level("INFO", logger="synex"):
        response = anyio.run(service.analyze_system_understanding, record)

    logged = "\n".join(f"{row.levelname} {row.getMessage()}" for row in caplog.records)
    assert "SECRET-KEY-123" not in logged
    assert "Members queue at a desk" not in logged  # the analyst's prose is not repeated
    assert "project-1" in logged  # only identifiers and counts are logged
    assert response.meta.attempts == 1
    get_settings.cache_clear()


def test_api_key_never_appears_in_any_response_body() -> None:
    monkey_settings = Settings(gemini_api_key="SECRET-KEY-123", gemini_model="gemini-test")
    client, _ = make_client(settings=monkey_settings)
    for response in (
        client.get("/api/health"),
        client.post("/api/analyze/system-understanding", json=VALID_BODY),
        client.get("/api/analyze/tasks"),
    ):
        assert "SECRET-KEY-123" not in json.dumps(response.json())
