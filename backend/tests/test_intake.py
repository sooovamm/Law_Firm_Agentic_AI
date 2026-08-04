"""End-to-end intake flow test using a scripted fake LLM client.

Verifies the LangGraph workflow, persistence, structured JSON output, and case
creation without calling OpenAI.
"""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_32_chars_long_xx")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.ai.base import ChatMessage
from app.api.v1.intake import get_llm
from app.conversations.ai_schemas import (
    InformationAssessment,
    IntakeSummary,
    LeadQualification,
    PracticeAreaDetection,
)
from app.conversations.enums import IntakePracticeArea, Urgency
from app.core.mailer import get_mailer
from app.database.base import Base
from app.database.session import get_db
from app.lawyers.ai_schemas import LawyerMatchResult
from app.main import app
from tests._auth_helpers import FakeMailer, register_via_otp


class FakeLLM:
    """Scripted client. Advances info collection until enough user turns."""

    def __init__(self) -> None:
        self.calls = 0

    def complete(self, messages: list[ChatMessage]) -> str:
        return "Hello, I'm the firm's intake assistant. What brings you in today?"

    def structured(self, messages: list[ChatMessage], schema):
        if schema is PracticeAreaDetection:
            return PracticeAreaDetection(
                practice_area=IntakePracticeArea.EMPLOYMENT,
                confidence_rationale="Mentions wrongful termination",
            )
        if schema is InformationAssessment:
            # Count how many user turns are in the transcript context.
            transcript = messages[-1].content
            user_turns = transcript.count("USER:")
            enough = user_turns >= 4
            return InformationAssessment(
                collected=["issue described"],
                missing_information=[] if enough else ["employer name"],
                next_question="Can you tell me your employer's name and your role?",
                enough_collected=enough,
            )
        if schema is LeadQualification:
            return LeadQualification(
                urgency=Urgency.HIGH,
                recommended=True,
                reasoning="Time-sensitive termination claim",
                missing_information=[],
            )
        if schema is IntakeSummary:
            return IntakeSummary(
                title="Wrongful Termination Inquiry",
                summary="Client reports being fired after reporting safety issues.",
                key_facts=["Terminated last week", "Reported safety violation"],
                client_name="Jordan Client",
            )
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


def _admin_header(client):
    mailer = app.dependency_overrides[get_mailer]()
    data = register_via_otp(client, mailer, "a@x.com", role="admin", full_name="Admin")
    return {"Authorization": f"Bearer {data['tokens']['access_token']}"}


def _user_header(client, email):
    mailer = app.dependency_overrides[get_mailer]()
    data = register_via_otp(client, mailer, email, role="admin", full_name="User")
    return {"Authorization": f"Bearer {data['tokens']['access_token']}"}


def test_full_intake_flow(client):
    h = _admin_header(client)

    # Turn 1: start a new conversation.
    r = client.post("/api/v1/chat/message", headers=h, json={"message": "I was wrongfully fired."})
    assert r.status_code == 200
    data = r.json()
    conv_id = data["conversation_id"]
    assert data["practice_area"] == "employment"
    # Structured JSON contract present.
    assert set(data["structured"].keys()) == {
        "practice_area",
        "urgency",
        "recommended",
        "missing_information",
    }

    # Turns 2-4: answer follow-ups until enough collected.
    last = None
    for msg in ["Acme Corp, I was a technician.", "It happened last week.", "Yes, I reported a safety issue."]:
        r = client.post(
            "/api/v1/chat/message",
            headers=h,
            json={"conversation_id": conv_id, "message": msg},
        )
        assert r.status_code == 200
        last = r.json()

    # By now the flow should have completed and created a case.
    assert last["status"] == "completed"
    assert last["case_id"] is not None
    assert last["summary"] is not None
    assert last["summary"]["recommended"] is True
    assert last["structured"]["urgency"] == "high"
    assert last["structured"]["recommended"] is True


def test_conversation_history_and_detail(client):
    h = _admin_header(client)
    r = client.post("/api/v1/chat/message", headers=h, json={"message": "I need help with a divorce."})
    conv_id = r.json()["conversation_id"]

    hist = client.get("/api/v1/conversation/history", headers=h)
    assert hist.status_code == 200
    assert any(c["id"] == conv_id for c in hist.json())

    detail = client.get(f"/api/v1/conversation/{conv_id}", headers=h)
    assert detail.status_code == 200
    body = detail.json()
    assert body["id"] == conv_id
    # Greeting + first user + assistant follow-up all persisted.
    assert len(body["messages"]) >= 2


