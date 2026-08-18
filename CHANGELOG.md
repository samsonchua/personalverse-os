# CHANGELOG.md - PersonalVerse OS

This is a feature-area summary rather than a version-by-version log — the private development
history includes many incremental commits tied to one person's real data, which doesn't make
sense to carry into a shared copy of the codebase. What follows describes the capabilities that
exist today, grouped by area.

## Core Platform
- FastAPI backend + React/TypeScript/Vite frontend, SQLAlchemy ORM, JWT auth.
- Multi-tenant: every domain table is scoped to the authenticated user; a demo account
  (`demo@personalverse.ai`) ships with realistic seed data across the core modules so the app can
  be explored without a real account.
- Database is swappable via `DATABASE_URL` — SQLite for zero-dependency local dev, Postgres for a
  production-shaped deployment (Docker Compose or any hosted Postgres) — with an additive-only
  startup migration (`sync_missing_columns`) so schema changes never require wiping the database.
- Light/dark/midnight/sand theme support; English/Chinese i18n.

## Personal Finance
- **Accounts & Transactions**: bank/cash/credit-card/loan/investment/asset accounts; income,
  expense, and transfer transactions; a category system with fixed/variable/yearly/disbursement
  classification and parent/child grouping for the standardized Income Statement format.
- **Income Statement**: a full monthly/quarterly/semi-yearly/yearly grid with editable actual
  figures, deduction line items (e.g. statutory payroll deductions), disbursement income/expense
  buckets (money paid back to you vs. transfers that pay down debt or top up investments/assets),
  a trailing-average-projected emergency fund, and a Beginning Balance row anchored to your real
  current cash balance and replayed backward through each period's net income.
- **Balance Sheet**: assets/liabilities tree with items optionally linked to a live Account so
  their value tracks automatically instead of being manually re-entered; "since beginning"
  tracking against each linked account's original opening balance.
- **Cashflow Forecast**: budget-driven (not a naive trailing average) — each month's forecast is
  the Forecasted Income Statement's budget, with whatever's already actually happened this month
  subtracted out so the projection tightens automatically as the month progresses.
- **Investments**: portfolio tracking with cost basis/gain-loss/allocation, live price + dividend
  yield refresh via an external market-data API for supported tickers (falls back gracefully to
  manual pricing for anything not covered), and a Balance Sheet account that can be flagged to
  mirror the portfolio's live value automatically.
- **EPF / Retirement**: contribution projection with an adjustable safe-withdrawal-rate readiness
  analysis comparing projected retirement income against your actual average monthly expense.
- **Tax Planning**: a simple bracket calculator plus a Form B (business income) estimate that
  pulls actual figures for months already past and forecast figures for months still ahead.
- **Insurance, Loans, Instalments, Calc Sheet, Budgets, Goals** (savings / net-worth-synced /
  passive-income targets), **Finance Modeling** (scenario projections), **Stock Analysis**.

## Life Planning
- **Mandala Life Chart**: a 3-level "Open Window 64" goal-planning structure — one root board for
  your overall life vision surrounded by the 8 decades of a life (0–80), each decade expandable
  into its own board of 8 sub-goals, each sub-goal expandable into its own board of 8 concrete
  action steps.

## Work & Business
- **WorkBuddy**: projects, tasks, meetings.
- **Clients & Department**: client directory, services, meetings; department staff, job roles,
  SOPs, policies, cost items — a lightweight internal-operations layer for a small business.
- **Startup Playbook**: structured business-planning documents.

## Productivity & Growth
- **Daily Planner**: habits, time blocks, journal.
- **Self-Analysis**: custom criteria/category self-assessment.
- **Skill Development**: skills with micro-tasks.
- **Health & Biohacking**: metrics, workout logs.
- **Career Progress**: skills and milestones.
- **Interactive Courses**: modules, lessons, quizzes, progress tracking.

## Intelligence
- **Second Brain**: knowledge items, journal/decision-log entries.
- **AI Agents**: a persona-based assistant layer with a live-API-or-synthetic-fallback provider
  abstraction (Anthropic / OpenAI / OpenRouter, whichever key is configured; falls back to
  pre-written responses so the feature works without any key at all).
- **Workflow Designer**, **Web Reader**, **Universal Search** (cross-module keyword search),
  **Documents** (uploads with metadata), **Analytics** (cross-module rollup dashboard).

## Infrastructure Notes
- Backups and cloud database migration are supported via a small standalone script
  (`scripts/migrate_sqlite_to_postgres.py`) that copies every table across in FK-safe order without
  touching the source file — useful for moving from local SQLite to a hosted Postgres instance.
- See `ARCHITECTURE.md`, `DECISIONS.md`, `DATABASE.md`, `API.md`, `KNOWN_ISSUES.md`, and
  `ASSUMPTIONS.md` for deeper technical documentation.
