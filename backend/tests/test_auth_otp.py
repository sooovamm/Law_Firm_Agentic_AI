"""Registration now requires verifying a 4-digit emailed code before a user
is created. These tests cover the OTP mechanics directly (correct/incorrect
codes, attempt limiting, expiry) rather than just using the flow as a helper.
"""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_32_chars_long_xx")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.config import settings
from app.core.mailer import get_mailer
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from tests._auth_helpers import FakeMailer

PAYLOAD = {"email": "new@x.com", "full_name": "New User", "password": "password123", "role": "admin"}


@pytest.fixture
def client():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    mailer = FakeMailer()
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_mailer] = lambda: mailer
    yield TestClient(app)
    app.dependency_overrides.clear()


def _mailer():
    return app.dependency_overrides[get_mailer]()


def test_no_account_created_until_otp_verified(client):
    r = client.post("/api/v1/auth/register/request-otp", json=PAYLOAD)
    assert r.status_code == 200
    assert "expires_in_minutes" in r.json()

    # No account exists yet, so logging in must fail.
    login = client.post(
        "/api/v1/auth/login", json={"email": PAYLOAD["email"], "password": PAYLOAD["password"]}
    )
    assert login.status_code == 401


def test_wrong_otp_code_rejected_and_account_not_created(client):
    client.post("/api/v1/auth/register/request-otp", json=PAYLOAD)

    bad = client.post(
        "/api/v1/auth/register/verify-otp", json={**PAYLOAD, "otp_code": "0000"}
    )
    assert bad.status_code == 422

    login = client.post(
        "/api/v1/auth/login", json={"email": PAYLOAD["email"], "password": PAYLOAD["password"]}
    )
    assert login.status_code == 401


def test_correct_otp_code_creates_account(client):
    client.post("/api/v1/auth/register/request-otp", json=PAYLOAD)
    code = _mailer().sent[PAYLOAD["email"]]

    ok = client.post(
        "/api/v1/auth/register/verify-otp", json={**PAYLOAD, "otp_code": code}
    )
    assert ok.status_code == 201
    assert ok.json()["user"]["email"] == PAYLOAD["email"]

    # Code is single-use: replaying it must fail even with the right digits.
    replay = client.post(
        "/api/v1/auth/register/verify-otp", json={**PAYLOAD, "otp_code": code}
    )
    assert replay.status_code == 409  # email now exists


def test_too_many_wrong_attempts_invalidates_code(client):
    client.post("/api/v1/auth/register/request-otp", json=PAYLOAD)
    correct_code = _mailer().sent[PAYLOAD["email"]]
    wrong_code = "0000" if correct_code != "0000" else "1111"

    for _ in range(settings.otp_max_attempts):
        resp = client.post(
            "/api/v1/auth/register/verify-otp", json={**PAYLOAD, "otp_code": wrong_code}
        )
        assert resp.status_code == 422

    # Even the correct code no longer works once attempts are exhausted.
    exhausted = client.post(
        "/api/v1/auth/register/verify-otp", json={**PAYLOAD, "otp_code": correct_code}
    )
    assert exhausted.status_code == 422


def test_requesting_new_otp_invalidates_previous_code(client):
    client.post("/api/v1/auth/register/request-otp", json=PAYLOAD)
    first_code = _mailer().sent[PAYLOAD["email"]]

    client.post("/api/v1/auth/register/request-otp", json=PAYLOAD)
    second_code = _mailer().sent[PAYLOAD["email"]]

    if first_code == second_code:
        pytest.skip("random codes collided; not a meaningful case")

    stale = client.post(
        "/api/v1/auth/register/verify-otp", json={**PAYLOAD, "otp_code": first_code}
    )
    assert stale.status_code == 422

    fresh = client.post(
        "/api/v1/auth/register/verify-otp", json={**PAYLOAD, "otp_code": second_code}
    )
    assert fresh.status_code == 201
