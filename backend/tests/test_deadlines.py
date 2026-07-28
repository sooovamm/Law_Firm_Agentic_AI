"""Sprint 7 tests: court deadline extraction, dedup, CRUD, buckets, calendar."""
import os
from datetime import UTC, datetime, timedelta

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_32_chars_long_xx")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.ai.base import ChatMessage
from app.database.base import Base
from app.database.session import get_db
from app.deadlines.ai_schemas import DeadlineExtraction, ExtractedDeadline
from app.deadlines.enums import DeadlineSource
from app.deadlines.service import DeadlineService
from app.main import app

FUTURE = (datetime.now(UTC) + timedelta(days=10)).date().isoformat()
SOON = (datetime.now(UTC) + timedelta(days=2)).date().isoformat()
PAST = (datetime.now(UTC) - timedelta(days=5)).date().isoformat()


class FakeLLM:
    """Returns a fixed set of candidate deadlines including a past one."""

    def complete(self, messages: list[ChatMessage]) -> str:
        return ""

    def structured(self, messages: list[ChatMessage], schema):
        if schema is DeadlineExtraction:
            return DeadlineExtraction(
                deadlines=[
                    ExtractedDeadline(
                        title="Motion to dismiss hearing",
                        deadline_type="hearing",
                        due_date=FUTURE,
                        priority="high",
                    ),
                    ExtractedDeadline(
                        title="File response brief",
                        deadline_type="filing",
                        due_date=SOON,
                        priority="critical",
                    ),
                    ExtractedDeadline(
                        title="Old passed date",
                        deadline_type="other",
                        due_date=PAST,
                        priority="low",
                    ),
                    ExtractedDeadline(
                        title="Vague no date",
                        deadline_type="other",
                        due_date=None,
                        priority="low",
                    ),
                ]
            )
        raise AssertionError(f"Unexpected schema {schema}")


@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    yield TestSession


@pytest.fixture
def client(db_session):
    def override_get_db():
        db = db_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _admin(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "a@x.com", "full_name": "Ada Admin", "password": "password123", "role": "admin"},
    )
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


def _case(client, h):
    cid = client.post("/api/v1/clients", headers=h, json={"full_name": "Acme"}).json()["id"]
    return client.post(
        "/api/v1/cases", headers=h, json={"title": "Acme Matter", "practice_area": "litigation", "client_id": cid}
    ).json()["id"]


def test_manual_crud(client):
    h = _admin(client)
    case_id = _case(client, h)

    r = client.post(
        "/api/v1/deadlines",
        headers=h,
        json={"title": "File answer", "due_date": f"{FUTURE}T09:00:00+00:00", "case_id": case_id, "deadline_type": "filing", "priority": "high"},
    )
    assert r.status_code == 201
    did = r.json()["id"]
    assert r.json()["completed"] is False

    # Mark completed.
    patched = client.patch(f"/api/v1/deadlines/{did}", headers=h, json={"completed": True})
    assert patched.status_code == 200 and patched.json()["completed"] is True

    # Delete.
    assert client.delete(f"/api/v1/deadlines/{did}", headers=h).status_code == 200
    assert client.get(f"/api/v1/deadlines/{did}", headers=h).status_code == 404


def test_manual_create_dedupes(client):
    h = _admin(client)
    case_id = _case(client, h)
    body = {"title": "File answer", "due_date": f"{FUTURE}T09:00:00+00:00", "case_id": case_id, "deadline_type": "filing"}
    first = client.post("/api/v1/deadlines", headers=h, json=body).json()
    second = client.post("/api/v1/deadlines", headers=h, json=body).json()
    # Same identifying fields -> same deadline returned, not a duplicate.
    assert first["id"] == second["id"]
    allrows = client.get("/api/v1/deadlines", headers=h, params={"case_id": case_id}).json()
    assert len(allrows) == 1


def test_extraction_validates_and_dedupes(client, db_session):
    h = _admin(client)
    case_id = _case(client, h)

    db = db_session()
    svc = DeadlineService(db, FakeLLM())
    created = svc.extract_from_source(
        source_text="Some legal text with dates",
        case_id=case_id,
        source=DeadlineSource.DOCUMENT,
        source_reference="document:1",
    )
    # 4 candidates -> 2 valid (past date + dateless are dropped by validation).
    assert len(created) == 2
    titles = {d.title for d in created}
    assert "Motion to dismiss hearing" in titles and "File response brief" in titles

    # Running the same extraction again creates nothing new (dedup).
    again = svc.extract_from_source(
        source_text="Some legal text with dates",
        case_id=case_id,
        source=DeadlineSource.DOCUMENT,
        source_reference="document:1",
    )
    assert len(again) == 0
    db.close()

    # Both surfaced via the API.
    rows = client.get("/api/v1/deadlines", headers=h, params={"case_id": case_id}).json()
    assert len(rows) == 2


def test_buckets_overdue_today_upcoming(client, db_session):
    h = _admin(client)
    case_id = _case(client, h)

    now = datetime.now(UTC)
    # Overdue (create then patch date into the past to bypass past-date guards).
    od = client.post("/api/v1/deadlines", headers=h, json={"title": "Overdue item", "due_date": f"{FUTURE}T09:00:00+00:00", "case_id": case_id}).json()
    client.patch(f"/api/v1/deadlines/{od['id']}", headers=h, json={"due_date": (now - timedelta(days=1)).isoformat()})
    # Today.
    today_dt = now.replace(hour=15, minute=0, second=0, microsecond=0)
    client.post("/api/v1/deadlines", headers=h, json={"title": "Today item", "due_date": today_dt.isoformat(), "case_id": case_id})
    # Upcoming.
    client.post("/api/v1/deadlines", headers=h, json={"title": "Upcoming item", "due_date": (now + timedelta(days=5)).isoformat(), "case_id": case_id})

    b = client.get("/api/v1/deadlines/buckets", headers=h).json()
    assert any(d["title"] == "Overdue item" for d in b["overdue"])
    assert any(d["title"] == "Today item" for d in b["today"])
    assert any(d["title"] == "Upcoming item" for d in b["upcoming"])


def test_calendar_range(client):
    h = _admin(client)
    case_id = _case(client, h)
    now = datetime.now(UTC)
    client.post("/api/v1/deadlines", headers=h, json={"title": "In range", "due_date": (now + timedelta(days=3)).isoformat(), "case_id": case_id})
    client.post("/api/v1/deadlines", headers=h, json={"title": "Out of range", "due_date": (now + timedelta(days=60)).isoformat(), "case_id": case_id})

    start = now.isoformat()
    end = (now + timedelta(days=30)).isoformat()
    rows = client.get("/api/v1/deadlines/calendar", headers=h, params={"start": start, "end": end}).json()
    titles = {d["title"] for d in rows}
    assert "In range" in titles and "Out of range" not in titles


def test_requires_auth(client):
    assert client.get("/api/v1/deadlines").status_code == 401
