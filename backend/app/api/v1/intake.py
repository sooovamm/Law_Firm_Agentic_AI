"""Intake chat endpoints. Thin: delegate to services."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.ai.base import LLMClient
from app.ai.factory import get_llm_client
from app.auth.dependencies import get_current_user
from app.conversations.query_service import ConversationQueryService
from app.conversations.schemas import (
    ChatMessageRequest,
    ChatMessageResponse,
    ConversationDetail,
    ConversationSummaryItem,
)
from app.conversations.service import IntakeService
from app.database.session import get_db
from app.models.user import User

router = APIRouter(tags=["intake"])


def get_llm() -> LLMClient:
    # Wrapped as a dependency so tests can override with a fake client.
    return get_llm_client()


@router.post("/chat/message", response_model=ChatMessageResponse)
def chat_message(
    payload: ChatMessageRequest,
    db: Session = Depends(get_db),
    llm: LLMClient = Depends(get_llm),
    user: User = Depends(get_current_user),
) -> ChatMessageResponse:
    service = IntakeService(db, llm)
    if payload.conversation_id is None:
        # Starting a new intake: greet, then process the first message if present.
        started = service.start_conversation(created_by_id=user.id)
        return service.handle_message(started.conversation_id, payload.message, actor_id=user.id)
    return service.handle_message(payload.conversation_id, payload.message, actor_id=user.id)


@router.get("/conversation/history", response_model=list[ConversationSummaryItem])
def conversation_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[ConversationSummaryItem]:
    return ConversationQueryService(db).list_history(
        created_by_id=user.id, skip=skip, limit=limit
    )


@router.get("/conversation/{conversation_id}", response_model=ConversationDetail)
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ConversationDetail:
    return ConversationQueryService(db).get_detail(conversation_id, requested_by_id=user.id)
