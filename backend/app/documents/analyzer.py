"""AI analysis of extracted document text.

Uses the shared LLM client (structured outputs) and externalized prompts. This
module is transport- and storage-agnostic: it takes text, returns analysis.
"""
from __future__ import annotations

from app.ai.base import ChatMessage, LLMClient
from app.core.logging import get_logger
from app.documents.schemas import DocumentAnalysis
from app.prompts.registry import load_prompt

logger = get_logger(__name__)

# Cap the amount of text sent to the model to control token usage.
_MAX_CHARS = 16000


def analyze_document(llm: LLMClient, filename: str, text: str) -> DocumentAnalysis:
    prompt = load_prompt("document_analysis")
    body = text[:_MAX_CHARS] if text else "(no extractable text)"
    user = ChatMessage(
        role="user",
        content=f"Filename: {filename}\n\nDocument text:\n{body}",
    )
    result = llm.structured([ChatMessage(role="system", content=prompt), user], DocumentAnalysis)
    logger.info("Analyzed document '%s' -> type=%s", filename, result.document_type.value)
    return result


def update_case_summary(llm: LLMClient, current_summary: str | None, doc: DocumentAnalysis) -> str:
    prompt = load_prompt("case_summary_update")
    facts = "\n".join(f"- {f}" for f in doc.key_facts)
    user = ChatMessage(
        role="user",
        content=(
            f"Current case summary:\n{current_summary or '(none yet)'}\n\n"
            f"New document summary:\n{doc.summary}\n\n"
            f"New document key facts:\n{facts or '(none)'}"
        ),
    )
    updated = llm.complete([ChatMessage(role="system", content=prompt), user])
    return updated.strip()
