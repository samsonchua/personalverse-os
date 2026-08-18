"""
One-time data copy: local personalverse.db (SQLite) -> a Postgres database (e.g. Neon).

Does NOT touch the source SQLite file. Creates the schema on the target (via the app's
own Base.metadata, same as a normal cold start would) and copies every row, table by
table, in FK-safe order. Safe to re-run against an empty target; NOT idempotent against
a target that already has rows (will raise a duplicate-key error rather than silently
double-inserting or overwriting).

Usage:
    cd backend
    TARGET_DATABASE_URL="postgresql+psycopg://user:pass@host/dbname?sslmode=require" \
        python ../scripts/migrate_sqlite_to_postgres.py

Requires psycopg[binary] (already in backend/requirements.txt) and that TARGET_DATABASE_URL
uses the `postgresql+psycopg://` dialect prefix (psycopg3), not plain `postgresql://` or
`postgresql+psycopg2://` — psycopg2 has no working wheel on this machine's Python version.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import create_engine, select  # noqa: E402
from app.db.session import Base  # noqa: E402
from app.models import models  # noqa: E402  (populates Base.metadata)

SOURCE_URL = os.getenv("SOURCE_DATABASE_URL", "sqlite:///../backend/personalverse.db")
TARGET_URL = os.environ["TARGET_DATABASE_URL"]  # required — no default, this is destructive-adjacent

if "postgresql+psycopg://" not in TARGET_URL and "postgresql+psycopg2://" not in TARGET_URL:
    print(f"WARNING: TARGET_DATABASE_URL doesn't look like a psycopg3 URL ({TARGET_URL.split('://')[0]}://...). "
          f"Use postgresql+psycopg:// or this may fail to connect.")

source_engine = create_engine(SOURCE_URL)
target_engine = create_engine(TARGET_URL, connect_args={"sslmode": "require"} if "sslmode" not in TARGET_URL else {})

print(f"Source: {SOURCE_URL}")
print(f"Target: {TARGET_URL.split('@')[-1] if '@' in TARGET_URL else TARGET_URL}")  # don't print credentials

print("Creating schema on target (safe no-op for tables that already exist)...")
Base.metadata.create_all(bind=target_engine)

def self_ref_columns(table):
    """Columns whose FK points back at this same table (e.g. parent_category_id, parent_id) —
    these can't be trusted to insert in dependency order within one batch, since row order from
    SQLite is insertion order, not a topological sort."""
    cols = set()
    for fk in table.foreign_keys:
        if fk.column.table is table:
            cols.add(fk.parent.name)
    return cols

total_rows = 0
with source_engine.connect() as src_conn:
    for table in Base.metadata.sorted_tables:
        rows = [dict(r) for r in src_conn.execute(select(table)).mappings().all()]
        if not rows:
            print(f"  {table.name}: 0 rows, skipping")
            continue

        self_ref = self_ref_columns(table)
        with target_engine.begin() as dst_conn:
            if self_ref:
                # Phase 1: insert with self-referencing FK columns nulled out (no ordering constraint).
                deferred = [{k: v for k, v in row.items()} for row in rows]
                stripped = []
                for row in deferred:
                    stripped.append({**row, **{c: None for c in self_ref}})
                dst_conn.execute(table.insert(), stripped)
                # Phase 2: fill in the real self-referencing values now that every row exists.
                pk_col = list(table.primary_key.columns)[0].name
                for row in rows:
                    if any(row.get(c) is not None for c in self_ref):
                        dst_conn.execute(
                            table.update().where(table.c[pk_col] == row[pk_col]).values(**{c: row[c] for c in self_ref})
                        )
            else:
                dst_conn.execute(table.insert(), rows)

        total_rows += len(rows)
        print(f"  {table.name}: {len(rows)} rows copied" + (" (self-ref, 2-phase)" if self_ref else ""))

print(f"\nDone. {total_rows} total rows copied.")
print("Source SQLite file was not modified. Verify the target looks right before switching DATABASE_URL over.")
