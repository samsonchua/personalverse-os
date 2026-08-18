# DECISIONS.md - Architectural Decision Records

## ADR-001: FastAPI + Async-capable SQLAlchemy ORM
- Selected for performance, auto OpenAPI schema docs, and Python AI library compatibility.

## ADR-002: Apple-Inspired Glassmorphic Dark Design System
- Custom TailwindCSS design system with backdrop blur, glowing borders, and neon slate color palette.
  Dark-mode only in V1 — see ASSUMPTIONS.md.

## ADR-003: Universal Life Graph Edge Entity
- Single generic `life_graph_edges` model linking any entity to any other entity in the system via
  `(source_id, source_type, target_id, target_type, relation_type)`, rather than per-pair join tables.

## ADR-004: Hand-rolled JWT (HMAC-SHA256) instead of a JWT library
- The prototype signs/verifies tokens with `hmac` + `hashlib.sha256` directly (`backend/app/core/security.py`)
  rather than `python-jose` or `pyjwt`. This was already the case for token *creation* in the pre-existing
  codebase; this pass added the matching *verification* path (`decode_access_token`) using the same
  approach for consistency, and dropped the unused `python-jose` dependency that had been declared but
  never imported. This is a reasonable, auditable ~50-line implementation for a single-secret HS256 token,
  but a real JWT library should be adopted if this ever needs additional algorithms, key rotation, or
  standards compliance (JWKS, etc).

## ADR-005: `bcrypt` directly, not `passlib`
- The codebase declared `passlib[bcrypt]` as a dependency but never actually used it — passwords were
  "hashed" with plain `SHA256(password + SECRET_KEY)`. Fixing this surfaced that `passlib` (last released
  2020, unmaintained) throws on modern `bcrypt` (>=4.1) due to a version-string it can no longer parse.
  Rather than pin to an old `bcrypt`, we depend on the actively-maintained `bcrypt` package directly and
  call `bcrypt.hashpw` / `bcrypt.checkpw` ourselves — one less unmaintained dependency in a system that
  will hold real personal data.

## ADR-006: AI provider abstraction with a synthetic fallback
- `backend/app/services/ai_providers.py` defines a common `AIProvider.complete(system_prompt, user_prompt)`
  interface with `OpenAIProvider`, `OpenRouterProvider`, and `AnthropicProvider` implementations, selected
  by whichever API key is actually set (priority: Anthropic > OpenAI > OpenRouter). If none is configured,
  or the live call fails for any reason, `ai_engine.py` falls back to pre-written per-agent synthetic
  responses so the AI Agents module is always usable without an API key — this was already the product
  intent (see ASSUMPTIONS.md), just previously implemented with a routing bug (always called OpenAI's
  endpoint regardless of which key was set).

## ADR-007: Router-level auth dependency, not per-endpoint
- `get_current_user` is attached once via `APIRouter(..., dependencies=[Depends(get_current_user)])` on
  every data router rather than added to each individual endpoint function. Only `/auth/register` and
  `/auth/login` are intentionally public.

## ADR-008: No per-user data ownership in V1 (SUPERSEDED by ADR-010)
- Consistent with the mandate ("don't over-engineer multi-tenancy for a personal system"), domain tables
  have no `user_id` column — the JWT gate controls *access* to the API, but every authenticated user
  currently sees the same shared dataset. Explicitly logged as a known limitation rather than silently
  assumed, so it's a deliberate scoping decision, not an oversight.
- Superseded 2026-08-11: a second real account was created and needed its own private data, which this
  decision explicitly didn't support. See ADR-010.

## ADR-009: Docker Compose targets PostgreSQL; local dev keeps SQLite
- `docker-compose.yml` runs Postgres for a production-shaped deployment; `DATABASE_URL` auto-fallback to
  SQLite is preserved for zero-dependency local development (`python start.py`). Verified both paths work
  against the same codebase without any code changes — only `DATABASE_URL` differs.

## ADR-010: Retrofit real per-user data ownership (supersedes ADR-008)
- A second real account was created alongside the demo account (`demo@personalverse.ai`) and needed
  to see its own data, not the shared demo dataset — the exact gap
  ADR-008 flagged as a future blocker became real.
- Every domain table (51 models, `User` excepted) gained a nullable `user_id` FK via the existing additive
  `sync_missing_columns` migration path (no destructive migration needed). Every one of the ~30 API
  routers now takes `current_user: User = Depends(get_current_user)` explicitly and filters every read
  (including single-row by-id lookups, not just list endpoints) and injects `user_id` on every create.
  `app/services/life_graph.py` (universal search + Life Graph) needed `user_id` threaded through as a
  parameter since it fans out across 8+ tables outside the router layer.
- `user_id` is nullable at the DB level (existing rows get `NULL` via a plain `ALTER TABLE ... ADD COLUMN`)
  and enforced by application code, not a DB constraint — deliberate, so the additive-migration pattern
  stays non-destructive. A one-time `backend/backfill_user_id.py <email>` script assigns all pre-existing
  `NULL` rows to a target account; run once against the live `personalverse.db` to move the shared demo
  data onto the real account, leaving the demo account with zero rows.
- Even "child" tables that are always reached via a parent today (e.g. `CourseModule`, `ClientService`)
  got their own `user_id` rather than relying on inherited/joined ownership — some child tables
  (`WorkTask`, `TimeBlock`, Department's child tables) were found to sometimes be queried without their
  parent filter applied, so a flat per-table rule was judged less error-prone than reasoning per-table
  about whether inheritance was safe. See `backend/tests/test_multi_tenancy.py` for isolation coverage
  across a representative cross-section of modules, including the two access-control gaps this surfaced
  (Department's optional-filter child lists; Courses' complete-lesson/quiz-attempt endpoints, which
  previously fetched a lesson by id with no ownership check at all).

## ADR-010: Additive-only startup schema sync instead of wiping the database
- Every model change up to 2026-08-08 was applied to the local SQLite file by deleting it and re-running
  `seed_data.py`, because `Base.metadata.create_all()` only creates missing tables — it never adds a
  column to a table that already exists. That workflow destroyed real data (including manually-entered
  records, not just seed data) each time. Fixed by `backend/app/db/migrations.py`'s
  `sync_missing_columns()`, run at startup after `create_all()`: it inspects each table's actual columns
  against the SQLAlchemy model and issues `ALTER TABLE ... ADD COLUMN ...` for anything missing, entirely
  additive and safe against a database that already has rows. The database is never deleted again as part
  of normal development. This still doesn't cover column removal, type changes, or renames — Alembic is
  the real answer if those come up (see KNOWN_ISSUES.md).
