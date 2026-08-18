# KNOWN_ISSUES.md - Known Issues and Mitigations

1. ~~**Single-tenant data model**~~ — **Fixed 2026-08-11.** Every domain table now has a `user_id` FK,
   every endpoint filters/injects by the logged-in user, and existing data was backfilled onto the real
   account (see DECISIONS.md ADR-010). Remaining gap: no self-service account switching/invites UI —
   accounts are still created one at a time via `/auth/register`, and cross-account data transfer (if
   ever needed again) requires the same one-time `backend/backfill_user_id.py` script, not a UI action.
2. **Frontend mock-data fallback can mask a broken backend**: most `api/client.ts` methods (dashboard,
   finance, work, etc. — everywhere except auth) silently return hardcoded demo data if the real API call
   throws for *any* reason, including the backend being completely down. This is intentional
   graceful-degradation for offline/demo use, but it means a genuinely broken backend can still look fine
   in most module views. Auth calls were deliberately excluded from this pattern so login failures are
   never masked.
3. **No URL routing**: navigation is in-memory React state (`Shell.tsx`), so there's no deep-linking, no
   browser back-button support, and no shareable per-module URLs.
4. **No dark/light theme toggle**: the UI is dark-only; colors are hardcoded Tailwind arbitrary values
   rather than CSS variables or `dark:` variants. See `ASSUMPTIONS.md`.
5. **No Alembic migrations**: schema changes rely on `Base.metadata.create_all`, which only adds new
   tables/columns and never alters existing ones. Acceptable for a prototype; needed before real schema
   evolution.
6. **Universal search is `ILIKE`-based**, not semantic. No embeddings/pgvector pipeline exists yet, though
   the architecture (single AI provider layer, generic Life Graph edges) is ready for it.
7. **AI providers require a real API key to produce live responses**: with no `ANTHROPIC_API_KEY`,
   `OPENAI_API_KEY`, or `OPENROUTER_API_KEY` set, `/api/v1/ai/provider-status` reports `"synthetic"` and
   all agent chat responses are pre-written canned text (still coherent, just not dynamic). This is the
   documented default, not a bug — see `ASSUMPTIONS.md`.
8. **Document uploads aren't wired into other modules' UI yet**: the backend supports tagging a document
   with `entity_type`/`entity_id` to attach it to any Life Graph entity, but no module (WorkBuddy,
   Knowledge, Journal, etc.) has an "attach file" button — that linkage is only reachable via direct API
   calls today, not through the Documents page itself.
9. **Large frontend JS bundle**: Vite warns that a few chunks (notably the Mermaid `flowchart-elk`
   diagram renderer) exceed 500 kB after minification. Functional, but worth code-splitting later if
   initial load time on slow connections becomes a concern.
10. **Docker Compose does not publish the Postgres port to the host** (`5432`) — a host process was
    already bound to that port in the environment this was verified in, so the mapping was dropped since
    only the `backend` container needs DB access. If you need host-side `psql` access, add
    `ports: ["5432:5432"]` back to the `db` service in `docker-compose.yml` (or change the host port, e.g.
    `"55432:5432"`, if 5432 is taken locally).
11. **Docker Compose not re-verified against the latest schema**: build/run verification was done before
    the finance-depth (balance sheet, insurance, loans, investments, EPF, tax, cashflow) and Department
    modules were added. The compose files themselves are unchanged, but rebuild and smoke-test before
    trusting the Docker path again — local dev since then has run backend/frontend directly.
12. **i18n covers chrome + Finance only**: the English/Mandarin toggle is real and persists, but WorkBuddy,
    Department, Health, Career, Knowledge, Productivity, Second Brain, and the other modules still render
    in English regardless of the selected language.
13. **Malaysia tax brackets and motor-insurance NCD tiers are hardcoded constants** at the values published
    when this was built (`backend/app/api/tax.py`, `backend/app/api/insurance.py`). Both are revised
    periodically by LHDN / insurers — verify current figures before relying on either calculation for a
    real decision.
14. **(Fixed 2026-08-08) Schema changes used to require deleting the database** — every earlier model
    change in this project was applied by deleting `personalverse.db` and reseeding, which silently
    destroyed any real data (including manually-entered records) along with the seed data. Startup now
    runs `backend/app/db/migrations.py`'s `sync_missing_columns()`, which additively `ALTER TABLE ADD
    COLUMN`s anything a model added, without ever touching existing rows or dropping the database. The
    database will no longer be wiped for schema changes. This does not handle column removal, type
    changes, or renames — those still need a real migration tool (Alembic) if they come up.
