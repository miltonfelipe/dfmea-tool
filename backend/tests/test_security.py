import time

import jwt
import pytest
from fastapi.testclient import TestClient

from app import cli
from app.config import Settings
from app.main import create_app
from app.ratelimit import FailureLimiter

SECRET = "test-secret-key-at-least-32-bytes-long"


def _creds(u, p):
    return {"username": u, "password": p}


# ── Demo accounts ──────────────────────────────────────────────────────────

def test_demo_users_are_not_created_by_default(monkeypatch):
    monkeypatch.delenv("DFMEA_SEED_DEMO_USERS", raising=False)
    settings = Settings(database_url="sqlite://", secret_key=SECRET, static_dir="/nonexistent")
    assert settings.seed_demo_users is False
    with TestClient(create_app(settings)) as c:
        assert c.post("/api/auth/login", json=_creds("alex", "pm123")).status_code == 401


# ── Login brute force ──────────────────────────────────────────────────────

def test_login_locks_after_repeated_failures(client):
    for _ in range(5):
        assert client.post("/api/auth/login", json=_creds("alex", "wrong")).status_code == 401
    r = client.post("/api/auth/login", json=_creds("alex", "pm123"))  # even the right password
    assert r.status_code == 429
    assert int(r.headers["Retry-After"]) > 0
    assert "Try again in" in r.json()["detail"]
    # Other accounts from the same client still work (per-IP limit is higher).
    assert client.post("/api/auth/login", json=_creds("sofia", "rv123")).status_code == 200


def test_lockout_is_case_insensitive(client):
    for name in ("alex", "ALEX", "Alex", "aLeX", "alex "):
        client.post("/api/auth/login", json=_creds(name, "wrong"))
    assert client.post("/api/auth/login", json=_creds("alex", "pm123")).status_code == 429


def test_per_ip_limit_across_usernames(client):
    for i in range(20):  # 4x the per-user limit, spread over usernames
        client.post("/api/auth/login", json=_creds(f"nobody{i}", "x"))
    assert client.post("/api/auth/login", json=_creds("sofia", "rv123")).status_code == 429


def test_success_resets_user_failures(client):
    for _ in range(4):
        client.post("/api/auth/login", json=_creds("alex", "wrong"))
    assert client.post("/api/auth/login", json=_creds("alex", "pm123")).status_code == 200
    for _ in range(4):
        client.post("/api/auth/login", json=_creds("alex", "wrong"))
    assert client.post("/api/auth/login", json=_creds("alex", "pm123")).status_code == 200


def test_limiter_window_expires():
    now = [1000.0]
    lim = FailureLimiter(max_failures=2, window_seconds=60, clock=lambda: now[0])
    lim.failure("k"); lim.failure("k")
    assert lim.retry_after("k") == 61
    now[0] += 30
    assert lim.retry_after("k") == 31
    now[0] += 31
    assert lim.retry_after("k") is None


def test_unknown_user_takes_about_as_long_as_wrong_password(client):
    # Unknown usernames still run a password hash check (no fast path).
    def timed(u):
        t = time.perf_counter()
        client.post("/api/auth/login", json=_creds(u, "wrong-password"))
        return time.perf_counter() - t
    known = min(timed("alex") for _ in range(2))
    unknown = min(timed(f"ghost{i}") for i in range(2))
    assert unknown > known * 0.5


def test_inactive_user_gets_generic_error(client, pm):
    sofia = next(u for u in client.get("/api/users", headers=pm).json() if u["username"] == "sofia")
    client.patch(f"/api/users/{sofia['id']}", json={"active": False}, headers=pm)
    r = client.post("/api/auth/login", json=_creds("sofia", "rv123"))
    assert r.status_code == 401 and r.json()["detail"] == "Invalid username or password"


# ── Usernames ──────────────────────────────────────────────────────────────

def test_usernames_are_case_insensitive(client, pm):
    assert client.post("/api/auth/login", json=_creds("ALEX", "pm123")).status_code == 200
    r = client.post("/api/users", json={"name": "Imposter", "username": "Alex", "password": "secret12"},
                    headers=pm)
    assert r.status_code == 409
    r = client.post("/api/users", json={"name": "Dana", "username": "Dana", "password": "secret12"}, headers=pm)
    assert r.status_code == 201 and r.json()["username"] == "dana"


# ── Sessions / password changes ────────────────────────────────────────────

def test_change_own_password(client, rv):
    r = client.post("/api/auth/password", json={"currentPassword": "rv123", "newPassword": "new-pass-123"},
                    headers=rv)
    assert r.status_code == 200
    new_headers = {"Authorization": f"Bearer {r.json()['accessToken']}"}
    assert client.get("/api/auth/me", headers=rv).status_code == 401           # old session ended
    assert client.get("/api/auth/me", headers=new_headers).status_code == 200  # this one continues
    assert client.post("/api/auth/login", json=_creds("sofia", "rv123")).status_code == 401
    assert client.post("/api/auth/login", json=_creds("sofia", "new-pass-123")).status_code == 200


def test_change_password_checks_current_and_policy(client, rv):
    def change(cur, new):
        return client.post("/api/auth/password", json={"currentPassword": cur, "newPassword": new}, headers=rv)
    assert change("wrong", "new-pass-123").status_code == 400
    assert change("rv123", "short").status_code == 422
    assert change("rv123", "x" * 129).status_code == 422
    assert client.get("/api/auth/me", headers=rv).status_code == 200  # nothing changed


def test_change_password_is_rate_limited(client, rv):
    for _ in range(5):
        client.post("/api/auth/password", json={"currentPassword": "wrong", "newPassword": "new-pass-123"},
                    headers=rv)
    r = client.post("/api/auth/password", json={"currentPassword": "rv123", "newPassword": "new-pass-123"},
                    headers=rv)
    assert r.status_code == 429


