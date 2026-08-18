# ROADMAP.md - PersonalVerse Future Roadmap

## Phase 1: Prototype V1 (Completed)
- [x] Full-stack prototype with React 18 + Vite + TailwindCSS Glassmorphism UI.
- [x] FastAPI Python backend with SQLAlchemy ORM & SQLite/PostgreSQL support.
- [x] Universal Life Graph, AI Multi-agent Assistant Swarm, Universal Search, and 12 core modules.

## Phase 1.5: Security & Infrastructure Hardening (Completed 2026-08-08)
- [x] Real JWT enforcement on every data endpoint (previously issued but never verified).
- [x] Real bcrypt password hashing.
- [x] Frontend login gate (was previously always "logged in" by default).
- [x] AI provider abstraction (OpenAI / OpenRouter / Anthropic) with correct routing.
- [x] Docker Compose (Postgres + backend + nginx-served frontend), build- and run-verified.
- [x] Backend pytest suite (37 tests: auth flows + per-router auth enforcement + document CRUD).
- [x] `.env.example` files and documented configuration surface.
- [x] Document management module (upload/list/download/delete, extension allowlist, size cap).

## Phase 1.6: Module Functionality Audit (Completed 2026-08-08)
- [x] Fixed dead "Add X" buttons and decorative UI with no handlers across Finance, WorkBuddy,
      Productivity, Health, Career.
- [x] AnalyticsView rebuilt against real `/analytics/life-metrics` data (was 100% hardcoded).
- [x] Header search actually runs a search; QuickCapture's finance option actually saves a transaction.
- [x] Backend bug fix: `/productivity/habits/log` returning `{}` (missing `db.refresh`).

## Phase 1.7: Personal Finance Depth + Department Module + i18n (Completed 2026-08-08)
- [x] Currency switched to RM (MYR) app-wide; "Wallets" renamed to "Accounts".
- [x] T-style Balance Sheet (fixed/current assets & liabilities, nominees).
- [x] Insurance tracking + Malaysia motor NCD forecast.
- [x] Cashflow forecast (daily/weekly/monthly/quarterly/semi-yearly/yearly).
- [x] Instalment/loan amortization schedules (credit card, car, mortgage, other).
- [x] Malaysia LHDN income tax planning calculator.
- [x] Investment portfolio tracker with allocation chart.
- [x] EPF / retirement forecast.
- [x] Department & HR module: staff roster + analysis, job roles/scope, SOP workflows, rules &
      regulations, department costing.
- [x] English/Mandarin language toggle (real i18n, applied to chrome + Finance module).
- [x] 41 new backend tests (78 total).

## Phase 2: Data Model & Search Depth
- [x] Per-user data ownership (`user_id` on domain tables) — done 2026-08-11, see DECISIONS.md ADR-010.
- [ ] Alembic migrations, replacing `Base.metadata.create_all`.
- [ ] Vector search / pgvector-backed semantic search, replacing `ILIKE` keyword search.
- [ ] AI agent tool-calling with a permission layer, so agents can read real Life Graph data instead of
      producing generic responses.

## Phase 3: Remaining V1 Mandate Gaps
- [ ] Wire document "attach file" UI into WorkBuddy/Knowledge/Journal/etc. (backend already supports it).
- [ ] URL routing (react-router) for deep-linking and back-button support.
- [ ] Real light/dark theme system (CSS-variable based, not a stub toggle).
- [ ] Expand i18n coverage beyond chrome + Finance to every module.
- [ ] Re-verify Docker Compose against the current schema (last verified before this phase's additions).
- [ ] Link Department (staff, costing) to WorkBuddy and Personal Finance via the Life Graph.

## Phase 4: Offline PWA & Voice Capture
- [ ] Progressive Web App offline IndexedDB caching.
- [ ] Mobile voice command quick capture integration.

## Phase 5: Cloud Scaling & Integrations
- [ ] MinIO S3 object storage for binary files and OCR documents.
- [ ] Calendar / email / Google Drive / GitHub integrations.
- [ ] Managed cloud deployment (beyond local Docker Compose).
