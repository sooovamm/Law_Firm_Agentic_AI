"""Lawyer onboarding tests: draft autosave, validation, admin filters, permissions.

All data is created through the API and read back, matching the convention in
tests/test_dashboard.py.
"""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_32_chars_long_xx")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.mailer import get_mailer
from app.database.base import Base
from app.database.session import get_db
from app.main import app
from tests._auth_helpers import FakeMailer, register_via_otp


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


def _register(client, email, role, full_name=None):
    mailer = app.dependency_overrides[get_mailer]()
    data = register_via_otp(client, mailer, email, role=role, full_name=full_name or email)
    return data["user"]["id"], {"Authorization": f"Bearer {data['tokens']['access_token']}"}


_VALID_PAYLOAD = {
    "years_of_experience": 8,
    "languages_spoken": ["English", "Spanish"],
    "primary_practice_area": "employment",
    "bar_registration_number": "BAR-001",
}


def test_draft_autosave_is_partial_and_lenient(client):
    _, h = _register(client, "lawyer@x.com", "lawyer")

    r = client.put("/api/v1/lawyers/me", headers=h, json={"years_of_experience": 5})
    assert r.status_code == 200, r.text
    assert r.json()["years_of_experience"] == 5
    assert r.json()["onboarding_completed"] is False

    status = client.get("/api/v1/lawyers/me/status", headers=h)
    assert status.json() == {"has_profile": True, "onboarding_completed": False}


def test_cases_won_cannot_exceed_total(client):
    _, h = _register(client, "lawyer@x.com", "lawyer")
    r = client.put(
        "/api/v1/lawyers/me",
        headers=h,
        json={"total_cases_handled": 5, "total_cases_won": 10},
    )
    assert r.status_code == 422


def test_cases_lost_cannot_exceed_total(client):
    _, h = _register(client, "lawyer@x.com", "lawyer")
    r = client.put(
        "/api/v1/lawyers/me",
        headers=h,
        json={"total_cases_handled": 5, "total_cases_lost": 6},
    )
    assert r.status_code == 422


def test_years_of_experience_must_be_realistic(client):
    _, h = _register(client, "lawyer@x.com", "lawyer")
    r = client.put("/api/v1/lawyers/me", headers=h, json={"years_of_experience": 200})
    assert r.status_code == 422


def test_complete_onboarding_requires_bar_number_languages_and_area(client):
    _, h = _register(client, "lawyer@x.com", "lawyer")
    r = client.post("/api/v1/lawyers/me/complete", headers=h, json={"years_of_experience": 5})
    assert r.status_code == 422
    assert "Bar registration" in r.json()["detail"]
    assert "language" in r.json()["detail"]
    assert "practice area" in r.json()["detail"]


def test_complete_onboarding_success_computes_expertise_score(client):
    _, h = _register(client, "lawyer@x.com", "lawyer")
    client.put(
        "/api/v1/lawyers/me",
        headers=h,
        json={"total_cases_handled": 20, "total_cases_won": 15},
    )
    r = client.post("/api/v1/lawyers/me/complete", headers=h, json=_VALID_PAYLOAD)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["onboarding_completed"] is True
    assert body["expertise_score"] is not None
    assert body["confidence_score"] is not None
    assert body["languages_spoken"] == ["English", "Spanish"]


def test_admin_can_filter_lawyers_by_practice_area_and_experience(client):
    admin_id, admin_h = _register(client, "admin@x.com", "admin")
    _, lawyer_a_h = _register(client, "a@x.com", "lawyer", "Lawyer A")
    _, lawyer_b_h = _register(client, "b@x.com", "lawyer", "Lawyer B")

    client.post(
        "/api/v1/lawyers/me/complete",
        headers=lawyer_a_h,
        json={**_VALID_PAYLOAD, "primary_practice_area": "family", "years_of_experience": 3},
    )
    client.post(
        "/api/v1/lawyers/me/complete",
        headers=lawyer_b_h,
        json={**_VALID_PAYLOAD, "primary_practice_area": "employment", "years_of_experience": 12},
    )

    r = client.get("/api/v1/lawyers?practice_area=employment", headers=admin_h)
    assert r.status_code == 200
    names = [row["user"]["full_name"] for row in r.json()]
    assert names == ["Lawyer B"]

    r = client.get("/api/v1/lawyers?min_experience=10", headers=admin_h)
    assert [row["user"]["full_name"] for row in r.json()] == ["Lawyer B"]


def test_non_admin_cannot_list_lawyers(client):
    _, h = _register(client, "lawyer@x.com", "lawyer")
    r = client.get("/api/v1/lawyers", headers=h)
    assert r.status_code == 403


def test_accepting_clients_toggle_is_admin_only(client):
    lawyer_id, lawyer_h = _register(client, "lawyer@x.com", "lawyer")
    _, admin_h = _register(client, "admin@x.com", "admin")
    client.post("/api/v1/lawyers/me/complete", headers=lawyer_h, json=_VALID_PAYLOAD)

    forbidden = client.patch(
        f"/api/v1/lawyers/{lawyer_id}/accepting-clients",
        headers=lawyer_h,
        json={"accepts_new_clients": False},
    )
    assert forbidden.status_code == 403

    r = client.patch(
        f"/api/v1/lawyers/{lawyer_id}/accepting-clients",
        headers=admin_h,
        json={"accepts_new_clients": False},
    )
    assert r.status_code == 200
    assert r.json()["accepts_new_clients"] is False


def test_lawyer_cannot_view_another_lawyers_profile(client):
    lawyer_a_id, lawyer_a_h = _register(client, "a@x.com", "lawyer", "Lawyer A")
    _, lawyer_b_h = _register(client, "b@x.com", "lawyer", "Lawyer B")
    client.post("/api/v1/lawyers/me/complete", headers=lawyer_a_h, json=_VALID_PAYLOAD)

    forbidden = client.get(f"/api/v1/lawyers/{lawyer_a_id}", headers=lawyer_b_h)
    assert forbidden.status_code == 403

    ok = client.get(f"/api/v1/lawyers/{lawyer_a_id}", headers=lawyer_a_h)
    assert ok.status_code == 200
