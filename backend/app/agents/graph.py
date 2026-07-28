"""Assembles the intake workflow as a LangGraph StateGraph.

Flow:
    greeting -> practice_area_detection -> information_collection
             -> lead_qualification -> generate_summary -> (create_case / finish)

Turn model:
- The front stages (greeting, practice-area detection, information collection)
  run one step per user turn so the client and agent alternate.
- information_collection loops on itself (asking follow-ups) until enough
  information is gathered; when it is, the graph continues automatically through
  lead_qualification and generate_summary in the SAME turn, so the client
  immediately receives the closing message.
- create_case and finish are performed by the service after the graph returns,
  since they require database writes.
"""
from __future__ import annotations

from functools import partial

from langgraph.graph import END, StateGraph

from app.agents.nodes import (
    generate_summary_node,
    greeting_node,
    information_collection_node,
    lead_qualification_node,
    practice_area_node,
)
from app.agents.state import IntakeState
from app.ai.base import LLMClient
from app.conversations.enums import IntakeStage

_STAGE_NODES = {
    IntakeStage.GREETING: greeting_node,
    IntakeStage.PRACTICE_AREA_DETECTION: practice_area_node,
    IntakeStage.INFORMATION_COLLECTION: information_collection_node,
    IntakeStage.LEAD_QUALIFICATION: lead_qualification_node,
    IntakeStage.GENERATE_SUMMARY: generate_summary_node,
}


def _route_entry(state: IntakeState) -> str:
    """Route to the node matching the conversation's current stage."""
    stage = state.get("stage", IntakeStage.GREETING)
    if stage in _STAGE_NODES:
        return stage.value
    return END


def _after_information(state: IntakeState) -> str:
    """Continue to qualification only when enough info is collected."""
    if state.get("enough_collected"):
        return IntakeStage.LEAD_QUALIFICATION.value
    return END


def build_intake_graph(llm: LLMClient):
    """Build and compile the intake graph with the given LLM client injected."""
    graph = StateGraph(IntakeState)

    for stage, node in _STAGE_NODES.items():
        graph.add_node(stage.value, partial(node, llm=llm))

    graph.set_conditional_entry_point(
        _route_entry,
        {stage.value: stage.value for stage in _STAGE_NODES} | {END: END},
    )

    # Front stages end after one step (alternating turns).
    graph.add_edge(IntakeStage.GREETING.value, END)
    graph.add_edge(IntakeStage.PRACTICE_AREA_DETECTION.value, END)

    # Information collection either loops (handled by re-invocation next turn)
    # or, when complete, flows straight through the back half this same turn.
    graph.add_conditional_edges(
        IntakeStage.INFORMATION_COLLECTION.value,
        _after_information,
        {
            IntakeStage.LEAD_QUALIFICATION.value: IntakeStage.LEAD_QUALIFICATION.value,
            END: END,
        },
    )
    graph.add_edge(
        IntakeStage.LEAD_QUALIFICATION.value, IntakeStage.GENERATE_SUMMARY.value
    )
    graph.add_edge(IntakeStage.GENERATE_SUMMARY.value, END)

    return graph.compile()
