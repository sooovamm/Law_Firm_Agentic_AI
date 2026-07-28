"""LLM client abstraction.

The intake agent depends on this Protocol, not on the OpenAI SDK directly.
This keeps the graph testable (a fake client can be injected) and lets the
provider be swapped without touching business logic.
"""
from __future__ import annotations

from typing import Protocol, TypeVar

from pydantic import BaseModel

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class ChatMessage(BaseModel):
    role: str  # "system" | "user" | "assistant"
    content: str


class LLMClient(Protocol):
    """Minimal interface the agent needs from an LLM provider."""

    def complete(self, messages: list[ChatMessage]) -> str:
        """Return a plain-text assistant reply."""
        ...

    def structured(
        self,
        messages: list[ChatMessage],
        schema: type[SchemaT],
    ) -> SchemaT:
        """Return a response parsed into the given Pydantic schema."""
        ...
