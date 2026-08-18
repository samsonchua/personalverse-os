# ARCHITECTURE.md - PersonalVerse Architecture Specification

## 1. System Overview
PersonalVerse is an AI-powered Personal Operating System. It unifies all personal life
domains—finance, work, knowledge, daily tasks, health, career, and second brain—into a single
interconnected **Life Graph**.

## 2. Tech Stack Definition
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Framer Motion, Lucide Icons, Mermaid.js. No URL
  router — navigation is in-memory state in `Shell.tsx`.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy ORM, Pydantic v2.
- **Database**: SQLite (zero-config local dev, auto-fallback) or PostgreSQL (Docker Compose / production),
  selected purely by `DATABASE_URL` — no code differs between the two.
- **Authentication**: Hand-rolled HMAC-SHA256 JWT (see DECISIONS.md ADR-004), bcrypt password hashing,
  enforced on every data endpoint via a shared `get_current_user` FastAPI dependency.
- **AI Integration**: Provider-abstracted layer (`app/services/ai_providers.py`) supporting Anthropic /
  OpenAI / OpenRouter behind one interface, with a synthetic fallback when no key is configured
  (DECISIONS.md ADR-006).

## 3. Modular Architecture Blueprint

```
                      +-------------------+
                      |   React Frontend  |
                      |  (LoginView gate) |
                      +---------+---------+
                                | REST API (Bearer JWT)
                      +---------v---------+
                      |   FastAPI Router  |
                      |  get_current_user |
                      |  on every router  |
                      +---------+---------+
                                |
          +---------------------+---------------------+
          |                     |                     |
+---------v---------+ +---------v---------+ +---------v---------+
| Life Graph Engine | | AI Provider Layer | | Domain Services   |
| (Entity Links)    | | (OpenAI/Router/   | | (Finance, Health, |
|                    | |  Anthropic/       | |  WorkBuddy, ...)  |
|                    | |  Synthetic)       | |                   |
+---------+---------+ +---------+---------+ +---------+---------+
          |                     |                     |
          +---------------------+---------------------+
                                |
                      +---------v---------+
                      |  SQLAlchemy ORM   |
                      +---------+---------+
                                |
                      +---------v---------+
                      | PostgreSQL/SQLite |
                      +-------------------+
```

## 4. Auth flow
1. `POST /auth/register` or `/auth/login` → bcrypt-verified credentials → signed JWT (7-day expiry).
2. Frontend stores the token, attaches it as `Authorization: Bearer <token>` to every subsequent request
   (axios interceptor in `api/client.ts`).
3. Every protected router depends on `get_current_user`, which decodes/verifies the JWT and loads the
   user row; a 401 from any request triggers a global logout on the frontend (`personalverse:unauthorized`
   window event → `AuthContext`).

## 5. Deployment topologies
- **Local dev** (`python start.py`): SQLite, uvicorn `--reload`, Vite dev server on :3080 proxying `/api`
  to :8088.
- **Docker Compose** (`docker compose up`): Postgres (internal network only, no host port by default) +
  backend (uvicorn, :8088) + frontend (static build served by nginx on :3080, proxying `/api` to the
  backend container). Verified working end-to-end including the demo login.

## 6. Known architectural gaps
See `docs/PROJECT_STATUS.md` § 5 and `KNOWN_ISSUES.md` for the current, honest list (no URL router, no
vector search yet, no Alembic migrations).
