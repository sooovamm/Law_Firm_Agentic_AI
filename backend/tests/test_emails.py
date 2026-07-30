"""Sprint 6 tests: email intelligence agent pipeline, attach, reply, search."""
import os
from datetime import UTC, datetime

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_32_chars_long_xx")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.ai.base import ChatMessage
from app.api.v1.emails import get_llm
from app.core.mailer import get_mailer
from app.database.base import Base
from app.database.session import get_db
from app.email_agent.ai_schemas import (
    CaseIdentification,
    ClientIdentification,
    DeadlineDetection,
    DraftReply,
    EmailSummary,
    ExtractedDeadline,
    ExtractedTask,
    TaskExtraction,
    UrgencyAssessment,
)
from app.email_agent.enums import EmailUrgency
from app.main import app
from tests._auth_helpers import FakeMailer, register_via_otp


class FakeLLM:
    """Scripted client returning a fixed extraction for each schema."""

    def complete(self, messages: list[ChatMessage]) -> str:
        return ""

    def structured(self, messages: list[ChatMessage], schema):
        if schema is ClientIdentification:
            # Echo a known client name so the loose matcher can resolve it.
            return ClientIdentification(client_name="Dana Client", matched=True, rationale="sender")
        if schema is CaseIdentification:
            return CaseIdentification(case_reference="Dana v. Acme", matched=True, rationale="subject")
        if schema is EmailSummary:
            return EmailSummary(summary="Client asks to reschedule the deposition and sends documents.")
        if schema is TaskExtraction:
            return TaskExtraction(tasks=[ExtractedTask(description="Reschedule deposition", owner="paralegal")])
        if schema is DeadlineDetection:
            return DeadlineDetection(deadlines=[ExtractedDeadline(description="File response", due_date="2026-08-15")])
        if schema is UrgencyAssessment:
            return UrgencyAssessment(urgency=EmailUrgency.HIGH, rationale="Imminent deadline")
        if schema is DraftReply:
            return DraftReply(subject="Re: Deposition", body="Thank you for your email. We will follow up shortly.")
        raise AssertionError(f"Unexpected schema {schema}")


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
    app.dependency_overrides[get_llm] = lambda: FakeLLM()
    app.dependency_overrides[get_mailer] = lambda: mailer
    yield TestClient(app)
    app.dependency_overrides.clear()


def _admin(client):
    mailer = app.dependency_overrides[get_mailer]()
    data = register_via_otp(client, mailer, "a@x.com", role="admin", full_name="Ada Admin")
    return {"Authorization": f"Bearer {data['tokens']['access_token']}"}


def _seed_client_and_case(client, h):
    cid = client.post(
        "/api/v1/clients", headers=h, json={"full_name": "Dana Client", "email": "dana@example.com"}
    ).json()["id"]
    case = client.post(
        "/api/v1/cases",
        headers=h,
        json={"title": "Dana v. Acme", "practice_area": "litigation", "client_id": cid},
    ).json()
    return cid, case["id"]


def _ingest(client, h, **overrides):
    payload = {
        "provider": "gmail",
        "sender": "dana@example.com",
        "receiver": "firm@example.com",
        "subject": "Deposition scheduling for Dana v. Acme",
        "body": "Hi, can we reschedule the deposition? Also I need to file a response by Aug 15.",
        "external_id": "msg-1",
    }
    payload.update(overrides)
    return client.post("/api/v1/emails/ingest", headers=h, json=payload)


def test_ingest_runs_full_pipeline(client):
    h = _admin(client)
    _seed_client_and_case(client, h)

    r = _ingest(client, h)
    assert r.status_code == 201
    data = r.json()

    assert data["status"] == "processed"
    assert data["summary"].startswith("Client asks to reschedule")
    assert data["urgency"] == "high"
    assert len(data["tasks"]) == 1 and data["tasks"][0]["description"] == "Reschedule deposition"
    assert len(data["deadlines"]) == 1 and data["deadlines"][0]["due_date"] == "2026-08-15"
    assert data["draft_reply"].startswith("Thank you")


def test_auto_attach_to_case_and_client(client):
    h = _admin(client)
    cid, case_id = _seed_client_and_case(client, h)

    data = _ingest(client, h).json()
    # Sender email matches the seeded client deterministically.
    assert data["client_id"] == cid
    # Agent matched the case by title.
    assert data["case_id"] == case_id
    assert data["case_title"] == "Dana v. Acme"


def test_ingest_dedupes_external_id(client):
    h = _admin(client)
    _seed_client_and_case(client, h)
    first = _ingest(client, h).json()
    second = _ingest(client, h).json()
    assert first["id"] == second["id"]


def test_list_and_search(client):
    h = _admin(client)
    _seed_client_and_case(client, h)
    _ingest(client, h)
    _ingest(client, h, external_id="msg-2", subject="Unrelated billing question",
            body="What is my invoice balance?")

    # List all.
    allrows = client.get("/api/v1/emails", headers=h).json()
    assert len(allrows) == 2

    # Search by subject keyword.
    found = client.get("/api/v1/emails", headers=h, params={"q": "billing"}).json()
    assert len(found) == 1 and "billing" in found[0]["subject"].lower()

    # Filter by urgency.
    high = client.get("/api/v1/emails", headers=h, params={"urgency": "high"}).json()
    assert len(high) == 2  # both scripted to HIGH


def test_reply_records_draft(client):
    h = _admin(client)
    _seed_client_and_case(client, h)
    email = _ingest(client, h).json()

    r = client.post(
        "/api/v1/emails/reply",
        headers=h,
        json={"email_id": email["id"], "body": "Happy to reschedule. Does Thursday work?"},
    )
    assert r.status_code == 200
    resp = r.json()
    # No provider token wired -> recorded as a draft, subject defaults to Re:.
    assert resp["sent"] is False
    assert resp["channel"] == "draft"
    assert resp["subject"].lower().startswith("re:")

    # Email now marked replied.
    detail = client.get(f"/api/v1/emails/{email['id']}", headers=h).json()
    assert detail["status"] == "replied"


def test_requires_auth(client):
    assert client.get("/api/v1/emails").status_code == 401