def test_conversation_isolated_between_users(client):
    h_a = _user_header(client, "user-a@x.com")
    h_b = _user_header(client, "user-b@x.com")

    r = client.post("/api/v1/chat/message", headers=h_a, json={"message": "I need help with a divorce."})
    conv_id = r.json()["conversation_id"]

    # User B's history must not include user A's conversation.
    hist_b = client.get("/api/v1/conversation/history", headers=h_b)
    assert hist_b.status_code == 200
    assert all(c["id"] != conv_id for c in hist_b.json())

    # User B cannot fetch user A's conversation detail directly.
    detail_b = client.get(f"/api/v1/conversation/{conv_id}", headers=h_b)
    assert detail_b.status_code == 404

    # User B cannot post a message into user A's conversation.
    msg_b = client.post(
        "/api/v1/chat/message",
        headers=h_b,
        json={"conversation_id": conv_id, "message": "hijack attempt"},
    )
    assert msg_b.status_code == 404

    # User A can still see and continue their own conversation.
    detail_a = client.get(f"/api/v1/conversation/{conv_id}", headers=h_a)
    assert detail_a.status_code == 200


def test_chat_requires_auth(client):
    r = client.post("/api/v1/chat/message", json={"message": "hi"})
    assert r.status_code == 401


class FakeLLMWithMatching(FakeLLM):
    """Extends the scripted client with a lawyer-matching branch."""

    def __init__(self, recommended_lawyer_id: int) -> None:
        super().__init__()
        self.recommended_lawyer_id = recommended_lawyer_id

    def structured(self, messages: list[ChatMessage], schema):
        if schema is LawyerMatchResult:
            return LawyerMatchResult(
                recommended_lawyer_id=self.recommended_lawyer_id,
                match_score=91,
                reasoning=[
                    "Specializes in Employment Law",
                    "8 years experience",
                    "Currently available",
                ],
                alternative_lawyer_ids=[],
            )
        return super().structured(messages, schema)


def test_intake_recommends_and_assigns_eligible_lawyer(client):
    # Onboard a lawyer eligible for employment cases (the practice area the
    # scripted FakeLLM always detects).
    mailer = app.dependency_overrides[get_mailer]()
    lawyer_data = register_via_otp(
        client, mailer, "lawyer@x.com", role="lawyer", full_name="Lena Lawyer"
    )
    lawyer_id = lawyer_data["user"]["id"]
    lawyer_h = {"Authorization": f"Bearer {lawyer_data['tokens']['access_token']}"}

    complete = client.post(
        "/api/v1/lawyers/me/complete",
        headers=lawyer_h,
        json={
            "years_of_experience": 8,
            "languages_spoken": ["English"],
            "primary_practice_area": "employment",
            "bar_registration_number": "BAR-001",
        },
    )
    assert complete.status_code == 200, complete.text

    app.dependency_overrides[get_llm] = lambda: FakeLLMWithMatching(lawyer_id)

    h = _admin_header(client)
    r = client.post("/api/v1/chat/message", headers=h, json={"message": "I was wrongfully fired."})
    conv_id = r.json()["conversation_id"]

    last = None
    followups = [
        "Acme Corp, I was a technician.",
        "It happened last week.",
        "Yes, I reported a safety issue.",
    ]
    for msg in followups:
        last = client.post(
            "/api/v1/chat/message",
            headers=h,
            json={"conversation_id": conv_id, "message": msg},
        ).json()

    assert last["case_id"] is not None
    assert last["lawyer_match"]["recommended_lawyer_id"] == lawyer_id
    assert last["lawyer_match"]["match_score"] == 91

    case = client.get(f"/api/v1/cases/{last['case_id']}", headers=h).json()
    assert case["assigned_lawyer_id"] == lawyer_id

    # The lawyer's workload should reflect the newly assigned case.
    profile = client.get("/api/v1/lawyers/me", headers=lawyer_h).json()
    assert profile["current_workload"] == 1

    # AI match history is visible to the recommended lawyer.
    history = client.get(f"/api/v1/lawyers/{lawyer_id}/match-history", headers=lawyer_h).json()
    assert len(history) == 1
    match_id = history[0]["id"]

    # A different, uninvolved lawyer cannot override the assignment.
    other_data = register_via_otp(
        client, mailer, "other@x.com", role="lawyer", full_name="Other Lawyer"
    )
    other_id = other_data["user"]["id"]
    other_h = {"Authorization": f"Bearer {other_data['tokens']['access_token']}"}
    forbidden = client.patch(
        f"/api/v1/lawyers/match/{match_id}/override",
        headers=other_h,
        json={"lawyer_id": other_id},
    )
    assert forbidden.status_code == 403

    # An admin can override the AI's recommendation.
    override = client.patch(
        f"/api/v1/lawyers/match/{match_id}/override",
        headers=h,
        json={"lawyer_id": other_id},
    )
    assert override.status_code == 200, override.text
    assert override.json()["was_overridden"] is True

    case_after = client.get(f"/api/v1/cases/{last['case_id']}", headers=h).json()
    assert case_after["assigned_lawyer_id"] == other_id
