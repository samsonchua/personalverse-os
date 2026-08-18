# DATABASE.md - Database Design & Life Graph Specification

## Schema Design Principles
1. **Primary Keys**: UUID v4 strings for all tables.
2. **Audit Tracking**: `created_at` (all tables), `updated_at` (users), `is_deleted` soft-delete flag on
   most domain tables (finance, work, knowledge, habits, journal — see `backend/app/models/models.py` for
   the exact set).
3. **Universal Life Graph**: `life_graph_edges` table connects any entity to any other entity
   (`source_id`, `source_type`, `target_id`, `target_type`, `relation_type`).
4. **Per-user ownership** — every domain table has a `user_id` FK to `users.id`, nullable at the DB level
   (existing rows backfilled via `backend/backfill_user_id.py`, enforced by application code rather than a
   `NOT NULL` constraint so the additive-migration path stays non-destructive). See DECISIONS.md ADR-010.
5. **Migrations**: none — `Base.metadata.create_all` runs on backend startup, which only adds missing
   tables/columns and never alters existing ones. Fine for a prototype; adopt Alembic before real schema
   evolution (KNOWN_ISSUES.md #5).

## Core Tables
- `users` — email (unique), bcrypt `hashed_password`, `full_name`.
- `life_graph_edges` — the universal connective-tissue table.
- `finance_accounts`, `finance_transactions` (with a nullable `to_account_id` for transfers), `financial_goals`, `finance_budgets` (category + monthly limit + `YYYY-MM` period; "spent" is computed on read from that period's expense transactions, not stored).
- `finance_balance_sheet_items` — T-style balance sheet lines (`category`: fixed_asset/current_asset/fixed_liability/current_liability, `value`, `nominee`).
- `finance_insurance_policies` — coverage, premium, nominee, and an optional `ncd_percent` used only by car policies for the No-Claim-Discount forecast.
- `finance_loans` — instalment plans (principal, annual rate, tenure); the amortization schedule itself is computed on read, not stored.
- `finance_investments` — holdings (units, avg cost, current price); cost basis/current value/gain-loss are computed on read.
- `finance_epf_profile` — single active EPF/retirement profile (balance, salary, contribution rates, dividend rate, ages); forecast computed on read.
- `departments`, `department_job_roles`, `department_staff`, `department_sops` (steps stored as a JSON list),
  `department_policies`, `department_cost_items` — Department/HR management. Costing (staff salary +
  normalized overhead) and staff analysis are computed on read, not stored.
- `work_projects`, `work_meetings`, `work_tasks`.
- `knowledge_items`.
- `productivity_habits`, `productivity_habit_logs`, `productivity_time_blocks`.
- `health_metrics`, `health_workouts`.
- `career_skills`, `career_milestones`.
- `journal_entries`.
- `documents` — uploaded file metadata (`filename`, `storage_name` on disk, `content_type`, `size_bytes`,
  optional `entity_type`/`entity_id` to attach a file to any other entity). Binary content lives on disk
  under `UPLOAD_DIR` (or a Docker volume), not in the database.
- `audit_logs` — model defined; not yet written to by any endpoint (future work).

## Password storage
`bcrypt.hashpw` / `bcrypt.checkpw` directly (not via `passlib` — see DECISIONS.md ADR-005). Passwords are
truncated to bcrypt's 72-byte limit before hashing.
