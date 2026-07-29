# Legal Case Management System 

An AI-ready Legal Case Management System.

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


