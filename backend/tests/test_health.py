from app.config import Settings, get_settings, load_settings
from app.main import create_app
from fastapi.testclient import TestClient


def test_health_ok(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "SYNEX AI"
    assert body["ai"]["provider"] == "gemini"
    assert body["ai"]["model"]  # the model comes from configuration and is reported
    assert body["ai"]["configured"] is False  # no key in the test environment
    assert set(body["ai"]) == {"provider", "supported", "configured", "model", "timeoutSeconds"}


def test_health_never_exposes_api_key(monkeypatch):
    secret = "super-secret-test-key-123"
    monkeypatch.setenv("GEMINI_API_KEY", secret)
    get_settings.cache_clear()
    client = TestClient(create_app())
    res = client.get("/api/health")
    assert res.json()["ai"]["configured"] is True
    assert secret not in res.text
    get_settings.cache_clear()


def test_placeholder_key_is_not_configured():
    assert Settings(gemini_api_key="your_key_here").ai_configured is False
    assert Settings(gemini_api_key=None).ai_configured is False


def test_settings_repr_hides_key():
    assert "abc123" not in repr(Settings(gemini_api_key="abc123"))


def test_cors_origins_parsed(monkeypatch):
    monkeypatch.setenv("CORS_ORIGINS", "http://a.test, http://b.test ,")
    assert load_settings().cors_origins == ("http://a.test", "http://b.test")


def test_unknown_route_uses_error_envelope(client):
    res = client.get("/api/does-not-exist")
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "not_found"


def test_method_not_allowed_uses_error_envelope(client):
    res = client.post("/api/health")
    assert res.status_code == 405
    assert "error" in res.json()


def test_cors_allows_frontend_origin(client):
    res = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "GET"},
    )
    assert res.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_cors_rejects_unknown_origin(client):
    res = client.get("/api/health", headers={"Origin": "http://evil.test"})
    assert "access-control-allow-origin" not in res.headers
