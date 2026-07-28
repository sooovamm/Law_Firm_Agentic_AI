"""Node functions for the deadline extraction workflow.

extract_dates: LLM structured extraction of candidate deadlines from source text.
validate: parse/validate due dates, drop candidates without a resolvable future-
or-present date, and normalize into dicts the service can persist.

Nodes contain no prompt strings; they load prompts from the registry.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.ai.base import ChatMessage, LLMClient
from app.core.logging import get_logger
from app.deadlines.ai_schemas import DeadlineExtraction
from app.deadlines.state import DeadlineAgentState
from app.prompts.registry import load_prompt

logger = get_logger(__name__)


def _system(content: str) -> ChatMessage:
    return ChatMessage(role="system", content=content)


def _parse_date(value: str | None) -> datetime | None:
    """Parse an ISO date/datetime into a UTC-aware datetime, or None."""
    if not value:
        return None
    text = value.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            dt = datetime.strptime(text, fmt)
            return dt.replace(tzinfo=UTC)
        except ValueError:
            continue
    # Try fromisoformat as a fallback (handles offsets).
    try:
        dt = datetime.fromisoformat(text)
        return dt if dt.tzinfo else dt.replace(tzinfo=UTC)
    except ValueError:
        return None


def extract_dates_node(state: DeadlineAgentState, llm: LLMClient) -> dict:
    prompt = load_prompt("deadline_extraction")
    source = state.get("source_text", "")
    if not source.strip():
        return {"raw_candidates": []}
    context = ChatMessage(role="user", content=f"Source text:\n{source}")
    result = llm.structured([_system(prompt), context], DeadlineExtraction)
    candidates = [d.model_dump() for d in result.deadlines]
    logger.info(
        "Deadline extraction from %s: %d candidate(s)",
        state.get("source_label"),
        len(candidates),
    )
    return {"raw_candidates": candidates}


def validate_node(state: DeadlineAgentState, llm: LLMClient) -> dict:
    """Validate candidates: require a parseable date; normalize fields.

    Candidates without a resolvable date are rejected (we do not persist
    dateless deadlines). Past dates are kept only if within a small grace window
    is not applied here - past dates are dropped because a court deadline in the
    past is not actionable to schedule; such items are surfaced via `rejected`.
    """
    now = datetime.now(UTC)
    valid: list[dict[str, Any]] = []
    rejected: list[dict[str, Any]] = []

    for cand in state.get("raw_candidates", []):
        due = _parse_date(cand.get("due_date"))
        if due is None:
            rejected.append({**cand, "reason": "no resolvable date"})
            continue
        if due < now:
            rejected.append({**cand, "reason": "date in the past"})
            continue
        valid.append(
            {
                "title": cand["title"].strip(),
                "deadline_type": cand["deadline_type"],
                "priority": cand.get("priority", "medium"),
                "due_date": due.isoformat(),
            }
        )

    logger.info(
        "Validation for %s: %d valid, %d rejected",
        state.get("source_label"),
        len(valid),
        len(rejected),
    )
    return {"valid_deadlines": valid, "rejected": rejected}
