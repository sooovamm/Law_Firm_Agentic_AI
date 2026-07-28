"""Node functions for the email intelligence workflow.

Each node receives the current state plus an injected LLM client and returns a
partial state update. Nodes contain no prompt strings; they load prompts from
the registry, keeping prompts external and nodes testable. Client/case matching
resolves the model's textual answer against the known lists to obtain real ids.
"""
from __future__ import annotations

from typing import Any

from app.ai.base import ChatMessage, LLMClient
from app.core.logging import get_logger
from app.email_agent.ai_schemas import (
    CaseIdentification,
    ClientIdentification,
    DeadlineDetection,
    DraftReply,
    EmailSummary,
    TaskExtraction,
    UrgencyAssessment,
)
from app.email_agent.state import EmailAgentState
from app.prompts.registry import load_prompt, render_prompt

logger = get_logger(__name__)


def _system(content: str) -> ChatMessage:
    return ChatMessage(role="system", content=content)


def _email_context(state: EmailAgentState) -> ChatMessage:
    body = (
        f"From: {state.get('sender', '')}\n"
        f"Subject: {state.get('subject', '')}\n\n"
        f"{state.get('body', '')}"
    )
    return ChatMessage(role="user", content=f"Email:\n{body}")


def _match_name(name: str | None, known: list[dict[str, Any]], key: str) -> int | None:
    """Resolve a model-provided name/title against a known list (case-insensitive)."""
    if not name:
        return None
    target = name.strip().lower()
    for item in known:
        if item.get(key, "").strip().lower() == target:
            return item["id"]
    # Loose contains-match as a fallback.
    for item in known:
        val = item.get(key, "").strip().lower()
        if val and (val in target or target in val):
            return item["id"]
    return None


def identify_client_node(state: EmailAgentState, llm: LLMClient) -> dict:
    known = state.get("known_clients", [])
    known_str = "\n".join(f"- {c['name']}" for c in known) or "(none on file)"
    prompt = render_prompt("email_client_identification", known_clients=known_str)
    result = llm.structured([_system(prompt), _email_context(state)], ClientIdentification)
    client_id = _match_name(result.client_name, known, "name")
    logger.info("email=%s identified client=%s id=%s", state.get("email_id"), result.client_name, client_id)
    return {"client_name": result.client_name, "client_id": client_id}


def identify_case_node(state: EmailAgentState, llm: LLMClient) -> dict:
    known = state.get("known_cases", [])
    known_str = "\n".join(f"- {c['title']} (id={c['id']})" for c in known) or "(none on file)"
    prompt = render_prompt("email_case_identification", known_cases=known_str)
    result = llm.structured([_system(prompt), _email_context(state)], CaseIdentification)
    case_id = _match_name(result.case_reference, known, "title")
    logger.info("email=%s identified case=%s id=%s", state.get("email_id"), result.case_reference, case_id)
    return {"case_reference": result.case_reference, "case_id": case_id}


def summarize_node(state: EmailAgentState, llm: LLMClient) -> dict:
    prompt = load_prompt("email_summary")
    result = llm.structured([_system(prompt), _email_context(state)], EmailSummary)
    return {"summary": result.summary}


def extract_tasks_node(state: EmailAgentState, llm: LLMClient) -> dict:
    prompt = load_prompt("email_task_extraction")
    result = llm.structured([_system(prompt), _email_context(state)], TaskExtraction)
    return {"tasks": [t.model_dump() for t in result.tasks]}


def detect_deadlines_node(state: EmailAgentState, llm: LLMClient) -> dict:
    prompt = load_prompt("email_deadline_detection")
    result = llm.structured([_system(prompt), _email_context(state)], DeadlineDetection)
    return {"deadlines": [d.model_dump() for d in result.deadlines]}


def detect_urgency_node(state: EmailAgentState, llm: LLMClient) -> dict:
    prompt = load_prompt("email_urgency")
    result = llm.structured([_system(prompt), _email_context(state)], UrgencyAssessment)
    return {"urgency": result.urgency}


def draft_reply_node(state: EmailAgentState, llm: LLMClient) -> dict:
    prompt = load_prompt("email_draft_reply")
    # Give the drafter the summary for grounding, plus the original email.
    context = ChatMessage(
        role="user",
        content=(
            f"Summary of the email: {state.get('summary', '')}\n\n"
            f"Original email from {state.get('sender', '')} "
            f"(subject: {state.get('subject', '')}):\n{state.get('body', '')}"
        ),
    )
    result = llm.structured([_system(prompt), context], DraftReply)
    return {"draft_subject": result.subject, "draft_reply": result.body}
