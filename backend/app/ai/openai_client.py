"""OpenAI-backed implementation of the LLM client."""
from __future__ import annotations

from typing import TypeVar

from openai import OpenAI
from pydantic import BaseModel

from app.ai.base import ChatMessage
from app.core.config import settings
from app.core.exceptions import AppException
from app.core.logging import get_logger

logger = get_logger(__name__)

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class LLMConfigurationError(AppException):
    status_code = 503
    detail = "AI service is not configured"


class OpenAIClient:
    """Wraps the OpenAI SDK, exposing text and structured-output helpers."""

    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise LLMConfigurationError("OPENAI_API_KEY is not set")
        self._client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=settings.openai_timeout_seconds,
        )
        self._model = settings.openai_model

    def complete(self, messages: list[ChatMessage]) -> str:
        resp = self._client.chat.completions.create(
            model=self._model,
            messages=[m.model_dump() for m in messages],
        )
        content = resp.choices[0].message.content
        return content or ""

    def structured(self, messages: list[ChatMessage], schema: type[SchemaT]) -> SchemaT:
        """Use OpenAI structured outputs to parse directly into a schema."""
        resp = self._client.beta.chat.completions.parse(
            model=self._model,
            messages=[m.model_dump() for m in messages],
            response_format=schema,
        )
        parsed = resp.choices[0].message.parsed
        if parsed is None:
            raise AppException("Model returned no structured content")
        return parsed
