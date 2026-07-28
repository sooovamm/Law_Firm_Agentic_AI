"""End-to-end API tests using an in-memory SQLite database."""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_32_chars_long_xx")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (register models on metadata)
from app.database.base import Base
from app.database.session import get_db
from app.main import app


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _register(client, email, role="admin"):
    resp = client.post(
        "/api/v1/auth/register",
        json={"email": email, "full_name": "Test", "password": "password123", "role": role},
    )
    assert resp.status_code == 201
    return resp.json()


def _auth_header(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_dashboard_requires_auth(client):
    assert client.get("/api/v1/dashboard/stats").status_code == 401


def test_register_login_refresh(client):
    data = _register(client, "a@x.com")
    assert data["user"]["role"] == "admin"

    login = client.post("/api/v1/auth/login", json={"email": "a@x.com", "password": "password123"})
    assert login.status_code == 200

    refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login.json()["tokens"]["refresh_token"]},
    )
    assert refresh.status_code == 200
    assert refresh.json()["access_token"]


def test_duplicate_email_conflict(client):
    _register(client, "a@x.com")
    dup = client.post(
        "/api/v1/auth/register",
        json={"email": "a@x.com", "full_name": "X", "password": "password123"},
    )
    assert dup.status_code == 409


def test_bad_login(client):
    _register(client, "a@x.com")
    resp = client.post("/api/v1/auth/login", json={"email": "a@x.com", "password": "nope"})
    assert resp.status_code == 401


def test_case_crud_and_dashboard(client):
    admin = _register(client, "a@x.com")
    h = _auth_header(admin["tokens"])

    client_id = client.post("/api/v1/clients", headers=h, json={"full_name": "Beta LLC"}).json()["id"]

    c1 = client.post(
        "/api/v1/cases",
        headers=h,
        json={"title": "Open matter", "practice_area": "family", "client_id": client_id},
    )
    assert c1.status_code == 201
    assert c1.json()["status"] == "open"
    assert c1.json()["client"]["full_name"] == "Beta LLC"

    client.post(
        "/api/v1/cases",
        headers=h,
        json={"title": "Done matter", "practice_area": "tax", "client_id": client_id, "status": "closed"},
    )

    stats = client.get("/api/v1/dashboard/stats", headers=h).json()
    assert stats == {"total_cases": 2, "open_cases": 1, "closed_cases": 1}


def test_rbac_paralegal_cannot_list_users(client):
    para = _register(client, "p@x.com", role="paralegal")
    h = _auth_header(para["tokens"])
    assert client.get("/api/v1/users", headers=h).status_code == 403


def test_case_invalid_client(client):
    admin = _register(client, "a@x.com")
    h = _auth_header(admin["tokens"])
    resp = client.post(
        "/api/v1/cases",
        headers=h,
        json={"title": "x", "practice_area": "tax", "client_id": 9999},
    )
    assert resp.status_code == 422
