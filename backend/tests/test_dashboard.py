"""Sprint 4 tests: dashboard overview, case detail, notes, events, filters.

All data is created through the API and read back — nothing hardcoded.
"""
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


def _admin(client):
    mailer = app.dependency_overrides[get_mailer]()
    data = register_via_otp(client, mailer, "a@x.com", role="admin", full_name="Ada Admin")
    return {"Authorization": f"Bearer {data['tokens']['access_token']}"}, data["user"]["id"]


def _make_case(client, h, *, title="Matter", urgency="medium", status="open", lawyer_id=None):
    cid = client.post("/api/v1/clients", headers=h, json={"full_name": "Beta LLC"}).json()["id"]
    body = {"title": title, "practice_area": "family", "client_id": cid, "urgency": urgency, "status": status}
    if lawyer_id:
        body["assigned_lawyer_id"] = lawyer_id
    return client.post("/api/v1/cases", headers=h, json=body).json()


def test_dashboard_overview_from_db(client):
    h, admin_id = _admin(client)

    _make_case(client, h, title="Open A", status="open")
    _make_case(client, h, title="Closed B", status="closed")
    urgent = _make_case(client, h, title="Urgent C", urgency="critical", status="open")

    # Add a real consultation today (Sprint 5: the canonical source for the
    # today's-consultations card) and a hearing event next week.
    today = datetime.now(UTC).replace(hour=10, minute=0, second=0, microsecond=0)
    client.post(
        "/api/v1/consultations",
        headers=h,
        json={"lawyer_id": admin_id, "scheduled_time": today.isoformat()},
    )
    next_week = (datetime.now(UTC) + timedelta(days=7)).isoformat()
    client.post(
        f"/api/v1/cases/{urgent['id']}/events",
        headers=h,
        json={"event_type": "hearing", "title": "Motion hearing", "scheduled_at": next_week},
    )

    ov = client.get("/api/v1/dashboard/overview", headers=h)
    assert ov.status_code == 200
    data = ov.json()

    # Cards reflect real counts.
    assert data["cards"]["open_cases"] == 2
    assert data["cards"]["closed_cases"] == 1
    assert data["cards"]["new_clients"] >= 3
    assert data["cards"]["todays_consultations"] == 1

    # Charts derived from DB grouping.
    assert any(p["label"] == "family" for p in data["charts"]["cases_by_practice_area"])
    assert any(p["label"] == "open" for p in data["charts"]["cases_by_status"])

    # Urgent cases surfaced.
    assert any(c["title"] == "Urgent C" for c in data["urgent_cases"])

    # Upcoming events include the hearing.
    assert any(e["event_type"] == "hearing" for e in data["upcoming_events"])

    # Activity feed populated by case creation.
    assert len(data["recent_activity"]) >= 3


def test_case_full_detail(client):
    h, admin_id = _admin(client)
    case = _make_case(client, h, title="Detail Case", lawyer_id=admin_id)

    client.post(
        f"/api/v1/cases/{case['id']}/notes",
        headers=h,
        json={"content": "Client called about scheduling."},
    )
    client.post(
        f"/api/v1/cases/{case['id']}/events",
        headers=h,
        json={
            "event_type": "meeting",
            "title": "Strategy meeting",
            "scheduled_at": datetime.now(UTC).isoformat(),
        },
    )

    detail = client.get(f"/api/v1/cases/{case['id']}/detail", headers=h)
    assert detail.status_code == 200
    d = detail.json()
    assert d["client"]["full_name"] == "Beta LLC"
    assert d["assigned_lawyer"]["id"] == admin_id
    assert len(d["notes"]) == 1
    assert len(d["events"]) == 1
    # Timeline aggregates case-created + note + event.
    kinds = {t["kind"] for t in d["timeline"]}
    assert {"case", "note", "event"}.issubset(kinds)


def test_case_filters(client):
    h, admin_id = _admin(client)
    _make_case(client, h, title="Alpha", urgency="low", status="open")
    _make_case(client, h, title="Beta", urgency="critical", status="closed")

    # Filter by status.
    closed = client.get("/api/v1/cases", headers=h, params={"status": "closed"}).json()
    assert all(c["status"] == "closed" for c in closed)

    # Filter by urgency.
    crit = client.get("/api/v1/cases", headers=h, params={"urgency": "critical"}).json()
    assert all(c["urgency"] == "critical" for c in crit)

    # Search by title.
    found = client.get("/api/v1/cases", headers=h, params={"q": "Alpha"}).json()
    assert any(c["title"] == "Alpha" for c in found)


def test_overview_requires_auth(client):
    assert client.get("/api/v1/dashboard/overview").status_code == 401