def test_pm_password_reset_ends_users_sessions(client, pm, rv):
    sofia = client.get("/api/auth/me", headers=rv).json()
    assert client.patch(f"/api/users/{sofia['id']}", json={"password": "reset-pass-1"}, headers=pm).status_code == 200
    assert client.get("/api/auth/me", headers=rv).status_code == 401


def test_tokens_need_exp_and_password_claim(client):
    me = client.post("/api/auth/login", json=_creds("alex", "pm123")).json()["user"]
    for claims in ({"sub": me["id"]}, {"sub": me["id"], "exp": 9999999999}):
        token = jwt.encode(claims, SECRET, algorithm="HS256")
        assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_null_fields_in_user_update_are_ignored(client, pm):
    bruno = next(u for u in client.get("/api/users", headers=pm).json() if u["username"] == "bruno")
    r = client.patch(f"/api/users/{bruno['id']}", json={"name": None, "color": None}, headers=pm)
    assert r.status_code == 200 and r.json()["name"] == "Bruno Costa"


def test_color_must_be_hex(client, pm):
    r = client.post("/api/users", json={"name": "C", "username": "c", "password": "secret12",
                                        "color": "red;background:url(x)"}, headers=pm)
    assert r.status_code == 422


# ── Input limits ───────────────────────────────────────────────────────────

def test_text_length_limits(client, pm, demo_project):
    pid, eid = demo_project["id"], demo_project["entries"][0]["id"]
    assert client.post(f"/api/projects/{pid}/entries", json={"component": "x" * 201}, headers=pm).status_code == 422
    assert client.post(f"/api/projects/{pid}/entries", json={"action": "x" * 5000}, headers=pm).status_code == 201
    assert client.patch(f"/api/entries/{eid}", json={"version": 1, "controls": "x" * 5001},
                        headers=pm).status_code == 422
    assert client.post(f"/api/entries/{eid}/comments", json={"text": "x" * 5001}, headers=pm).status_code == 422
    assert client.post("/api/projects", json={"name": "x" * 201}, headers=pm).status_code == 422


def test_diagram_size_limit(client, pm, demo_project):
    pid = demo_project["id"]
    r = client.put(f"/api/projects/{pid}/diagram", json={"nodes": [{"id": str(i)} for i in range(501)]},
                   headers=pm)
    assert r.status_code == 422


def test_request_body_size_limit():
    settings = Settings(database_url="sqlite://", secret_key=SECRET, seed_demo_users=True,
                        static_dir="/nonexistent", max_body_bytes=1000)
    with TestClient(create_app(settings)) as c:
        r = c.post("/api/auth/login", content=b'{"username":"' + b"a" * 2000 + b'"}',
                   headers={"content-type": "application/json"})
        assert r.status_code == 413

        def chunks():  # no Content-Length header
            yield b'{"username":"'
            yield b"a" * 2000
            yield b'","password":"x"}'
        r = c.post("/api/auth/login", content=chunks(), headers={"content-type": "application/json"})
        assert r.status_code == 413
        assert c.post("/api/auth/login", json=_creds("alex", "pm123")).status_code == 200


# ── Headers ────────────────────────────────────────────────────────────────

def test_security_headers_on_api(client):
    h = client.get("/api/health").headers
    assert h["x-content-type-options"] == "nosniff"
    assert h["x-frame-options"] == "DENY"
    assert h["referrer-policy"] == "no-referrer"
    assert h["cache-control"] == "no-store"
    assert "frame-ancestors 'none'" in h["content-security-policy"]


def test_csp_on_frontend_but_not_docs(tmp_path):
    (tmp_path / "index.html").write_text("<!doctype html><title>x</title>")
    settings = Settings(database_url="sqlite://", secret_key=SECRET, static_dir=str(tmp_path))
    with TestClient(create_app(settings)) as c:
        page = c.get("/")
        assert page.status_code == 200
        assert "script-src 'self'" in page.headers["content-security-policy"]
        assert "cache-control" not in page.headers
        assert "content-security-policy" not in c.get("/docs").headers


# ── CLI ────────────────────────────────────────────────────────────────────

def test_cli_create_user_and_reset_password(tmp_path, monkeypatch, capsys):
    db_url = f"sqlite:///{tmp_path / 'cli.db'}"
    monkeypatch.setenv("DFMEA_DATABASE_URL", db_url)
    monkeypatch.setenv("DFMEA_NEW_PASSWORD", "first-pass-1")
    cli.main(["create-user", "--username", "Admin", "--name", "Ada Admin", "--role", "PM"])
    assert "Created PM 'admin'" in capsys.readouterr().out
    with pytest.raises(SystemExit, match="already exists"):
        cli.main(["create-user", "--username", "admin"])
    monkeypatch.setenv("DFMEA_NEW_PASSWORD", "short")
    with pytest.raises(SystemExit, match="at least 8"):
        cli.main(["reset-password", "--username", "admin"])
    monkeypatch.setenv("DFMEA_NEW_PASSWORD", "second-pass-2")
    cli.main(["reset-password", "--username", "admin"])

    settings = Settings(database_url=db_url, secret_key=SECRET, static_dir="/nonexistent")
    with TestClient(create_app(settings)) as c:
        assert c.post("/api/auth/login", json=_creds("admin", "first-pass-1")).status_code == 401
        r = c.post("/api/auth/login", json=_creds("admin", "second-pass-2"))
        assert r.status_code == 200 and r.json()["user"]["role"] == "PM"
