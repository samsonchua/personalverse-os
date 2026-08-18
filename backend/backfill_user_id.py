"""
One-time backfill for the multi-tenant retrofit: every table just gained a `user_id` column,
but rows created before that change have `user_id IS NULL`. This assigns every such row to a
target user (by email) — in practice, the real account that was using the demo account's shared
data before ownership existed as a concept.

Safe to re-run: only touches rows where user_id IS NULL, so already-backfilled or newly-created
per-user rows are untouched.

Usage: python backfill_user_id.py <target_email>
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import SessionLocal, engine, Base
from app.models.models import User


def backfill(target_email: str):
    db = SessionLocal()
    try:
        target = db.query(User).filter(User.email == target_email).first()
        if not target:
            print(f"No user found with email {target_email!r}. Aborting.")
            return
        target_id = target.id

        total = 0
        with engine.begin() as conn:
            for table in Base.metadata.sorted_tables:
                if "user_id" not in table.columns:
                    continue
                result = conn.execute(
                    text(f'UPDATE "{table.name}" SET user_id = :uid WHERE user_id IS NULL'),
                    {"uid": target_id},
                )
                if result.rowcount:
                    print(f"  {table.name}: {result.rowcount} row(s) backfilled")
                    total += result.rowcount

        print(f"\nDone. {total} total row(s) assigned to {target_email} ({target_id}).")
    finally:
        db.close()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python backfill_user_id.py <target_email>")
        sys.exit(1)
    backfill(sys.argv[1])
