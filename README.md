# Legal Case Management System — Sprint 1

An AI-ready Legal Case Management System.

Sprint 1 delivered the foundation: user management, authentication, roles, core
domain models (User, Client, Case), CRUD APIs, and an authenticated dashboard.

Sprint 2 adds an **AI Client Intake Agent**: a LangGraph workflow that greets a
prospective client, detects the practice area, collects information through
follow-up questions, qualifies the lead, generates a summary, and creates a
Case — with a ChatGPT-style chat UI branded for a law firm.

Sprint 3 adds **intelligent document management**: upload (PDF/DOCX/PNG/JPG) with
a pluggable storage backend (local or S3), an AI processing pipeline that
extracts text and derives a summary, key facts, dates, people, organizations,
and missing documents, auto-classifies each file, and automatically updates the
linked case's summary — with a document manager UI (preview, download, delete,
search).

Sprint 4 adds a **professional lawyer dashboard**: overview cards, Recharts
visualizations, panels for recent activity, urgent cases, upcoming hearings, and
recent documents, a filterable case list, and a rich case detail page (client,
conversation, documents, AI summary, timeline, notes, assigned lawyer).

## Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), TypeScript, TailwindCSS      |
| Backend    | FastAPI, SQLAlchemy 2.0, Pydantic v2                  |
| Database   | PostgreSQL                                            |
| Auth       | JWT (access + refresh), bcrypt password hashing       |
| Migrations | Alembic                                               |
| AI         | LangGraph workflow + OpenAI structured outputs        |
| Storage    | Pluggable backend: local filesystem or AWS S3         |
| Docs AI    | pypdf / python-docx / Pillow text extraction          |
| Packaging  | `uv` (backend), `npm` (frontend)                      |

## Architecture

The backend follows a strict layered architecture:

```
Route (thin)  ->  Service (business logic, transactions)  ->  Repository (data access)  ->  Model
```

- Routes only parse input, call a service, and serialize output.
- Services own business rules and transaction boundaries (commit/rollback).
- Repositories own all query construction.
- Domain exceptions are transport-agnostic and mapped to HTTP by handlers.

## Prerequisites

