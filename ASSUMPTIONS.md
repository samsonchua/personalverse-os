# ASSUMPTIONS.md - Technical Assumptions

1. **Zero-Config Local Prototyping**:
   - Backend auto-detects SQLite (`sqlite:///./personalverse.db`) for immediate out-of-the-box execution,
     with full PostgreSQL schema compatibility via `DATABASE_URL` (used by `docker-compose.yml`).
2. **AI Provider Fallback Engine**:
   - Includes an intelligent per-agent synthetic response generator when no `ANTHROPIC_API_KEY`,
     `OPENAI_API_KEY`, or `OPENROUTER_API_KEY` is set, so the AI Agents module is always usable without
     external credentials. `GET /api/v1/ai/provider-status` reports which mode is active.
3. **NotebookLM Import**:
   - Parses raw Markdown notes pasted from NotebookLM into structured knowledge items and takeaways. No
     live NotebookLM API integration — paste-based import only, per the mandate's explicit instruction not
     to depend on NotebookLM API availability for V1.
4. **Multi-tenant data ownership**:
   - Originally built single-tenant for one real person (ADR-008); retrofitted to real per-user data
     ownership once a second real account needed its own private data (see DECISIONS.md ADR-010). Every
     domain table has a `user_id` FK and every endpoint filters/injects by the logged-in user.
5. **Dark-mode-only UI in V1**:
   - The interface uses hardcoded Tailwind color values, not a CSS-variable or `dark:`-variant theme
     system. Building real light/dark theming would touch every component; rather than half-build a
     toggle that doesn't actually restyle the app, this was deliberately left as dark-only and logged as a
     known limitation instead.
6. **Hand-rolled JWT is acceptable for a single-secret HS256 token**:
   - See DECISIONS.md ADR-004. Revisit if algorithm flexibility or key rotation is ever needed.
7. **Docker Compose is the reference production-shaped deployment**:
   - Verified to build and run (Postgres + backend + nginx-served frontend, demo login working through the
     nginx `/api` proxy) as of this pass. The Postgres port is not published to the host by default (see
     KNOWN_ISSUES.md #10).
