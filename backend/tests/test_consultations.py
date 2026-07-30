"""Sprint 5 tests: consultation scheduling, overlap prevention, approval, dashboard."""
import os
from datetime import UTC, datetime, timedelta

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


def _register(client, email, role):
    mailer = app.dependency_overrides[get_mailer]()
    data = register_via_otp(client, mailer, email, role=role, full_name=f"{role.title()} {email[0]}")
    return data["user"]["id"], {"Authorization": f"Bearer {data['tokens']['access_token']}"}


def _future(hour_offset):
    base = datetime.now(UTC) + timedelta(days=1)
    return base.replace(hour=9, minute=0, second=0, microsecond=0) + timedelta(hours=hour_offset)


def test_book_and_prevent_overlap(client):
    lawyer_id, lawyer_h = _register(client, "lawyer@x.com", "lawyer")
    _, para_h = _register(client, "para@x.com", "paralegal")

    client_id = client.post("/api/v1/clients", headers=para_h, json={"full_name": "Acme", "email": "acme@x.com"}).json()["id"]

    t = _future(0).isoformat()
    r = client.post(
        "/api/v1/consultations",
        headers=para_h,
        json={"lawyer_id": lawyer_id, "client_id": client_id, "scheduled_time": t, "duration_minutes": 60},
    )
    assert r.status_code == 201
    assert r.json()["status"] == "pending"

    # Overlapping booking (same lawyer, 30 min later) should conflict.
    overlap = client.post(
        "/api/v1/consultations",
        headers=para_h,
        json={
            "lawyer_id": lawyer_id,
            "client_id": client_id,
            "scheduled_time": (_future(0) + timedelta(minutes=30)).isoformat(),
            "duration_minutes": 60,
        },
    )
    assert overlap.status_code == 409

    # Non-overlapping (2 hours later) should succeed.
    ok = client.post(
        "/api/v1/consultations",
        headers=para_h,
        json={"lawyer_id": lawyer_id, "scheduled_time": _future(2).isoformat(), "duration_minutes": 60},
    )
    assert ok.status_code == 201


def test_only_lawyer_can_approve(client):
    lawyer_id, lawyer_h = _register(client, "lawyer@x.com", "lawyer")
    _, para_h = _register(client, "para@x.com", "paralegal")

    cons = client.post(
        "/api/v1/consultations",
        headers=para_h,
        json={"lawyer_id": lawyer_id, "scheduled_time": _future(0).isoformat()},
    ).json()

    # Paralegal cannot confirm.
    denied = client.patch(
        f"/api/v1/consultations/{cons['id']}", headers=para_h, json={"status": "confirmed"}
    )
    assert denied.status_code == 403

    # Lawyer can confirm.
    approved = client.patch(
        f"/api/v1/consultations/{cons['id']}", headers=lawyer_h, json={"status": "confirmed"}
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "confirmed"


def test_reschedule_and_cancel(client):
    lawyer_id, lawyer_h = _register(client, "lawyer@x.com", "lawyer")

    cons = client.post(
        "/api/v1/consultations",
        headers=lawyer_h,
        json={"lawyer_id": lawyer_id, "scheduled_time": _future(0).isoformat()},
    ).json()

    # Reschedule to a new time.
    new_time = _future(3).isoformat()
    resc = client.patch(
        f"/api/v1/consultations/{cons['id']}", headers=lawyer_h, json={"scheduled_time": new_time}
    )
    assert resc.status_code == 200
    assert resc.json()["scheduled_time"].startswith(new_time[:16])

    # Cancel via DELETE.
    cancelled = client.delete(f"/api/v1/consultations/{cons['id']}", headers=lawyer_h)
    assert cancelled.status_code == 200
    got = client.get(f"/api/v1/consultations/{cons['id']}", headers=lawyer_h).json()
    assert got["status"] == "cancelled"

    # A cancelled slot no longer blocks a new booking at the same time.
    rebook = client.post(
        "/api/v1/consultations",
        headers=lawyer_h,
        json={"lawyer_id": lawyer_id, "scheduled_time": new_time},
    )
    assert rebook.status_code == 201


def test_availability_excludes_booked(client):
    lawyer_id, lawyer_h = _register(client, "lawyer@x.com", "lawyer")

    day = _future(0)
    client.post(
        "/api/v1/consultations",
        headers=lawyer_h,
        json={"lawyer_id": lawyer_id, "scheduled_time": day.isoformat(), "duration_minutes": 60},
    )

    avail = client.get(
        "/api/v1/consultations/availability",
        headers=lawyer_h,
        params={"lawyer_id": lawyer_id, "day": day.isoformat(), "duration_minutes": 60},
    )
    assert avail.status_code == 200
    slots = avail.json()["slots"]
    # The 9:00 slot is booked, so it must not appear.
    booked_start = day.replace(minute=0).isoformat()
    assert all(not s["start"].startswith(booked_start[:16]) for s in slots)
    # Business hours 9-17 with the 9:00 booked leaves several slots.
    assert len(slots) >= 5


def test_dashboard_counts_consultations(client):
    lawyer_id, lawyer_h = _register(client, "lawyer@x.com", "lawyer")

    # Schedule one today.
    today = datetime.now(UTC).replace(hour=14, minute=0, second=0, microsecond=0)
    client.post(
        "/api/v1/consultations",
        headers=lawyer_h,
        json={"lawyer_id": lawyer_id, "scheduled_time": today.isoformat()},
    )

    ov = client.get("/api/v1/dashboard/overview", headers=lawyer_h).json()
    assert ov["cards"]["todays_consultations"] >= 1
    assert len(ov["upcoming_consultations"]) >= 0  # key present


def test_consultation_requires_auth(client):
    assert client.post("/api/v1/consultations", json={"lawyer_id": 1, "scheduled_time": _future(0).isoformat()}).status_code == 401
