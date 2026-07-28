"""Assembles the deadline extraction workflow as a LangGraph StateGraph.

Flow:
    (New Document/Email) -> extract_dates -> validate -> (Create Deadlines
    -> Notify Lawyer -> Finish)

The graph covers extract_dates and validate. "New Document" (source handoff),
"Create Deadlines", "Notify Lawyer", and "Finish" are handled by the service,
which owns the DB writes and notification side effects.
"""
from __future__ import annotations

from functools import partial

from langgraph.graph import END, START, StateGraph

from app.ai.base import LLMClient
from app.deadlines.nodes import extract_dates_node, validate_node
from app.deadlines.state import DeadlineAgentState

EXTRACT_DATES = "extract_dates"
VALIDATE = "validate"


def build_deadline_graph(llm: LLMClient):
    """Build and compile the deadline graph with the LLM client injected."""
    graph = StateGraph(DeadlineAgentState)

    graph.add_node(EXTRACT_DATES, partial(extract_dates_node, llm=llm))
    graph.add_node(VALIDATE, partial(validate_node, llm=llm))

    graph.add_edge(START, EXTRACT_DATES)
    graph.add_edge(EXTRACT_DATES, VALIDATE)
    graph.add_edge(VALIDATE, END)

    return graph.compile()
