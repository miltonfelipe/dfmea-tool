def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_login_returns_token_and_user(client):
    r = client.post("/api/auth/login", json={"username": "alex", "password": "pm123"})
    assert r.status_code == 200
    body = r.json()
    assert body["tokenType"] == "bearer"
    assert body["user"]["username"] == "alex" and body["user"]["role"] == "PM"
    assert "passwordHash" not in body["user"] and "password" not in body["user"]


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"username": "alex", "password": "nope"})
    assert r.status_code == 401


def test_me_requires_valid_token(client, pm):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer junk"}).status_code == 401
    assert client.get("/api/auth/me", headers=pm).json()["username"] == "alex"


def test_list_users_hides_password_hashes(client, rv):
    users = client.get("/api/users", headers=rv).json()
    assert {u["username"] for u in users} == {"alex", "sofia", "bruno"}
    assert all(set(u) == {"id", "name", "username", "role", "color", "active"} for u in users)


def test_reviewer_cannot_manage_users(client, rv):
    r = client.post("/api/users", json={"name": "X", "username": "x", "password": "secret1"}, headers=rv)
    assert r.status_code == 403


def test_pm_creates_user_who_can_log_in(client, pm, login):
    r = client.post("/api/users", json={"name": "Test Reviewer", "username": "tester",
                                        "password": "secret1", "role": "RV"}, headers=pm)
    assert r.status_code == 201
    assert client.get("/api/auth/me", headers=login("tester", "secret1")).json()["name"] == "Test Reviewer"


def test_duplicate_username_conflicts(client, pm):
    r = client.post("/api/users", json={"name": "A", "username": "alex", "password": "secret1"}, headers=pm)
    assert r.status_code == 409


def test_short_password_rejected(client, pm):
    r = client.post("/api/users", json={"name": "A", "username": "a", "password": "123"}, headers=pm)
    assert r.status_code == 422


def test_deactivated_user_loses_access(client, pm, rv):
    sofia = next(u for u in client.get("/api/users", headers=pm).json() if u["username"] == "sofia")
    assert client.patch(f"/api/users/{sofia['id']}", json={"active": False}, headers=pm).status_code == 200
    assert client.get("/api/auth/me", headers=rv).status_code == 401  # existing token rejected
    r = client.post("/api/auth/login", json={"username": "sofia", "password": "rv123"})
    assert r.status_code == 401


def test_password_change(client, pm, login):
    bruno = next(u for u in client.get("/api/users", headers=pm).json() if u["username"] == "bruno")
    client.patch(f"/api/users/{bruno['id']}", json={"password": "newpass1"}, headers=pm)
    assert client.post("/api/auth/login", json={"username": "bruno", "password": "rv456"}).status_code == 401
    login("bruno", "newpass1")


def test_pm_cannot_deactivate_or_demote_self(client, pm):
    me = client.get("/api/auth/me", headers=pm).json()
    assert client.patch(f"/api/users/{me['id']}", json={"active": False}, headers=pm).status_code == 400
    assert client.patch(f"/api/users/{me['id']}", json={"role": "RV"}, headers=pm).status_code == 400
    assert client.patch(f"/api/users/{me['id']}", json={"color": "#ff0000"}, headers=pm).status_code == 200
