import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def client():
    settings = Settings(database_url="sqlite://", secret_key="test-secret-key-at-least-32-bytes-long",
                        seed_demo_users=True, static_dir="/nonexistent")
    with TestClient(create_app(settings)) as c:
        yield c


def _login(client, username, password):
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['accessToken']}"}


@pytest.fixture
def pm(client):
    return _login(client, "alex", "pm123")


@pytest.fixture
def rv(client):
    return _login(client, "sofia", "rv123")


@pytest.fixture
def login(client):
    return lambda u, p: _login(client, u, p)


@pytest.fixture
def demo_project(client, pm):
    r = client.post("/api/projects", json={"name": "Demo", "demo": True}, headers=pm)
    assert r.status_code == 201, r.text
    return r.json()
