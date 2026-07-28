"""Pagination helpers."""


def to_skip_limit(page: int, page_size: int) -> tuple[int, int]:
    """Convert 1-based page + size into SQL offset/limit."""
    page = max(page, 1)
    page_size = max(min(page_size, 200), 1)
    return (page - 1) * page_size, page_size
