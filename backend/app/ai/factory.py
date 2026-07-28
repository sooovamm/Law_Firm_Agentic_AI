"""Factory for obtaining an LLM client.

Kept separate so tests (or future providers) can override how the client is
constructed without importing the OpenAI SDK at module load time.
"""
from __future__ import annotations

from app.ai.base import LLMClient
from app.ai.openai_client import OpenAIClient


def get_llm_client() -> LLMClient:
    return OpenAIClient()
