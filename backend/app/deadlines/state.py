"""State for the deadline extraction LangGraph workflow.

The graph runs the extract -> validate steps over a source text and returns
validated candidate deadlines. "Create Deadlines" and "Notify Lawyer" are
performed by the service after the graph returns, since they involve DB writes
and notification side effects.
"""
from __future__ import annotations

from typing import Any, TypedDict


class DeadlineAgentState(TypedDict, total=False):
    # Inputs
    case_id: int | None
    source_text: str
    source_label: str  # e.g. "document:12" or "email:5"

    # Working / outputs
    raw_candidates: list[dict[str, Any]]  # extracted, pre-validation
    valid_deadlines: list[dict[str, Any]]  # after validation (dates parsed)
    rejected: list[dict[str, Any]]  # candidates dropped in validation
