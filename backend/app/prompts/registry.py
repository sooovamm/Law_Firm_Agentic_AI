"""Prompt registry.

Prompts live in `templates/*.txt` and are loaded by name. Business logic never
contains prompt strings; it references prompts through this registry. Templates
may contain `{placeholder}` markers filled via `render`.
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from app.core.exceptions import AppException

_TEMPLATE_DIR = Path(__file__).parent / "templates"


class PromptNotFoundError(AppException):
    status_code = 500
    detail = "Prompt template not found"


@lru_cache(maxsize=None)
def load_prompt(name: str) -> str:
    """Load a raw prompt template by name (without extension)."""
    path = _TEMPLATE_DIR / f"{name}.txt"
    if not path.exists():
        raise PromptNotFoundError(f"Prompt template '{name}' not found")
    return path.read_text(encoding="utf-8").strip()


def render_prompt(name: str, **kwargs: object) -> str:
    """Load a prompt and substitute {placeholders} with keyword values."""
    template = load_prompt(name)
    if not kwargs:
        return template
    return template.format(**kwargs)
