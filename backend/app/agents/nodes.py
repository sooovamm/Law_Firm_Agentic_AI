"""Node functions for the intake workflow.

Each node receives the current state plus an injected LLM client and returns a
partial state update. Nodes contain no prompt strings; they pull prompts from
the registry. This keeps prompts external and nodes testable.
"""
from __future__ import annotations

import json

from app.ai.base import ChatMessage, LLMClient
from app.conversations.ai_schemas import (
    InformationAssessment,
    IntakeSummary,
    LeadQualification,
    PracticeAreaDetection,
)
from app.conversations.enums import IntakePracticeArea, IntakeStage
from app.core.config import settings
from app.core.logging import get_logger
from app.lawyers.ai_schemas import LawyerMatchResult
from app.prompts.registry import load_prompt, render_prompt
from app.prompts.required_fields import required_fields_for

logger = get_logger(__name__)


def _system(content: str) -> ChatMessage:
    return ChatMessage(role="system", content=content)


def _transcript(history: list[ChatMessage]) -> ChatMessage:
    """Flatten prior turns into a single user message for context."""
    lines = [f"{m.role.upper()}: {m.content}" for m in history]
    body = "\n".join(lines) if lines else "(no prior messages)"
    return ChatMessage(role="user", content=f"Conversation so far:\n{body}")


def greeting_node(state: dict, llm: LLMClient) -> dict:
    """Produce the opening greeting. Runs only on a brand-new conversation."""
    prompt = load_prompt("greeting")
    reply = llm.complete([_system(prompt)])
    return {
        "assistant_message": reply,
        "next_stage": IntakeStage.PRACTICE_AREA_DETECTION,
    }


def practice_area_node(state: dict, llm: LLMClient) -> dict:
    prompt = load_prompt("practice_area_detection")
    history = state.get("history", [])
    result = llm.structured(
        [_system(prompt), _transcript(history)],
        PracticeAreaDetection,
    )
    logger.info(
        "conv=%s detected practice_area=%s",
        state.get("conversation_id"),
        result.practice_area.value,
    )
    return {
        "practice_area": result.practice_area,
        "next_stage": IntakeStage.INFORMATION_COLLECTION,
    }


def information_collection_node(state: dict, llm: LLMClient) -> dict:
    area: IntakePracticeArea = state.get("practice_area") or IntakePracticeArea.OTHER
    fields = required_fields_for(area)
    prompt = render_prompt(
        "information_collection",
        practice_area=area.value,
        required_fields="\n".join(f"- {f}" for f in fields),
    )
    history = state.get("history", [])
    result = llm.structured(
        [_system(prompt), _transcript(history)],
        InformationAssessment,
    )

    # Enforce a minimum-answers floor in addition to the model's judgment so the
    # agent keeps asking follow-ups until enough is collected.
    user_turns = sum(1 for m in history if m.role == "user")
    enough = result.enough_collected and user_turns >= settings.intake_min_answers

    if enough:
        return {
            "collected": result.collected,
            "missing_information": result.missing_information,
            "enough_collected": True,
            "next_stage": IntakeStage.LEAD_QUALIFICATION,
        }

    return {
        "collected": result.collected,
        "missing_information": result.missing_information,
        "enough_collected": False,
        "assistant_message": result.next_question,
        "next_stage": IntakeStage.INFORMATION_COLLECTION,
    }


def lead_qualification_node(state: dict, llm: LLMClient) -> dict:
    prompt = load_prompt("lead_qualification")
    history = state.get("history", [])
    result = llm.structured(
        [_system(prompt), _transcript(history)],
        LeadQualification,
    )
    logger.info(
        "conv=%s qualified urgency=%s recommended=%s",
        state.get("conversation_id"),
        result.urgency.value,
        result.recommended,
    )
    return {
        "urgency": result.urgency,
        "recommended": result.recommended,
        "qualification_reasoning": result.reasoning,
        "missing_information": result.missing_information,
        "next_stage": IntakeStage.LAWYER_MATCHING,
    }


def lawyer_matching_node(state: dict, llm: LLMClient) -> dict:
    """Recommend a lawyer from the pre-fetched, already-eligible candidate list.

    The candidate list is fetched by the service before the graph runs (nodes stay
    DB-free), and is already hard-filtered to lawyers accepting new clients, under
    capacity, and in a compatible practice area. If it's empty, no lawyer
    qualifies and we skip the LLM call entirely.
    """
    candidates: list[dict] = state.get("candidate_lawyers") or []

    if not candidates:
        area = state.get("practice_area")
        area_label = area.value if isinstance(area, IntakePracticeArea) else "this"
        return {
            "recommended_lawyer_id": None,
            "match_score": 0,
            "match_reasoning": [f"No lawyer currently handles {area_label} cases."],
            "alternative_lawyer_ids": [],
            "next_stage": IntakeStage.GENERATE_SUMMARY,
        }

    area = state.get("practice_area")
    case_context = "\n".join(
        [
            f"Practice area: {area.value if area else 'unknown'}",
            f"Urgency: {state.get('urgency').value if state.get('urgency') else 'unknown'}",
            f"Qualification reasoning: {state.get('qualification_reasoning', '')}",
            f"Collected facts: {'; '.join(state.get('collected', []))}",
        ]
    )
    prompt = render_prompt(
        "lawyer_matching",
        case_context=case_context,
        candidates_json=json.dumps(candidates, default=str),
    )
    result: LawyerMatchResult = llm.structured([_system(prompt)], LawyerMatchResult)

    eligible_ids = {c["id"] for c in candidates}
    recommended_id = (
        result.recommended_lawyer_id if result.recommended_lawyer_id in eligible_ids else None
    )
    alternatives = [lid for lid in result.alternative_lawyer_ids if lid in eligible_ids]

    logger.info(
        "conv=%s lawyer_match recommended=%s score=%s",
        state.get("conversation_id"),
        recommended_id,
        result.match_score,
    )
    return {
        "recommended_lawyer_id": recommended_id,
        "match_score": result.match_score,
        "match_reasoning": result.reasoning,
        "alternative_lawyer_ids": alternatives,
        "next_stage": IntakeStage.GENERATE_SUMMARY,
    }


def generate_summary_node(state: dict, llm: LLMClient) -> dict:
    prompt = load_prompt("summary_generation")
    history = state.get("history", [])
    result: IntakeSummary = llm.structured(
        [_system(prompt), _transcript(history)],
        IntakeSummary,
    )

    recommended = state.get("recommended", False)
    # Compose the closing message shown to the client.
    if recommended:
        closing = (
            "Thank you for sharing these details. Based on what you've told me, "
            "I recommend a consultation with one of our attorneys, and I've "
            "created an intake record for our team to review. Someone will be in "
            "touch shortly."
        )
    else:
        closing = (
            "Thank you for sharing these details. I've recorded your information "
            "for our team to review. If we're able to help, someone will reach "
            "out to you."
        )

    return {
        "summary_title": result.title,
        "summary_text": result.summary,
        "summary_key_facts": result.key_facts,
        "client_name": result.client_name,
        "assistant_message": closing,
        "should_create_case": recommended,
        "next_stage": IntakeStage.CREATE_CASE,
    }
