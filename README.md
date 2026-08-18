# PersonalVerse

An AI-powered Personal Operating System — a single interconnected **Life Graph** across finance, work,
knowledge, tasks, health, career, and journaling.

Status: **working prototype (V1)**. See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for the full,
current breakdown of what works, what's fixed, and what's known-incomplete.

## Quick start

### Option A — Docker (recommended, closest to production)

```bash
cp .env.example .env      # optionally fill in SECRET_KEY and an AI provider key
docker compose up --build
docker compose exec backend python seed_data.py   # first run only, seeds demo data
```

- Frontend: http://localhost:3080
- Backend API + docs: http://localhost:8088/docs
- Demo login: `demo@personalverse.ai` / `demo123`

### Option B — Local dev, no Docker (SQLite auto-fallback)

```bash
python start.py
```

This installs backend Python dependencies, seeds the SQLite database, installs frontend npm packages if
needed, and starts both servers.

- Frontend: http://localhost:3080
- Backend API + docs: http://127.0.0.1:8088/docs

## Configuration

Copy `backend/.env.example` to `backend/.env` for local (non-Docker) runs, or the root `.env.example` to
`.env` for Docker Compose. Every variable is documented inline. Nothing is required to run — SQLite and
the synthetic AI fallback both work with zero configuration; only override values (a real `SECRET_KEY`,
an LLM API key, a Postgres `DATABASE_URL`) if you want that specific behavior.

## Running tests

```bash
cd backend
python -m venv .venv && .venv/Scripts/activate   # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
pytest tests/ -v
```

## Documentation map

| File | Contents |
|---|---|
| [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md) | Current state, what's fixed, honest known limitations |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, tech stack, auth flow, deployment topologies |
| [DATABASE.md](DATABASE.md) | Schema design, core tables |
| [API.md](API.md) | Endpoint reference |
| [DECISIONS.md](DECISIONS.md) | Architectural decision records, with rationale |
| [ASSUMPTIONS.md](ASSUMPTIONS.md) | Explicit scoping assumptions |
| [KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Current gaps and mitigations |
| [ROADMAP.md](ROADMAP.md) | Phased future plan |
| [TODO.md](TODO.md) | Task-level status |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
