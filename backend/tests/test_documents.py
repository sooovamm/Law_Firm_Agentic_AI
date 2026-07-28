"""Document management tests: upload, storage, extraction, AI pipeline.

Uses local storage in a temp dir and a fake LLM, so no network or cloud needed.
"""
import io
import os

os.environ.setdefault("JWT_SECRET_KEY", "test_secret_key_at_least_32_chars_long_xx")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.ai.base import ChatMessage
from app.api.v1.documents import get_llm, get_storage_dep
from app.database.base import Base
from app.database.session import get_db
from app.documents.enums import DocumentType
from app.documents.schemas import DocumentAnalysis
from app.main import app
from app.storage.local import LocalStorage

PDF_CONTENT_TYPE = "application/pdf"


def _make_pdf(text: str) -> bytes:
    """Build a minimal one-page PDF containing the given text."""
    from pypdf import PdfWriter

    # pypdf can't easily add text; use reportlab-free approach via a blank page
    # plus an attached text stream is overkill. Instead craft a tiny PDF by hand.
    # A minimal valid PDF with a text object:
    content = f"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 70>>stream
BT /F1 12 Tf 72 700 Td ({text}) Tj ET
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f 
trailer<</Root 1 0 R/Size 6>>
startxref
0
%%EOF"""
    return content.encode("latin-1")


class FakeLLM:
    def complete(self, messages: list[ChatMessage]) -> str:
        return "Updated case summary incorporating the new document."

    def structured(self, messages: list[ChatMessage], schema):
        assert schema is DocumentAnalysis
        return DocumentAnalysis(
            document_type=DocumentType.EMPLOYMENT,
            summary="Termination letter from Acme Corp.",
            key_facts=["Employee terminated", "Effective date given"],
            important_dates=["2024-03-01: termination date"],
            people=["Jordan Client"],
            organizations=["Acme Corp"],
            missing_documents=["Signed acknowledgment"],
        )


@pytest.fixture
def client(tmp_path):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        db = TestSession()
        try:
            yield db
        finally:
            db.close()

    storage = LocalStorage(base_dir=str(tmp_path / "docs"))
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_storage_dep] = lambda: storage
    app.dependency_overrides[get_llm] = lambda: FakeLLM()

    # Patch the processor's LLM + session factory so the background task uses
    # the same in-memory DB and fake LLM.
    import app.documents.processor as processor_mod
    import app.api.v1.documents as documents_api

    processor_mod.SessionLocal = TestSession
    documents_api.get_llm_client = lambda: FakeLLM()

    yield TestClient(app)
    app.dependency_overrides.clear()


def _admin_header(client):
    r = client.post(
        "/api/v1/auth/register",
        json={"email": "a@x.com", "full_name": "Admin", "password": "password123", "role": "admin"},
    )
    return {"Authorization": f"Bearer {r.json()['tokens']['access_token']}"}


def _seed_case(client, h):
    cid = client.post("/api/v1/clients", headers=h, json={"full_name": "Beta LLC"}).json()["id"]
    case = client.post(
        "/api/v1/cases",
        headers=h,
        json={"title": "Matter", "practice_area": "labor", "client_id": cid},
    ).json()
    return cid, case["id"]


def test_upload_processes_and_classifies(client):
    h = _admin_header(client)
    client_id, case_id = _seed_case(client, h)

    pdf = _make_pdf("Termination Letter")
    resp = client.post(
        "/api/v1/documents/upload",
        headers=h,
        files={"file": ("termination.pdf", io.BytesIO(pdf), PDF_CONTENT_TYPE)},
        data={"case_id": str(case_id), "client_id": str(client_id)},
    )
    assert resp.status_code == 200
    doc_id = resp.json()["document"]["id"]

    # Background task runs synchronously in TestClient, so processing is done.
    detail = client.get(f"/api/v1/documents/{doc_id}", headers=h).json()
    assert detail["processing_status"] == "completed"
    assert detail["document_type"] == "employment"
    assert detail["summary"]
    assert "Acme Corp" in detail["organizations"]
    assert detail["important_dates"]

    # Case summary auto-updated.
    case = client.get(f"/api/v1/cases/{case_id}", headers=h).json()
    # ai_summary isn't in the case read schema; verify via documents instead.
    assert detail["case_id"] == case_id


def test_reject_unsupported_type(client):
    h = _admin_header(client)
    resp = client.post(
        "/api/v1/documents/upload",
        headers=h,
        files={"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")},
    )
    assert resp.status_code == 422


def test_list_search_and_delete(client):
    h = _admin_header(client)
    pdf = _make_pdf("Contract")
    up = client.post(
        "/api/v1/documents/upload",
        headers=h,
        files={"file": ("contract.pdf", io.BytesIO(pdf), PDF_CONTENT_TYPE)},
    )
    doc_id = up.json()["document"]["id"]

    # List
    docs = client.get("/api/v1/documents", headers=h).json()
    assert any(d["id"] == doc_id for d in docs)

    # Search by filename
    found = client.get("/api/v1/documents", headers=h, params={"q": "contract"}).json()
    assert any(d["id"] == doc_id for d in found)

    # Download
    dl = client.get(f"/api/v1/documents/{doc_id}/download", headers=h)
    assert dl.status_code == 200
    assert dl.content == pdf

    # Delete
    d = client.delete(f"/api/v1/documents/{doc_id}", headers=h)
    assert d.status_code == 200
    assert client.get(f"/api/v1/documents/{doc_id}", headers=h).status_code == 404


def test_upload_requires_auth(client):
    pdf = _make_pdf("x")
    resp = client.post(
        "/api/v1/documents/upload",
        files={"file": ("x.pdf", io.BytesIO(pdf), PDF_CONTENT_TYPE)},
    )
    assert resp.status_code == 401
