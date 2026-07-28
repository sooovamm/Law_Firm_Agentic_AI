"""Deterministic dedup key for deadlines.

Two extracted deadlines are considered the same when they share a case, a type,
a due date (day granularity), and a normalized title. Hashing these into a
stable key lets a unique constraint prevent duplicates regardless of which
source (document/email) surfaced them or how many times processing runs.
"""
from __future__ import annotations

import hashlib
import re
from datetime import datetime

from app.deadlines.enums import DeadlineType


def _normalize_title(title: str) -> str:
    # Lowercase, collapse whitespace, strip punctuation for stable matching.
    cleaned = re.sub(r"[^\w\s]", "", title.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def compute_dedup_key(
    *, case_id: int | None, deadline_type: DeadlineType, due_date: datetime, title: str
) -> str:
    day = due_date.date().isoformat()
    basis = f"{case_id or 0}|{deadline_type.value}|{day}|{_normalize_title(title)}"
    return hashlib.sha256(basis.encode("utf-8")).hexdigest()[:64]
