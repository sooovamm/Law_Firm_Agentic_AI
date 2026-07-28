.PHONY: help db-up db-down backend-install backend-migrate backend-seed backend-run backend-test frontend-install frontend-run

help:
	@echo "Targets:"
	@echo "  db-up             Start PostgreSQL via docker compose"
	@echo "  db-down           Stop PostgreSQL"
	@echo "  backend-install   uv sync"
	@echo "  backend-migrate   alembic upgrade head"
	@echo "  backend-seed      seed admin user"
	@echo "  backend-run       run API with reload"
	@echo "  backend-test      run pytest"
	@echo "  frontend-install  npm install"
	@echo "  frontend-run      npm run dev"

db-up:
	docker compose up -d

db-down:
	docker compose down

backend-install:
	cd backend && uv sync

backend-migrate:
	cd backend && uv run alembic upgrade head

backend-seed:
	cd backend && uv run python -m app.scripts.seed

backend-run:
	cd backend && uv run uvicorn app.main:app --reload

backend-test:
	cd backend && uv run pytest

frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm run dev
