"""Intake orchestration service.

Coordinates the LangGraph workflow with persistence:
- loads conversation + history,
- appends the user's message,
- runs the graph for this turn,
- persists the assistant reply and any stage transition,
- on completion, writes the AI summary and creates a Case.

This is the transaction owner. Nodes and repositories never commit.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.agents.graph import build_intake_graph
from app.agents.state import IntakeState
from app.ai.base import ChatMessage, LLMClient
from app.conversations.ai_schemas import IntakeSummary  # noqa: F401 (schema doc reference)
from app.conversations.enums import (
    ConversationStatus,
    IntakeStage,
    MessageRole,
    Urgency,
    to_case_practice_area,
)
from app.conversations.models import AISummary, Conversation
from app.conversations.repository import ConversationRepository
from app.conversations.schemas import (
    ChatMessageResponse,
    IntakeStructuredResult,
)
from app.core.exceptions import NotFoundError, ValidationError
from app.core.logging import get_logger
from app.models.enums import CaseStatus
from app.repositories.case_repository import CaseRepository
from app.repositories.client_repository import ClientRepository
from app.models.case import Case
from app.models.client import Client

logger = get_logger(__name__)


class IntakeService:
    def __init__(self, db: Session, llm: LLMClient) -> None:
        self.db = db
        self.llm = llm
        self.repo = ConversationRepository(db)
        self.graph = build_intake_graph(llm)

    def start_conversation(self, created_by_id: int | None = None) -> ChatMessageResponse:
        """Create a new conversation and emit the greeting."""
        conv = self.repo.create(created_by_id=created_by_id)

        state: IntakeState = {
            "conversation_id": conv.id,
            "stage": IntakeStage.GREETING,
            "history": [],
            "user_message": None,
        }
        result = self.graph.invoke(state)

        assistant_message = result.get("assistant_message", "Hello, how can I help you today?")
        self.repo.add_message(conv.id, MessageRole.ASSISTANT, assistant_message)
        conv.stage = result.get("next_stage", IntakeStage.PRACTICE_AREA_DETECTION)

        self.db.commit()
        self.db.refresh(conv)
        return self._build_response(conv, assistant_message)

    def handle_message(
        self, conversation_id: int, user_message: str, actor_id: int | None = None
    ) -> ChatMessageResponse:
        conv = self.repo.get(conversation_id)
        if conv is None or conv.created_by_id != actor_id:
            raise NotFoundError("Conversation not found")
        if conv.status != ConversationStatus.ACTIVE:
            raise ValidationError("This conversation is already completed")

        # Persist the incoming user message first.
        self.repo.add_message(conv.id, MessageRole.USER, user_message)

        history = self._load_history(conv.id)
        state: IntakeState = {
            "conversation_id": conv.id,
            "stage": conv.stage,
            "history": history,
            "user_message": user_message,
            "practice_area": conv.practice_area,
        }
        result = self.graph.invoke(state)

        # Persist practice area if the graph detected it.
        if result.get("practice_area") is not None:
            conv.practice_area = result["practice_area"]

        assistant_message = result.get("assistant_message")
        if assistant_message:
            self.repo.add_message(conv.id, MessageRole.ASSISTANT, assistant_message)

        next_stage = result.get("next_stage", conv.stage)
        conv.stage = next_stage

        summary_obj: AISummary | None = None
        # If the graph reached the summary stage, finalize: summary + case + finish.
        if next_stage == IntakeStage.CREATE_CASE:
            summary_obj = self._finalize(conv, result)

        self.db.commit()
        self.db.refresh(conv)
        return self._build_response(
            conv,
            assistant_message or "",
            result=result,
            summary_obj=summary_obj,
        )

    # ---- internals -------------------------------------------------------

    def _load_history(self, conversation_id: int) -> list[ChatMessage]:
        messages = self.repo.messages_for(conversation_id)
        return [
            ChatMessage(role=m.role.value, content=m.content)
            for m in messages
            if m.role != MessageRole.SYSTEM
        ]

    def _finalize(self, conv: Conversation, result: dict) -> AISummary:
        """Write the AI summary and create a Case, then mark the intake finished."""
        missing = result.get("missing_information", []) or []
        summary = AISummary(
            conversation_id=conv.id,
            title=result.get("summary_title", "Intake Summary"),
            summary=result.get("summary_text", ""),
            client_name=result.get("client_name"),
            practice_area=conv.practice_area,
            urgency=result.get("urgency"),
            recommended=result.get("recommended", False),
            missing_information="\n".join(missing) if missing else None,
            message_count=len(self.repo.messages_for(conv.id)),
        )
        self.repo.upsert_summary(summary)

        if result.get("should_create_case"):
            case = self._create_case_from_intake(conv, result)
            conv.case_id = case.id

        conv.status = ConversationStatus.COMPLETED
        conv.stage = IntakeStage.FINISHED
        logger.info("conv=%s finalized (case_id=%s)", conv.id, conv.case_id)
        return summary

    def _create_case_from_intake(self, conv: Conversation, result: dict) -> Case:
        """Create a Client (if needed) and a Case from the intake result."""
        client_name = result.get("client_name") or "Intake Client"
        client = Client(full_name=client_name)
        self.db.add(client)
        self.db.flush()

        area = to_case_practice_area(conv.practice_area) if conv.practice_area else None
        case = Case(
            title=result.get("summary_title", "New Intake Matter"),
            practice_area=area,  # type: ignore[arg-type]
            status=CaseStatus.OPEN,
            description=result.get("summary_text"),
            client_id=client.id,
            assigned_lawyer_id=conv.created_by_id,
        )
        self.db.add(case)
        self.db.flush()
        self.db.refresh(case)
        return case

    def _structured_result(
        self, conv: Conversation, result: dict | None
    ) -> IntakeStructuredResult:
        result = result or {}
        urgency = result.get("urgency")
        missing = result.get("missing_information", []) or []
        return IntakeStructuredResult(
            practice_area=conv.practice_area.value if conv.practice_area else "",
            urgency=urgency.value if isinstance(urgency, Urgency) else (urgency or ""),
            recommended=bool(result.get("recommended", False)),
            missing_information=missing,
        )

    def _build_response(
        self,
        conv: Conversation,
        assistant_message: str,
        result: dict | None = None,
        summary_obj: AISummary | None = None,
    ) -> ChatMessageResponse:
        from app.conversations.schemas import AISummaryRead

        summary_read = None
        if summary_obj is not None:
            summary_read = AISummaryRead(
                id=summary_obj.id,
                title=summary_obj.title,
                summary=summary_obj.summary,
                client_name=summary_obj.client_name,
                practice_area=summary_obj.practice_area,
                urgency=summary_obj.urgency,
                recommended=summary_obj.recommended,
                missing_information=(
                    summary_obj.missing_information.split("\n")
                    if summary_obj.missing_information
                    else []
                ),
                message_count=summary_obj.message_count,
                created_at=summary_obj.created_at,
            )

        return ChatMessageResponse(
            conversation_id=conv.id,
            stage=conv.stage,
            status=conv.status,
            practice_area=conv.practice_area,
            assistant_message=assistant_message,
            structured=self._structured_result(conv, result),
            case_id=conv.case_id,
            summary=summary_read,
        )
