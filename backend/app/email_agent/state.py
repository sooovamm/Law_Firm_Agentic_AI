"""State for the email intelligence LangGraph workflow.

The graph is invoked once per email. It runs the full linear pipeline and
returns a populated state; the service persists the results (the "Update
Database" step in the flow) after the graph completes, since DB writes are a
service responsibility.
"""
from __future__ import annotations

from typing import Any, TypedDict

from app.email_agent.enums import EmailUrgency


class EmailAgentState(TypedDict, total=False):
    # Inputs
    email_id: int
    sender: str
    subject: str
    body: str
    known_clients: list[dict[str, Any]]  # [{"id", "name"}]
    known_cases: list[dict[str, Any]]  # [{"id", "title"}]

    # Derived
    client_name: str | None
    client_id: int | None
    case_reference: str | None
    case_id: int | None
    summary: str
    tasks: list[dict[str, Any]]
    deadlines: list[dict[str, Any]]
    urgency: EmailUrgency | None
    draft_subject: str
    draft_reply: str
