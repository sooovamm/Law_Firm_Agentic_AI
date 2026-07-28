# Backend — Legal CMS

FastAPI + SQLAlchemy + PostgreSQL. Managed with `uv`.

## Setup

```bash
cp .env.example .env          # set JWT_SECRET_KEY (>= 32 chars)
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload
```

## Environment Variables

See `.env.example`. Key ones:

- `JWT_SECRET_KEY` — required, min 32 chars.
- `POSTGRES_*` — database connection parts.
- `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS` — token lifetimes.
- `CORS_ORIGINS` — comma-separated allowed origins.
- `LOG_LEVEL` — INFO by default.

## Migrations

```bash
uv run alembic upgrade head              # apply
uv run alembic revision --autogenerate -m "message"   # new migration
uv run alembic downgrade -1              # roll back one
```

## Seeding

```bash
uv run python -m app.scripts.seed
```

Creates `admin@legalcms.local` / `ChangeMe123!` if it does not exist.
Change the password immediately in any real environment.

## Tests

```bash
uv run pytest            # in-memory SQLite, no Postgres needed
```

## API Endpoints

| Method | Path                     | Role required            |
| ------ | ------------------------ | ------------------------ |
| POST   | /api/v1/auth/register    | public                   |
| POST   | /api/v1/auth/login       | public                   |
| POST   | /api/v1/auth/refresh     | public (valid refresh)   |
| GET    | /api/v1/auth/me          | any authenticated        |
| GET    | /api/v1/users            | admin                    |
| POST   | /api/v1/users            | admin                    |
| GET    | /api/v1/users/{id}       | any authenticated        |
| PATCH  | /api/v1/users/{id}       | admin                    |
| DELETE | /api/v1/users/{id}       | admin                    |
| GET    | /api/v1/clients          | any authenticated        |
| POST   | /api/v1/clients          | admin, lawyer, paralegal |
| GET    | /api/v1/clients/{id}     | any authenticated        |
| PATCH  | /api/v1/clients/{id}     | admin, lawyer, paralegal |
| DELETE | /api/v1/clients/{id}     | admin, lawyer            |
| GET    | /api/v1/cases            | any authenticated        |
| POST   | /api/v1/cases            | admin, lawyer, paralegal |
| GET    | /api/v1/cases/{id}       | any authenticated        |
| PATCH  | /api/v1/cases/{id}       | admin, lawyer, paralegal |
| DELETE | /api/v1/cases/{id}       | admin, lawyer            |
| GET    | /api/v1/dashboard/stats  | any authenticated        |
| POST   | /api/v1/chat/message     | any authenticated        |
| GET    | /api/v1/conversation/history | any authenticated    |
| GET    | /api/v1/conversation/{id}    | any authenticated    |

## Notes on Password Hashing

This project uses the `bcrypt` library directly rather than `passlib`.
Current `passlib` (1.7.4) is incompatible with `bcrypt` 4.x and raises on
hashing. Passwords are truncated to bcrypt's 72-byte limit before hashing.

## AI Intake Agent (Sprint 2)

The intake flow is a LangGraph workflow in `app/agents/`:

- `state.py` — the graph state (TypedDict).
- `nodes.py` — one function per stage; pulls prompts from the registry.
- `graph.py` — assembles and compiles the StateGraph.

Prompts live in `app/prompts/templates/*.txt` and are loaded via
`app/prompts/registry.py`. No prompt text is embedded in Python logic.

The LLM provider is abstracted behind `app/ai/base.py` (a Protocol). The OpenAI
implementation is in `app/ai/openai_client.py` and uses structured outputs to
parse responses directly into Pydantic schemas. Tests inject a fake client, so
the full workflow is verified without network calls or an API key.

Set `OPENAI_API_KEY` to enable live intake. `INTAKE_MIN_ANSWERS` controls the
minimum number of client answers before the agent may move to qualification.

## Document Management (Sprint 3)

Upload, storage, AI processing, and classification of case documents.

- **Storage abstraction** (`app/storage/`): a `StorageBackend` Protocol with
  `LocalStorage` and `S3Storage` implementations, selected by `STORAGE_BACKEND`.
- **Documents domain** (`app/documents/`): model, schemas, repository, upload
  service, extraction, AI analyzer, and a background processor.
- **Supported uploads**: PDF, DOCX, PNG, JPG. Max size via `MAX_UPLOAD_MB`.
- **Pipeline** (background job): extract text → AI analysis (summary, key facts,
  important dates, people, organizations, missing documents) → classify
  (employment / medical / contract / evidence / police_report / other) →
  persist → auto-update the linked case's rolling `ai_summary`.
- Processing runs via FastAPI `BackgroundTasks` and is written to be portable to
  a real task queue (Celery/RQ) later without changing the pipeline.

### Endpoints

| Method | Path                              | Role                     |
| ------ | --------------------------------- | ------------------------ |
| POST   | /api/v1/documents/upload          | admin, lawyer, paralegal |
| GET    | /api/v1/documents                 | any authenticated        |
| GET    | /api/v1/documents/{id}            | any authenticated        |
| GET    | /api/v1/documents/{id}/download   | any authenticated        |
| DELETE | /api/v1/documents/{id}            | admin, lawyer            |

