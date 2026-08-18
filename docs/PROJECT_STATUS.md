# PROJECT_STATUS.md — PersonalVerse

_Last updated: 2026-08-12 by the autonomous engineering pass documented in [CHANGELOG.md](../CHANGELOG.md). Latest pass (1.9.0): standardized Income Statement format (fixed/variable income & expenses, deduction nesting, credit-card exclusion, 3-month emergency fund, Cash Surplus, Fixed/Variable analysis) applied to both the actual and Forecasted Income Statement, with a shared editable grid and a monthly/quarterly/semi-yearly/yearly granularity selector. Previous pass (1.8.0): retrofitted real per-user data ownership — every domain table now has a `user_id` FK, every endpoint filters/injects by the logged-in user, and pre-existing shared data was backfilled onto the real account. See DECISIONS.md ADR-010._

## 1. What this document is

PersonalVerse was **not** started from zero. A prior working session already built a genuine full-stack
prototype (FastAPI + React/TS/Vite + SQLite/Postgres) covering 12 life-management modules with real
CRUD, not mockups. This pass audited that codebase, fixed the security gaps that blocked a real "Login"
flow, corrected several functional bugs, and added the infrastructure (Docker, tests, env config) needed
to call it a working prototype. This document reflects the **current** state after that work.

## 2. Architecture

- **Backend**: FastAPI (Python 3.12), SQLAlchemy ORM, SQLite (local dev) or PostgreSQL (Docker), JWT auth
  (HMAC-SHA256, hand-rolled — see [DECISIONS.md](../DECISIONS.md)), bcrypt password hashing.
- **Frontend**: React 18 + TypeScript + Vite, TailwindCSS glassmorphism UI, no URL router — a single
  `activeTab` state switches between module views inside `Shell.tsx`.
- **AI layer**: provider-abstracted (`backend/app/services/ai_providers.py`) — Anthropic / OpenAI /
  OpenRouter behind a common `AIProvider` interface, with a synthetic canned-response fallback when no
  API key is configured. Six agent personas (CEO, Finance, Dev, Health, Meeting, Research).
- **Life Graph**: a generic `life_graph_edges` table links any entity to any other by
  `(source_id, source_type, target_id, target_type, relation_type)` — the cross-module connective tissue
  the mandate calls for.
- **Deployment**: `docker-compose.yml` at repo root (Postgres + backend + nginx-served frontend build);
  zero-Docker local dev also works via `python start.py` (SQLite auto-fallback).

## 3. What works

- **Authentication** — real bcrypt-hashed passwords, JWT issuance, and (as of this pass) JWT verification
  actually **enforced** on every data endpoint via a `get_current_user` FastAPI dependency. Register,
  login, `/auth/me`, logout all function end-to-end (verified with 33 passing pytest tests covering both
  anonymous-rejected and authenticated-allowed paths for every protected router).
