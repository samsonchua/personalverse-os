"""
Additive-only schema sync, run at startup instead of ever dropping the database.

`Base.metadata.create_all()` (called first, in main.py) already creates any
brand-new table without touching existing ones. What it does NOT do is add a
new column to a table that already exists — SQLite has no "ALTER TABLE ...
ADD COLUMN IF NOT EXISTS" via SQLAlchemy's create_all, so a model change like
adding `FinanceTransaction.to_account_id` silently did nothing against an
existing on-disk database.

Previously the workaround was to delete personalverse.db and reseed from
scratch on every such change — which destroys real user data along with the
seed data. This module replaces that workflow: it inspects each mapped
table's actual columns against the model's declared columns and issues a
plain `ALTER TABLE ... ADD COLUMN ...` for anything missing. New columns are
always nullable (or carry a scalar default), so this is safe to run against
a database that already has rows.

This does not handle column removal, type changes, or renames — those still
need a real migration tool (see KNOWN_ISSUES.md). It only ever adds.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def sync_missing_columns(engine: Engine, base) -> list[str]:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    added: list[str] = []

    with engine.begin() as conn:
        for table in base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue  # brand-new table — create_all already handled it

            existing_columns = {col["name"] for col in inspector.get_columns(table.name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue

                col_type = column.type.compile(dialect=engine.dialect)
                ddl = f'ALTER TABLE "{table.name}" ADD COLUMN "{column.name}" {col_type}'
                conn.execute(text(ddl))
                added.append(f"{table.name}.{column.name}")

    return added
