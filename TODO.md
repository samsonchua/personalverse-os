# TODO.md - PersonalVerse Task Status

## Original prototype build
- [x] Create project structure and documentation
- [x] Implement FastAPI backend architecture & endpoints
- [x] Implement SQLAlchemy models, Pydantic schemas & token-based auth scaffolding
- [x] Create rich demonstration dataset in `backend/seed_data.py`
- [x] Build Glassmorphic React + TypeScript + Vite frontend
- [x] Implement Dashboard Overview
- [x] Implement Personal Finance Module
- [x] Implement WorkBuddy Module (Projects, Tasks, Meetings, Mermaid Flowcharts)
- [x] Implement Knowledge Base (NotebookLM Import)
- [x] Implement Daily Productivity & Habits
- [x] Implement Health & Biohacking Tracker
- [x] Implement Career Matrix & Milestones
- [x] Implement Second Brain & Journal Engine
- [x] Implement Multi-Agent AI Swarm Drawer
- [x] Implement Universal Life Graph Network Engine
- [x] Implement Universal Search Engine
- [x] Implement Analytics & Settings
- [x] Create cross-platform `start.py` launcher

## Security & infrastructure hardening pass (2026-08-08)
- [x] Enforce JWT auth on every protected endpoint (was issued but never checked)
- [x] Real bcrypt password hashing
- [x] Frontend login screen + session gating (was always "logged in" by default)
- [x] Fix AI provider routing bug; add OpenAI/OpenRouter/Anthropic abstraction
- [x] Make Settings functional (was fully decorative)
- [x] Docker Compose (Postgres + backend + nginx frontend), build- and run-verified
- [x] Backend pytest suite (37 tests)
- [x] `.env.example` (backend + root), CORS config
- [x] Consolidate duplicate docs; write `docs/PROJECT_STATUS.md`
- [x] Document management module (upload/list/download/delete)

## Module functionality audit pass (2026-08-08)
- [x] Fixed dead buttons / decorative UI across Finance, WorkBuddy, Productivity, Health, Career
- [x] AnalyticsView rebuilt against real data (was hardcoded)
- [x] Header search actually runs; QuickCapture finance option actually saves
- [x] Fixed backend habit-log endpoint returning `{}`

## Finance depth + Department module + i18n pass (2026-08-08)
- [x] Currency → RM; "Wallets" → "Accounts"
- [x] T-style Balance Sheet with nominees
- [x] Insurance + Malaysia motor NCD forecast
- [x] Cashflow forecast (6 granularities)
- [x] Instalment/loan amortization schedules
- [x] Malaysia LHDN income tax calculator
- [x] Investment portfolio tracker
- [x] EPF / retirement forecast
- [x] Department & HR module (staff, roles, SOPs, policies, costing)
- [x] English/Mandarin language toggle (chrome + Finance)
- [x] 41 new backend tests (78 total)

## Multi-tenant data ownership retrofit (2026-08-11)
- [x] `user_id` FK added to every domain table (51 models) via the additive `sync_missing_columns` path
- [x] Every API router (~30 files) filters reads (including by-id lookups) and injects `user_id` on create
- [x] `app/services/life_graph.py` (universal search + Life Graph) threaded with `user_id`
- [x] `backend/backfill_user_id.py` — one-time backfill of pre-existing shared data onto the real account
- [x] `backend/seed_data.py` updated to set `user_id` on every seeded row
- [x] 6 new isolation tests (`test_multi_tenancy.py`); fixed 2 real access-control gaps it surfaced
      (Department's optional department_id filter; Courses' lesson-complete/quiz-attempt endpoints)
- [x] Backfill run against the live database — demo account now empty, real account has all prior data

## Not yet done (see ROADMAP.md for detail)
- [ ] Alembic migrations
- [ ] Vector/semantic search (pgvector)
- [ ] AI agent tool-calling with permissions
- [ ] Wire "attach file" UI into other modules (backend support already exists)
- [ ] URL routing (react-router)
- [ ] Real light/dark theme system
- [ ] Expand i18n beyond chrome + Finance
- [ ] Re-verify Docker Compose against current schema
- [ ] Link Department to WorkBuddy/Finance via Life Graph