- **Frontend login gate** — `App.tsx` now shows a real `LoginView` (sign in / register / "Continue with
  Demo Account") until a valid session exists; `AuthContext` no longer fabricates a fake logged-in user.
- **21 top-level modules** — Dashboard, Finance, WorkBuddy (projects/tasks/meetings + Mermaid flowcharts),
  Client Management (business nature, service scope, contracts, client-scoped planning, income tracking,
  meeting minutes — see below), Department & HR (both nested under a "SamGY" nav category's expandable
  "Clients" submenu), Knowledge Base (+ NotebookLM import), Documents, Daily Productivity/Habits (now with
  a working Time Blocking schedule + auto-generate — see below), Self-Analysis (radar-chart rating
  categories), Skill Development (micro-tasks schedulable straight into the Daily Planner), Health (now
  with real edit/history + Mi Health CSV import), Career, Second Brain/Journal, AI Agent Swarm chat,
  Workflow Designer (Mermaid editor + draw.io XML import), Web Reader (fetch + summarize any URL),
  Interactive Courses (AI-generated lessons + quizzes for any industry), Startup Playbook (compiled
  founding story/cost/plan/ROI entries), Universal Search, Life Graph visualization, Analytics — all fetch
  real data from the backend and have working create/edit/delete forms, not static mockups (every module
  was audited for dead buttons/decorative UI and fixed — see CHANGELOG.md's `2afbce7` pass).
- **Interactive Courses** — enter any industry/topic, get an AI-generated (or synthetic-fallback)
  structured course with modules, lessons, and quizzes; lessons complete manually or via a ≥70% quiz
  score, with a live per-course progress bar.
- **Startup Playbook** — a compiled database of founding stories (initial cost, business plan, ROI,
  key details) for a named company or hypothetical idea, AI-assisted or manually entered/edited.
- **Client Management** — a full client record (business nature, status, contact details) with six linked
  tabs: Overview, Services (scoped engagements with fee amount/frequency), Contracts (file upload reusing
  the Documents module's polymorphic entity tagging), Planning (client-scoped Mermaid workflow diagrams,
  sharing the same editor component as the general Workflow Designer), Income (real `FinanceTransaction`
  rows tagged with a `client_id`, not a parallel/duplicated ledger), and Meetings (minutes with an action
  item checklist).
- **Stock Analysis** (new tab under Personal Finance) — search any stock by name or ticker and get a
  combined fundamental/technical/sentiment read with a suggested buy zone, sell zone, and stop-loss.
  Technical indicators (SMA/RSI/MACD/Bollinger/support-resistance) are computed server-side in pure
  Python; fundamentals and price history come from Yahoo Finance's public endpoints (no API key, same
  crumb/cookie technique `yfinance` uses); news sentiment comes from Google News RSS, scored by the
  configured AI provider or a keyword-lexicon fallback. Every recommendation carries an explicit "not
  financial advice" disclaimer — see § 5 for the real limits of this analysis.
- **Personal Finance is a full MoneyLover-equivalent + Malaysia-specific depth**: Accounts, a filterable
  transaction ledger with wallet-to-wallet transfers, monthly category budgets, a T-style balance sheet
  (fixed/current assets & liabilities with nominees), insurance tracking with a car-policy NCD forecast,
  a cashflow forecast at 6 granularities, instalment/loan amortization schedules, a Malaysia LHDN income
  tax calculator, an investment portfolio tracker with a performance-analysis view (return-by-holding
  ranking + concentration risk), an EPF/retirement forecast, a monthly Income Statement (Revenue /
  Expenses / Net Income computed from real transactions), a formula-capable Calc Sheet, and a Finance
  Modeling tab for personal or SamGY-business what-if projections (the business scenario can pull its
  expense baseline straight from Department costing). All currency displays in RM.
- **Department & HR module**: departments, staff roster with headcount/salary analysis, job roles with
  job scope/requirements, SOP workflows (ordered steps with a responsible role), rules & regulations by
  category, and department costing (staff salary + normalized overhead → total/annualized cost).
- **Language toggle (English/Mandarin)** — a real i18n system, not a stub, applied to the sidebar, header,
  login screen, settings page, and the entire Finance module. See § 5 for what isn't translated yet.
- **Seed data** — `backend/seed_data.py` creates a demo user (`demo@personalverse.ai` / `demo123`) plus a
  realistic, interconnected dataset (accounts, transactions, projects, tasks, habits, health metrics,
  career skills, journal entries, and Life Graph edges linking them).
- **Docker** — `docker-compose.yml` builds backend (FastAPI on Postgres), frontend (static build served by
  nginx, proxying `/api` to the backend container), and a Postgres service with a healthcheck-gated
  startup order.
- **Tests** — `backend/tests/` (pytest + FastAPI `TestClient`, 203 tests) covers registration, login
  success/failure, token validation, that every protected router rejects anonymous requests and serves
  authenticated ones, the full document upload/list/download/delete flow, transfer/edit/delete balance
  recalculation, budget upsert semantics, NCD progression, loan amortization payoff-to-zero, Malaysia tax
  bracket math, EPF forecast compounding, department costing/analysis math, self-analysis rating averages,
  skill micro-task → Daily Planner scheduling, workflow diagram CRUD + entity scoping, web-reader URL
  fetch/SSRF rejection (network calls mocked), calc-sheet persistence, finance-scenario projection math,
  income-statement category grouping/month-over-month deltas, client CRUD with cascading service/meeting
  deletes and cross-module income aggregation, stock-analysis technical/fundamental/sentiment scoring
  (pure-computation unit tests plus router tests with the Yahoo/Google News calls mocked), health metric/
  workout CRUD + bulk-import upsert semantics, time-block CRUD + auto-generate idempotency, account icons,
  transaction category CRUD, balance sheet hierarchy/subcategory/variance/snapshot bucketing, forecasted
  income statement scaling, hourly income math, loan-payment asset depreciation, course generation/
  progress/quiz-scoring/cascade-delete, and startup-playbook generation/manual CRUD.
- **Document management** — new this pass (mandate V1 definition-of-done item #19, previously entirely
  missing). Upload (PDF/Word/Excel/PowerPoint/images/text/markdown, 25 MB default cap, extension
  allowlist), list, download (auth-protected, fetched as a blob client-side since a plain `<a href>` can't
  carry the bearer token), soft-delete, and optional `entity_type`/`entity_id` tagging so files can later
  be attached to any Life Graph entity. Files persist under `backend/uploads/` locally or a named Docker
  volume in Compose.

## 4. What was broken and has been fixed this pass

| Issue | Before | After |
|---|---|---|
| **No auth enforcement** | Every `/api/v1/*` data endpoint was completely open — JWTs were issued at login but never checked anywhere. | `get_current_user` dependency added to every data router; verified with tests. |
| **Fake password hashing** | `security.py` "hashed" passwords with plain `SHA256(password + SECRET_KEY)` despite `passlib[bcrypt]` being a declared (unused) dependency. | Real bcrypt hashing via the `bcrypt` library (passlib itself is unmaintained and incompatible with modern bcrypt — see [DECISIONS.md](../DECISIONS.md)). |
| **Login security hole** | Any failed login attempt for `demo@personalverse.ai` silently created a *new* user row with a reset password — a second wrong-password attempt then hit a duplicate-email crash (500). | Bypass removed; login now does a normal credential check. |
| **Frontend "logged in" by default** | `AuthContext` defaulted to a fabricated user/token when `localStorage` was empty — there was no login screen at all. | Real `LoginView`, session restored from a verified token, `AuthProvider` starts logged-out. |
| **No Authorization header sent** | `api/client.ts` never attached the JWT to requests. | Axios instance attaches `Authorization: Bearer <token>`; a 401 interceptor force-logs-out instead of silently falling through. |
| **AI provider routing bug** | `ai_engine.py` always called `api.openai.com`, even when only `OPENROUTER_API_KEY` was set, and picked the model by string-matching `"openai"` inside the API key itself. | Provider abstraction (`ai_providers.py`) dispatches to the correct API per the env var that's actually set. |
| **Fake analytics data** | `expense_by_category` in `/analytics/life-metrics` was a hardcoded dict, unrelated to real transactions. | Computed from real `FinanceTransaction` rows. |
| **Decorative Settings page** | No `useState`/`useEffect`/API calls; a fake "Save" button; a hardcoded demo API key shown in a password field. | Shows real account info, real AI-provider status (`/ai/provider-status`), real Life Graph edge count, and a working sign-out button. |
| **No Docker / no env config** | No `Dockerfile`, no `docker-compose.yml`, no `.env.example` anywhere. | Added for backend, frontend, and root compose stack; `.env.example` documents every variable. |
| **No tests** | None. | 33 pytest tests (auth flows + per-router auth enforcement + one CRUD correctness check). |
| **Duplicate/diverging docs** | Identical-content doc files existed at both repo root and `docs/`, already drifting apart. | Root is now the single canonical location; `docs/` holds only this status file. |
| **Insecure CORS** | `allow_origins=["*"]` combined with `allow_credentials=True` (browsers reject this combination; FastAPI didn't validate it). | `CORS_ORIGINS` env var; credentials only allowed when origins are explicitly listed. |

## 5. Known limitations (honest, not swept under the rug)

- ~~Single-tenant by design~~ — **retrofitted to real per-user data ownership 2026-08-11** (DECISIONS.md
  ADR-010). Every domain table has a `user_id` FK, every endpoint filters/injects by the logged-in user,
  and pre-existing shared data was backfilled onto the real account via `backend/backfill_user_id.py`.
  `backend/tests/test_multi_tenancy.py` spot-checks isolation across finance, health, clients, department
  (including its optional-filter child lists), courses (including a real access-control gap this
  surfaced — lesson-complete/quiz-attempt endpoints previously had no ownership check at all), and
  universal search / Life Graph.
- **Light theme exists but wasn't pixel-audited per module** — `ThemeContext` + a CSS-variable
  palette swap (Tailwind's `slate`/`white` re-pointed at custom properties, inverted under
  `[data-theme="light"]`) makes the whole app theme-aware without per-component edits, and the
  chrome + Dashboard + Finance + Balance Sheet + Daily Planner were visually verified in both
  themes. Modules not explicitly screenshotted this pass could have a one-off inline gradient or
  arbitrary hex (not a `slate`/`white` class) that doesn't flip — flag any if seen, they're cheap
  one-line fixes now that the mechanism exists.
- **Frontend has no URL router** — navigation is in-memory React state (`Shell.tsx`'s `activeTab`), so
  there's no deep-linking, no browser back-button support, no shareable URLs per module.
- **AI agents have no tools** — the six personas are chat-only; there is no function-calling/tool
  execution layer yet, so the "don't give agents unrestricted destructive access" mandate is trivially
  satisfied for now (there's nothing to restrict). A permission/tool framework is future work.
- **Docker Compose was build- and run-verified earlier in this project's history, but not re-verified
  against the schema added in this pass** (finance depth + Department module) — local development since
  then has run the backend/frontend directly (no Docker), per an explicit request to move off Docker for
  the live dev workflow. The compose files were not changed, so they should still work, but "should" isn't
  "verified" — rebuild and smoke-test before relying on the Docker path again.
- **Universal search is `ILIKE`-based**, not semantic/vector search. The architecture (a single
  provider-abstracted AI layer, a generic Life Graph) is ready for pgvector + embeddings later, but that
  isn't built.
- **Frontend API methods still silently fall back to hardcoded mock data on network/server errors** —
  this is intentional graceful-degradation for demo/offline use, but it means a genuinely broken backend
  can look deceptively fine in most module views (dashboard, finance, etc. — everywhere except auth,
  which was deliberately made to never mask a real error).
- **No Alembic migrations** — schema changes rely on `Base.metadata.create_all`, which only adds new
  tables/columns additively and never alters existing ones. Fine for a prototype; a real migration tool is
  needed before this could safely evolve in production. In practice this means every schema change in this
  project so far has required deleting and reseeding the local SQLite file.
- **i18n coverage is chrome + Finance, not the whole app** — the language toggle (English/Mandarin) is a
  real, working system (`i18n/I18nContext.tsx`), applied to the sidebar, header, login screen, settings
  page, and every string in the Finance module's titles/tabs/headers. WorkBuddy, Department, Health,
  Career, Knowledge, and the other modules still render in English regardless of the language setting —
  translating those would mean adding `t()` keys throughout each module's component tree, which wasn't
  done this pass to keep scope bounded.
- **Malaysia tax brackets and NCD tiers are point-in-time constants** (`backend/app/api/tax.py`,
  `backend/app/api/insurance.py`) — both are hardcoded from published LHDN/motor-insurance figures at the
  time this was built. Government-set rates change; verify against the current Year of Assessment / your
  insurer's current NCD table before relying on either for a real decision.
- **Department module has no link back to WorkBuddy or Finance** — staff aren't connected to WorkBuddy
  tasks/projects, and department costing is entirely separate from Personal Finance's accounts/transactions
  (by design — they model different things: personal money vs. organizational headcount cost — but there's
  no Life Graph edge between them yet).
- **Finance Modeling's "pull from Department Costing" only syncs the expense side** — a SamGY business
  scenario's `monthly_expense` can be set from live department costing with one click, but projected
  revenue is still a manual growth-rate assumption; there's no link to actual invoicing/billing data
  because none exists in the app yet.
- **Web Reader's summaries degrade to extractive (first few sentences) without an AI provider key** — with
  `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/`OPENROUTER_API_KEY` unset it still works end-to-end (verified
  live against `https://example.com`), but the "summary" is not an LLM summary in that mode.
- **The draw.io importer only handles uncompressed XML exports** — draw.io's default `.drawio` save format
  deflates the `<diagram>` payload; a user must explicitly export via File → Export as → XML with
  "Compressed" unchecked, or the importer's parser will report no shapes found.
- **Stock Analysis depends on Yahoo Finance's undocumented endpoints** — the chart/search endpoints are
  stable and don't need auth, but fundamentals (`quoteSummary`) require a short-lived "crumb" token paired
  with a cookie obtained from an undocumented flow (the same technique `yfinance` uses). If Yahoo changes
  or blocks this, fundamentals silently degrade to unavailable (`fundamentals: null` in the API response,
  the UI shows "unavailable" and re-weights the composite score to technical+sentiment only) rather than
  breaking the whole analysis — but it's a real fragility, not a documented/versioned API.
- **Stock Analysis scores are transparent heuristics, not a trained model or real equity research** — the
  technical/fundamental/sentiment scoring formulas are simple, documented, and visible in
  `backend/app/services/stock_analysis.py`; they are not backtested, not calibrated against actual price
  outcomes, and the composite "Buy/Sell" recommendation should not be treated as investment advice (every
  API response and the UI both carry an explicit disclaimer to that effect).
- **Sentiment analysis falls back to a keyword lexicon without an AI provider key** — same
  graceful-degradation pattern as Web Reader's summaries; without `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`/
  `OPENROUTER_API_KEY` set, sentiment scoring counts positive/negative keyword hits in headline titles
  rather than understanding them semantically.
- **Mi Health/Zepp CSV import matches column headers, not a fixed schema** — Xiaomi doesn't publish
  a stable export format, so `lib/miHealthImport.ts` matches common header aliases (date/day, weight,
  sleep, steps, heart rate, ...) case-insensitively. An export with unusual column names will simply
  skip those columns (rows still import on date alone) rather than fail — check the "N rows skipped"
  count after an import if fields look missing.
- **Balance Sheet history is opt-in, not automatic** — a snapshot (and therefore a month-over-month
  variance figure, and a row in BS Analytics' history table) only exists when the user clicks "Take
  Snapshot." There's no scheduled/automatic monthly snapshot job; if the user doesn't take one, the
  BS Analytics tab and every item's variance stay empty regardless of how much the sheet changed.
- **Total Cash Balance / Total Credit Balance are sourced from account `account_type` and Balance
  Sheet `subcategory` tags, not a hard accounting distinction** — an account typed "bank" always
  counts as cash even if it's actually, say, a brokerage sweep account; a Balance Sheet item only
  contributes to these totals if its `subcategory` is set (`cash`/`bank` for assets, `credit_card`
  for liabilities) — an untagged current asset or liability is invisible to these two figures even
  though it's part of Total Assets/Liabilities.
- **Interactive Courses and Startup Playbook content is unverified when AI-generated, and generic
  when it isn't** — with an AI provider configured, course lessons and playbook founding
  stories/costs/ROI are whatever the model produces (or reasonably infers for a hypothetical idea)
  in a single, unreviewed completion call — there's no fact-checking, citation, or web lookup behind
  it, so treat specifics (dollar figures, dates, claims about real companies) as a starting point to
  verify, not a source of truth. Without a provider, both fall back to clearly-labeled generic/blank
  templates rather than fabricated specifics.

## 6. Recommended next steps, in priority order

1. **Alembic migrations** — every schema change so far has meant deleting the local SQLite file; replace
   `create_all` before this happens again.
2. **Rebuild and re-verify the Docker Compose path** against the current schema (finance depth + Department
   module were added after the last Docker verification).
3. **Expand i18n coverage** beyond chrome + Finance to WorkBuddy, Department, Health, Career, Knowledge,
   etc.
4. **Vector search / pgvector** — the architecture is ready; the embeddings pipeline isn't built.
5. **AI agent tool-calling** — give agents real (permissioned) read access to the Life Graph so "Ask
   PersonalVerse" can answer from real data instead of canned/LLM-generic text.
6. **Theme system** — if light mode matters, do it as a real CSS-variable refactor, not a toggle stub.
7. **URL routing** — react-router for deep-linking and back-button support.
8. **Wire Document uploads into other modules' UI** — the backend already supports tagging a document
   with `entity_type`/`entity_id`; no module's UI (WorkBuddy, Knowledge, Journal, etc.) has an "attach
   file" button yet, so that linkage is only usable via direct API calls today.
9. **Link Department to Finance/WorkBuddy** — no Life Graph edges currently connect staff to WorkBuddy
   tasks/projects or department costing to Personal Finance.

See [ROADMAP.md](../ROADMAP.md) for the longer-horizon plan and [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) for
anything currently broken.
