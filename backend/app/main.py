import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.session import engine, Base
from app.db.migrations import sync_missing_columns
from app.api import (
    auth, dashboard, finance, workbuddy, knowledge,
    productivity, health, career, second_brain,
    ai_agents, universal_search, analytics, documents,
    balance_sheet, insurance, loans, investments, epf, tax, department,
    self_analysis, workflows, web_reader, skills, calc_sheets, finance_modeling,
    clients, stock_analysis, courses, startup_playbooks, life_planning
)

logger = logging.getLogger("personalverse.startup")

# Create any brand-new tables (never touches or drops existing ones)...
Base.metadata.create_all(bind=engine)
# ...then additively patch any new columns onto tables that already exist,
# so a model change never requires deleting the database to take effect.
_added_columns = sync_missing_columns(engine, Base)
if _added_columns:
    logger.info("Schema sync added columns: %s", ", ".join(_added_columns))

if "finance_accounts.updated_at" in _added_columns:
    # New column has no data to backfill from — seed it with created_at so existing accounts show
    # a sensible "last updated" instead of blank, rather than waiting for their next transaction.
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text('UPDATE finance_accounts SET updated_at = created_at WHERE updated_at IS NULL'))

if "finance_accounts.opening_balance" in _added_columns:
    # No history to derive this from — lock in each account's current balance (which may already
    # reflect a manual correction) as its beginning-balance reference point, right now.
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text('UPDATE finance_accounts SET opening_balance = balance WHERE opening_balance IS NULL'))

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS configuration. Defaults to "*" for zero-config local dev; set CORS_ORIGINS
# to a comma-separated allowlist (e.g. https://app.example.com) in production.
_cors_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")] if settings.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_cors_origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include All Sub-Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(finance.router, prefix=settings.API_V1_STR)
app.include_router(workbuddy.router, prefix=settings.API_V1_STR)
app.include_router(knowledge.router, prefix=settings.API_V1_STR)
app.include_router(productivity.router, prefix=settings.API_V1_STR)
app.include_router(health.router, prefix=settings.API_V1_STR)
app.include_router(career.router, prefix=settings.API_V1_STR)
app.include_router(second_brain.router, prefix=settings.API_V1_STR)
app.include_router(ai_agents.router, prefix=settings.API_V1_STR)
app.include_router(universal_search.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(balance_sheet.router, prefix=settings.API_V1_STR)
app.include_router(insurance.router, prefix=settings.API_V1_STR)
app.include_router(loans.router, prefix=settings.API_V1_STR)
app.include_router(investments.router, prefix=settings.API_V1_STR)
app.include_router(epf.router, prefix=settings.API_V1_STR)
app.include_router(tax.router, prefix=settings.API_V1_STR)
app.include_router(department.router, prefix=settings.API_V1_STR)
app.include_router(self_analysis.router, prefix=settings.API_V1_STR)
app.include_router(workflows.router, prefix=settings.API_V1_STR)
app.include_router(web_reader.router, prefix=settings.API_V1_STR)
app.include_router(skills.router, prefix=settings.API_V1_STR)
app.include_router(calc_sheets.router, prefix=settings.API_V1_STR)
app.include_router(finance_modeling.router, prefix=settings.API_V1_STR)
app.include_router(clients.router, prefix=settings.API_V1_STR)
app.include_router(stock_analysis.router, prefix=settings.API_V1_STR)
app.include_router(courses.router, prefix=settings.API_V1_STR)
app.include_router(startup_playbooks.router, prefix=settings.API_V1_STR)
app.include_router(life_planning.router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }
