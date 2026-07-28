"""Assembles the email intelligence workflow as a LangGraph StateGraph.

Flow (linear):
    identify_client -> identify_case -> summarize -> extract_tasks
    -> detect_deadlines -> detect_urgency -> draft_reply

"Receive Email" happens before the graph (the service hands the email in) and
"Update Database" happens after (the service persists the returned state), since
both involve I/O the graph itself should stay free of.
"""
from __future__ import annotations

from functools import partial

from langgraph.graph import END, START, StateGraph

from app.ai.base import LLMClient
from app.email_agent.nodes import (
    detect_deadlines_node,
    detect_urgency_node,
    draft_reply_node,
    extract_tasks_node,
    identify_case_node,
    identify_client_node,
    summarize_node,
)
from app.email_agent.state import EmailAgentState

# Node keys in pipeline order.
IDENTIFY_CLIENT = "identify_client"
IDENTIFY_CASE = "identify_case"
SUMMARIZE = "summarize"
EXTRACT_TASKS = "extract_tasks"
DETECT_DEADLINES = "detect_deadlines"
DETECT_URGENCY = "detect_urgency"
DRAFT_REPLY = "draft_reply"


def build_email_graph(llm: LLMClient):
    """Build and compile the email agent graph with the LLM client injected."""
    graph = StateGraph(EmailAgentState)

    graph.add_node(IDENTIFY_CLIENT, partial(identify_client_node, llm=llm))
    graph.add_node(IDENTIFY_CASE, partial(identify_case_node, llm=llm))
    graph.add_node(SUMMARIZE, partial(summarize_node, llm=llm))
    graph.add_node(EXTRACT_TASKS, partial(extract_tasks_node, llm=llm))
    graph.add_node(DETECT_DEADLINES, partial(detect_deadlines_node, llm=llm))
    graph.add_node(DETECT_URGENCY, partial(detect_urgency_node, llm=llm))
    graph.add_node(DRAFT_REPLY, partial(draft_reply_node, llm=llm))

    graph.add_edge(START, IDENTIFY_CLIENT)
    graph.add_edge(IDENTIFY_CLIENT, IDENTIFY_CASE)
    graph.add_edge(IDENTIFY_CASE, SUMMARIZE)
    graph.add_edge(SUMMARIZE, EXTRACT_TASKS)
    graph.add_edge(EXTRACT_TASKS, DETECT_DEADLINES)
    graph.add_edge(DETECT_DEADLINES, DETECT_URGENCY)
    graph.add_edge(DETECT_URGENCY, DRAFT_REPLY)
    graph.add_edge(DRAFT_REPLY, END)

    return graph.compile()
