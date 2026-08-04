"""State object for the intake LangGraph workflow.

The graph is invoked once per user turn. It reads the conversation so far,
advances through as many stages as it can for this turn, and returns an updated
state that the service persists.
"""
from __future__ import annotations

from typing import TypedDict

from app.ai.base import ChatMessage
from app.conversations.enums import IntakePracticeArea, IntakeStage, Urgency


class IntakeState(TypedDict, total=False):
    # Inputs
    conversation_id: int
    stage: IntakeStage
    history: list[ChatMessage]  # full prior transcript (system excluded)
    user_message: str | None  # the new user turn, if any

    # Working / outputs
    practice_area: IntakePracticeArea | None
    collected: list[str]
    missing_information: list[str]
    enough_collected: bool
    urgency: Urgency | None
    recommended: bool
    qualification_reasoning: str

    # Pre-fetched by the service (nodes stay DB-free); eligible candidates for
    # the conversation's detected practice area.
    candidate_lawyers: list[dict]
    recommended_lawyer_id: int | None
    match_score: int
    match_reasoning: list[str]
    alternative_lawyer_ids: list[int]

    summary_title: str
    summary_text: str
    summary_key_facts: list[str]
    client_name: str | None

    # The assistant's reply to send back this turn.
    assistant_message: str
    # The next stage to persist.
    next_stage: IntakeStage
    # Signals the graph produced a case-worthy result.
    should_create_case: bool