- Python 3.11+ and [`uv`](https://docs.astral.sh/uv/)
- Node.js 18.18+ and npm
- PostgreSQL 14+ (or Docker)

## Quick Start

### 1. Database

```bash
# From the project root — starts PostgreSQL on :5432
docker compose up -d
```

Or point the backend at your own PostgreSQL instance via `.env`.

### 2. Backend

```bash
cd backend
cp .env.example .env          # then edit JWT_SECRET_KEY (min 32 chars)
uv sync                       # install dependencies
uv run alembic upgrade head   # create tables
uv run python -m app.scripts.seed   # optional: seed an admin user
uv run uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs
Health check: http://localhost:8000/health

Seeded admin (dev only): `admin@legalcms.local` / `ChangeMe123!`

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # NEXT_PUBLIC_API_BASE_URL
npm install
npm run dev
```

App: http://localhost:3000

## Roles

| Role      | Capabilities                                              |
| --------- | --------------------------------------------------------- |
| Admin     | Full access, including user management                    |
| Lawyer    | Manage clients and cases; can delete                      |
| Paralegal | Create and update clients and cases                       |

## Tests

```bash
cd backend
uv run pytest
```

## Project Layout

```
legal-cms/
├── backend/
│   ├── app/
│   │   ├── agents/         # LangGraph intake workflow (state, nodes, graph)
│   │   ├── ai/             # LLM client abstraction + OpenAI impl
│   │   ├── api/v1/         # thin route handlers
│   │   ├── auth/           # jwt, hashing, dependencies
│   │   ├── conversations/  # intake models, schemas, service, repository
│   │   ├── core/           # config, logging, exceptions
│   │   ├── database/       # engine, session, base
│   │   ├── middleware/     # request logging, error handlers
│   │   ├── models/         # SQLAlchemy models
│   │   ├── prompts/        # externalized prompt templates + registry
│   │   ├── repositories/   # data access layer
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # business logic
│   │   ├── storage/        # storage abstraction (local + S3)
│   │   ├── documents/      # document model, pipeline, services
│   │   └── main.py         # app factory
│   ├── alembic/            # migrations
│   └── tests/
├── frontend/
│   └── src/
│       ├── app/            # App Router pages
│       ├── components/     # UI + layout components
│       ├── hooks/          # auth context
│       ├── lib/            # api client, token store
│       └── types/          # shared TS types
└── docker-compose.yml
```

## Sprint 1 Scope

Delivered: project foundation, PostgreSQL connection, Alembic migrations,
authentication (register/login/JWT/refresh/hashing), roles, User/Client/Case
models, CRUD APIs, login/register/dashboard UI with auth guards, and dashboard
case metrics.

## Sprint 2 Scope

Delivered: AI Client Intake Agent built on LangGraph.

- Workflow: greeting → practice-area detection → information collection
  (loops on follow-up questions) → lead qualification → summary → case creation.
- Supported practice areas: divorce, criminal, employment, immigration,
  property, personal injury, contract disputes, other.
- OpenAI structured outputs; the agent returns structured JSON
  (`practice_area`, `urgency`, `recommended`, `missing_information`).
- Prompts are stored as external templates (`app/prompts/templates/*.txt`) and
  loaded through a registry — never hardcoded in logic.
- Models: Conversation, Message, AISummary. Conversation history is persisted.
- APIs: `POST /chat/message`, `GET /conversation/{id}`, `GET /conversation/history`.
- Frontend: ChatGPT-style chat interface branded for a law firm, New Intake
  page, conversation history, document-upload placeholder, and a progress
  indicator.

### AI configuration

Set `OPENAI_API_KEY` in `backend/.env` to enable live intake. Without it, the
`/chat/message` endpoint returns a 503 (AI not configured); the rest of the app
runs normally. Tests use a scripted fake LLM and need no key.

## Sprint 3 Scope

Delivered: intelligent document management.

- Upload PDF, DOCX, PNG, JPG with a configurable max size (`MAX_UPLOAD_MB`).
- Storage abstraction with local-filesystem and AWS S3 backends, selected by
  `STORAGE_BACKEND`.
- Document model (filename, url, uploaded_at, client_id, case_id, document_type)
  plus AI-derived fields.
- Background AI pipeline: extract text → summary, key facts, important dates,
  people, organizations, missing documents → auto-classify (employment /
  medical / contract / evidence / police_report / other).
- Every processed document linked to a case updates that case's rolling AI
  summary automatically.
- Frontend document manager: upload, preview, download, delete, and search.
- APIs: `POST /documents/upload`, `GET /documents`, `GET /documents/{id}`,
  `GET /documents/{id}/download`, `DELETE /documents/{id}`.

### Storage configuration

`STORAGE_BACKEND=local` (default) stores files under `LOCAL_STORAGE_DIR`.
`STORAGE_BACKEND=s3` uses the `AWS_*` settings. Document processing runs in the
background via FastAPI `BackgroundTasks`; the pipeline is written to be portable
to a dedicated task queue (Celery/RQ) later without changes.

## Sprint 4 Scope

Delivered: a professional lawyer dashboard connected to PostgreSQL.

- Overview cards: Open Cases, Closed Cases, New Clients, Today's Consultations.
- Recharts visualizations: cases by practice area (bar) and by status (pie).
- Panels: recent activity (from an activity log), urgent cases, upcoming
  hearings/events, and recent documents.
- Filterable case list: practice area, lawyer, status, urgency, date, search.
- Case detail page: client, assigned lawyer, AI summary, documents, notes,
  a unified timeline, and the linked intake conversation.
- New backend models: CaseNote, CaseEvent, ActivityLog, plus a case urgency
  field. Notes and events have create endpoints; activity is logged on writes.
- Endpoints: `GET /dashboard/overview`, `GET /cases` (with filters),
  `GET /cases/{id}/detail`, `POST /cases/{id}/notes`, `POST /cases/{id}/events`.
- Frontend uses shadcn/ui-style components (Radix + CVA) and Recharts. All
  dashboard data comes from the database; nothing is hardcoded.

## Sprint 5 Scope

Delivered: consultation scheduling.

- Consultation model (case, lawyer, client, scheduled_time, status) with statuses
  pending / confirmed / completed / cancelled.
- Reusable scheduling service in `backend/app/scheduling/` with overlap
  prevention, lawyer-only approval, client confirmations, availability
  calculation, reschedule, and cancel.
- APIs: POST/GET/PATCH/DELETE `/consultations`, plus `/consultations/availability`.
- Frontend: week calendar, available-slot picker, booking page, reschedule, and
  cancel, plus upcoming/today consultations on the dashboard.
- Migration `0005_consultations`.

## Sprint 6 Scope

Delivered: an Email Intelligence Agent.

- Email model (sender, receiver, subject, body, summary, case_id) plus provider,
  status, urgency, client, extracted tasks/deadlines, and a draft reply.
- LangGraph flow: identify client -> identify case -> summarize -> extract tasks
  -> detect deadlines -> detect urgency -> draft reply; the service handles
  receive and database update, and auto-attaches emails to matched cases.
- Gmail and Outlook behind a provider abstraction (graceful without OAuth).
- APIs: GET /emails, GET /emails/{id}, POST /emails/reply (plus /emails/ingest
  for provider webhooks and testing).
- Frontend: inbox, email detail, editable AI draft reply with approve, search.
- All AI prompts are external template files; business logic lives in services.
- Migration `0006_emails`.

## Sprint 7 Scope

Delivered: an AI Court Deadline Manager.

- Deadline model (case_id, title, due_date, completed, priority) plus type,
  source, and dedup metadata.
- LangGraph flow: extract dates -> validate -> create deadlines -> notify lawyer
  -> finish, using structured outputs. AI extracts hearing/filing/appeal/evidence
  deadlines from uploaded documents and emails.
- No duplicate deadlines: deterministic dedup key + DB unique constraint.
- APIs: POST/GET/PATCH/DELETE /deadlines, plus /buckets, /calendar, and
  /reminders/run.
- Dashboard: overdue / today / upcoming buckets and a main-dashboard alert panel.
- Notifications: email reminders (logged, provider-swappable) and dashboard
  alerts. Calendar view on the frontend.
- Migration `0007_deadlines`.