`GET /documents` supports `q` (searches filename, summary, extracted text),
`case_id`, `client_id`, and `document_type` filters.

## Professional Dashboard (Sprint 4)

New models: `CaseNote`, `CaseEvent` (consultations, hearings, filings,
deadlines, meetings), `ActivityLog`, plus a `urgency` column on Case.

The dashboard aggregations live in `app/services/dashboard_service.py` and
`app/repositories/dashboard_repository.py`; the case detail page is assembled by
`app/services/case_detail_service.py`. All values are computed from the database.

### Endpoints

| Method | Path                          | Role                     |
| ------ | ----------------------------- | ------------------------ |
| GET    | /api/v1/dashboard/overview    | any authenticated        |
| GET    | /api/v1/cases?...filters      | any authenticated        |
| GET    | /api/v1/cases/{id}/detail     | any authenticated        |
| POST   | /api/v1/cases/{id}/notes      | admin, lawyer, paralegal |
| POST   | /api/v1/cases/{id}/events     | admin, lawyer, paralegal |

Case list filters: `q` (title search), `practice_area`, `assigned_lawyer_id`,
`status`, `urgency`, `created_from`, `created_to`.

## Consultation Scheduling (Sprint 5)

A reusable scheduling engine lives in `app/scheduling/`: model, enums, schemas,
repository (with overlap detection), an availability calculator, a client
confirmation notifier, and `SchedulingService` (the reusable service that owns
all business rules).

### Endpoints

| Method | Path                                | Role                     |
| ------ | ----------------------------------- | ------------------------ |
| POST   | /api/v1/consultations               | admin, lawyer, paralegal |
| GET    | /api/v1/consultations               | any authenticated        |
| GET    | /api/v1/consultations/availability  | any authenticated        |
| GET    | /api/v1/consultations/{id}          | any authenticated        |
| PATCH  | /api/v1/consultations/{id}          | admin, lawyer, paralegal |
| DELETE | /api/v1/consultations/{id}          | admin, lawyer, paralegal |

Business rules: overlapping bookings for a lawyer are rejected (409); only
lawyers/admins may approve (confirm) a booking; clients receive a confirmation
on booking and confirmation; DELETE performs a soft cancel. Status flow:
pending -> confirmed -> completed, with cancel available from pending/confirmed.

The dashboard's "today's consultations" and "upcoming consultations" are sourced
from the Consultation model.

## Email Intelligence Agent (Sprint 6)

A LangGraph agent in `app/email_agent/` processes incoming email. Flow:
identify_client -> identify_case -> summarize -> extract_tasks ->
detect_deadlines -> detect_urgency -> draft_reply. "Receive" happens before the
graph (the service hands the email in) and "Update Database" after (the service
persists results and auto-attaches the email to a matched case).

Prompts are external (`app/prompts/templates/email_*.txt`); business logic lives
in `app/email_agent/service.py`; Gmail and Outlook sit behind a provider
Protocol (`app/email_agent/providers/`) that degrades gracefully without OAuth
credentials. The LLM is the same swappable client used by the intake agent.

### Endpoints

| Method | Path                  | Role                     |
| ------ | --------------------- | ------------------------ |
| GET    | /api/v1/emails        | any authenticated        |
| GET    | /api/v1/emails/{id}   | any authenticated        |
| POST   | /api/v1/emails/ingest | admin, lawyer, paralegal |
| POST   | /api/v1/emails/reply  | admin, lawyer, paralegal |

`GET /emails` supports `q` (search over subject/sender/body/summary), `status`,
`urgency`, `case_id`, and `client_id`. The Email model stores sender, receiver,
subject, body, summary, and case_id, plus provider, status, urgency, client_id,
extracted tasks/deadlines (JSON), and the draft reply.

## AI Court Deadline Manager (Sprint 7)

A LangGraph agent in `app/deadlines/` extracts court deadlines from documents and
emails. Flow: extract_dates -> validate (the graph), then create_deadlines ->
notify_lawyer -> finish (the service). Uses structured outputs.

Extraction is wired into the document processor and the email agent as a
best-effort step, so a failure there never fails document/email processing.
Duplicate deadlines are prevented by a deterministic `dedup_key`
(case + type + due date + normalized title) enforced by a unique constraint, so
re-running extraction over the same source creates nothing new.

### Endpoints

| Method | Path                          | Role                     |
| ------ | ----------------------------- | ------------------------ |
| GET    | /api/v1/deadlines             | any authenticated        |
| POST   | /api/v1/deadlines             | admin, lawyer, paralegal |
| GET    | /api/v1/deadlines/buckets     | any authenticated        |
| GET    | /api/v1/deadlines/calendar    | any authenticated        |
| POST   | /api/v1/deadlines/reminders/run | admin, lawyer          |
| GET    | /api/v1/deadlines/{id}        | any authenticated        |
| PATCH  | /api/v1/deadlines/{id}        | admin, lawyer, paralegal |
| DELETE | /api/v1/deadlines/{id}        | admin, lawyer            |

The Deadline model stores case_id, title, due_date, completed, and priority,
plus type (hearing/filing/appeal/evidence/other), source, and dedup metadata.
`/buckets` returns overdue/today/upcoming for dashboard alerts; `/calendar`
returns deadlines in a date range. Reminders are logged (provider-swappable) and
triggered via `/reminders/run`.
