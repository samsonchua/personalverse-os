# API.md - PersonalVerse API Reference

Base Endpoint: `/api/v1`

All endpoints below require `Authorization: Bearer <token>` **except** `/auth/register` and
`/auth/login`. A missing/invalid/expired token returns `401 Unauthorized`.

## Auth
- `POST /auth/register` — create account, returns `{access_token, token_type, user}`.
- `POST /auth/login` — `{email, password}` → `{access_token, token_type, user}`.
- `GET /auth/me` — current user from the bearer token.

## Key Routers
- `/dashboard` — `GET /summary`: aggregated life metrics.
- `/finance` — MoneyLover-style personal finance:
  - `GET /summary` — net worth, totals, accounts, recent transactions, goals.
  - `POST /accounts`, `PUT /accounts/{id}`, `DELETE /accounts/{id}` — wallets.
  - `GET /transactions` (filters: `account_id`, `category`, `transaction_type`, `start_date`, `end_date`, `limit`, `offset`) — full ledger.
  - `POST /transactions`, `PUT /transactions/{id}`, `DELETE /transactions/{id}` — income/expense/transfer; edits and deletes correctly re-derive account balances (reverse old effect, apply new). Transfers require `to_account_id` and move balance between two wallets atomically.
  - `POST /goals` — savings goals.
  - `GET /budgets?period=YYYY-MM`, `POST /budgets` (upsert by category+period), `DELETE /budgets/{id}` — monthly category budgets with real-time `spent` computed from that period's expense transactions.
  - `GET /reports?months=6` — monthly income/expense trend + current-month expense-by-category, for the Reports tab's charts.
  - `GET /cashflow-forecast?granularity=daily|weekly|monthly|quarterly|semi_yearly|yearly&periods=N&lookback_days=90` — projects income/expense/net/running balance forward from your historical daily average.
  - `GET /balance-sheet`, `POST /balance-sheet/items`, `PUT/DELETE /balance-sheet/items/{id}` — T-style balance sheet (fixed/current assets & liabilities), each line item supports a `nominee`.
  - `GET /insurance`, `POST /insurance`, `PUT/DELETE /insurance/{id}` — policies (life/health/car/home/other) with coverage, premium, nominee. `GET /insurance/{id}/ncd-forecast?years=5` projects Malaysia motor No-Claim-Discount tiers (car policies only).
  - `GET /loans`, `POST /loans`, `DELETE /loans/{id}`, `GET /loans/{id}/schedule` — instalment plans (credit card/car/mortgage/other) with a full reducing-balance amortization schedule (monthly payment, principal/interest split, running balance, payoff date).
  - `GET /investments`, `GET /investments/summary`, `POST /investments`, `PUT/DELETE /investments/{id}` — portfolio holdings with computed cost basis, current value, gain/loss, and allocation by type.
  - `GET /epf`, `POST /epf` (upsert, single active profile), `GET /epf/forecast` — EPF/retirement balance projected year-by-year to retirement age from salary contribution rates + dividend rate.
  - `GET /tax/suggested-reliefs`, `POST /tax/calculate` (`{annual_income, reliefs: [{name, amount}]}`) — Malaysia resident-individual progressive income tax calculator (LHDN brackets); verify current-year brackets/relief caps before filing.
- `/department` — Department & HR management:
  - `GET/POST/PUT/DELETE /departments` — org units; list includes computed `staff_count`.
  - `GET/POST/PUT/DELETE /job-roles?department_id=` — job title, level, job scope, requirements.
  - `GET/POST/PUT/DELETE /staff?department_id=` — roster (employment type, salary, status). `GET /staff/analysis?department_id=` — headcount, total/average salary, breakdowns by employment type/status/role.
  - `GET/POST/PUT/DELETE /sops?department_id=` — SOP workflows as an ordered list of `{step_number, instruction, responsible_role}`.
  - `GET/POST/PUT/DELETE /policies?department_id=` — rules & regulations by category (Attendance/Conduct/Safety/Compliance/...).
  - `GET/POST/DELETE /costs?department_id=`, `GET /costing?department_id=` — overhead cost items (monthly/yearly/one-time, normalized to a monthly figure) combined with active staff salary cost into a total/annualized department cost.
- `/work` (WorkBuddy) — `GET /summary`; `POST /projects`, `/tasks`, `/meetings` (meeting transcripts are
  auto-summarized by the Meeting Assistant AI agent if no summary is provided).
- `/knowledge` — `GET/POST /items`; `POST /notebooklm/import` (paste-based Markdown import, AI-synthesized).
- `/productivity` — `GET /summary`; `POST /habits`, `/habits/log`, `/time-blocks`.
- `/health` — `GET /summary`; `POST /metrics`, `/workouts`.
- `/career` — `GET /summary`; `POST /skills`, `/milestones`.
- `/second-brain` — `GET /entries`; `POST /entries`.
- `/ai` — `GET /agents` (list personas); `POST /chat` (`{agent_id, prompt}`); `GET /provider-status`
  (which real LLM provider, if any, is configured server-side).
- `/search` — `GET /universal?q=&domain=` (keyword `ILIKE` search across tasks, projects, knowledge,
  journal, finance).
- `/graph` — `GET /nodes-edges`; `POST /edge` (Life Graph).
- `/documents` — `GET ""` (list, optional `entity_type`/`entity_id` filter); `POST /upload` (multipart:
  `file` + optional `description`, `tags`, `entity_type`, `entity_id`); `GET /{id}/download`;
  `DELETE /{id}` (soft delete). Extension allowlist (PDF/Word/Excel/PowerPoint/images/text/markdown),
  25 MB default cap (`MAX_UPLOAD_BYTES`).
- `/analytics` — `GET /life-metrics` (task completion rate, real expense-by-category, health trend).

Interactive OpenAPI docs are always available at `http://<backend-host>:8088/docs` while the backend is
running.
