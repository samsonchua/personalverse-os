from datetime import date, datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, FinanceAccount, FinanceTransaction, FinancialGoal, Budget, TransactionCategory,
    ForecastedIncomeStatementEntry,
)
from app.schemas.schemas import (
    FinanceAccountCreate, FinanceAccountUpdate, FinanceTransactionCreate,
    FinanceTransactionUpdate, FinancialGoalCreate, FinancialGoalUpdate, BudgetCreate,
    TransactionCategoryCreate, TransactionCategoryUpdate,
    ForecastedIncomeStatementCellUpsert,
)
from app.services import income_statement
from app.api.balance_sheet import compute_net_worth

router = APIRouter(prefix="/finance", tags=["Finance"], dependencies=[Depends(get_current_user)])


def _apply_transaction_effect(db: Session, tx: FinanceTransaction, sign: int, user_id: str):
    """Applies (sign=+1) or reverses (sign=-1) a transaction's effect on account balances."""
    account = db.query(FinanceAccount).filter(FinanceAccount.id == tx.account_id, FinanceAccount.user_id == user_id).first()
    if tx.transaction_type == "income" and account:
        account.balance += sign * tx.amount
    elif tx.transaction_type == "expense" and account:
        account.balance -= sign * tx.amount
    elif tx.transaction_type == "transfer" and account:
        account.balance -= sign * tx.amount
        if tx.to_account_id:
            to_account = db.query(FinanceAccount).filter(FinanceAccount.id == tx.to_account_id, FinanceAccount.user_id == user_id).first()
            if to_account:
                to_account.balance += sign * tx.amount


def _cash_and_credit_balances(db: Session, user_id: str) -> tuple[float, float]:
    """Total Cash Balance / Total Credit Balance are computed from live transactional accounts
    (cash/bank/credit_card) only. Balance sheet items tagged the same subcategory (e.g. a "Cash in
    Hand" current asset) are a separate, manually-tracked figure — shown on the Balance Sheet page
    as "Cash Tagged"/"Credit Tagged" — and are deliberately NOT added on top here, since for a user
    who also has real accounts for that same cash, adding both double-counts the same money. Cash
    In Hand should equal (mirror) this total, not be summed into it. Shared by /summary and
    /cashflow-forecast so "current balance" means the same thing everywhere in the app."""
    accounts = db.query(FinanceAccount).filter(FinanceAccount.is_deleted == False, FinanceAccount.user_id == user_id).all()

    total_cash_balance = sum(a.balance for a in accounts if a.account_type in ("cash", "bank"))
    total_credit_balance = sum(a.balance for a in accounts if a.account_type == "credit_card")
    return round(total_cash_balance, 2), round(total_credit_balance, 2)


def _serialize_goal(goal: FinancialGoal, net_worth: float | None) -> dict:
    current = net_worth if (goal.goal_type == "net_worth" and net_worth is not None) else goal.current_amount
    return {
        "id": goal.id, "title": goal.title, "target_amount": goal.target_amount, "current_amount": current,
        "target_date": goal.target_date, "category": goal.category, "goal_type": goal.goal_type or "savings",
        "is_completed": goal.is_completed, "created_at": goal.created_at,
        "is_synced": goal.goal_type == "net_worth",
    }


@router.get("/summary")
def get_finance_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = db.query(FinanceAccount).filter(FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id).all()
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id
    ).order_by(FinanceTransaction.date.desc()).all()
    goals = db.query(FinancialGoal).filter(FinancialGoal.is_deleted == False, FinancialGoal.user_id == current_user.id).all()
    net_worth = compute_net_worth(db, current_user.id) if any(g.goal_type == "net_worth" for g in goals) else None

    total_income = sum(t.amount for t in txs if t.transaction_type == "income")
    total_expense = sum(t.amount for t in txs if t.transaction_type == "expense")
    total_cash_balance, total_credit_balance = _cash_and_credit_balances(db, current_user.id)

    return {
        "total_cash_balance": total_cash_balance,
        "total_credit_balance": total_credit_balance,
        "monthly_income": total_income,
        "monthly_expense": total_expense,
        "cash_flow": total_income - total_expense,
        "accounts": accounts,
        "recent_transactions": txs[:10],
        "goals": [_serialize_goal(g, net_worth) for g in goals],
    }


# TRANSACTION CATEGORIES

_DEFAULT_CATEGORIES = {
    "expense": ['Food & Dining', 'Housing', 'Transportation', 'Shopping', 'Entertainment', 'Health & Fitness', 'Utilities', 'Education', 'Travel', 'Insurance', 'Other'],
    "income": ['Salary', 'Investment Return', 'Business', 'Gift', 'Refund', 'Other'],
}


def _seed_categories_if_empty(db: Session, user_id: str):
    if db.query(TransactionCategory).filter(TransactionCategory.is_deleted == False, TransactionCategory.user_id == user_id).count() > 0:
        return
    for category_type, names in _DEFAULT_CATEGORIES.items():
        for order, name in enumerate(names):
            db.add(TransactionCategory(name=name, category_type=category_type, sort_order=order, user_id=user_id))
    db.commit()


@router.get("/categories")
def list_categories(category_type: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _seed_categories_if_empty(db, current_user.id)
    query = db.query(TransactionCategory).filter(TransactionCategory.is_deleted == False, TransactionCategory.user_id == current_user.id)
    if category_type:
        query = query.filter(TransactionCategory.category_type == category_type)
    return query.order_by(TransactionCategory.category_type, TransactionCategory.sort_order).all()


@router.get("/categories/{category_id}/usage")
def category_usage(category_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """How many real transactions (and their total) use this category — surfaced before deleting a
    category from the Income Statement grid, so removing a line item doesn't silently orphan a
    pile of past transactions. Matches by name, same as the Income Statement engine does."""
    category = db.query(TransactionCategory).filter(
        TransactionCategory.id == category_id, TransactionCategory.is_deleted == False, TransactionCategory.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id,
        FinanceTransaction.category == category.name, FinanceTransaction.transaction_type == category.category_type,
    ).all()
    return {"transaction_count": len(txs), "total_amount": round(sum(t.amount for t in txs), 2)}


def _validate_classification(category_type: str, classification: str | None):
    if classification is None:
        return
    allowed = income_statement.valid_classifications(category_type)
    if classification not in allowed:
        raise HTTPException(status_code=400, detail=f"classification for {category_type} must be one of {allowed}")


def _validate_parent_category(db: Session, user_id: str, category_type: str, parent_category_id: str | None, self_id: str | None = None):
    if parent_category_id is None:
        return
    if parent_category_id == self_id:
        raise HTTPException(status_code=400, detail="A category cannot be its own parent")
    parent = db.query(TransactionCategory).filter(
        TransactionCategory.id == parent_category_id, TransactionCategory.is_deleted == False, TransactionCategory.user_id == user_id
    ).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent category not found")
    if parent.category_type != category_type:
        raise HTTPException(status_code=400, detail="Parent category must have the same category_type")


@router.post("/categories")
def create_category(category_in: TransactionCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if category_in.category_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="category_type must be 'income' or 'expense'")
    _validate_classification(category_in.category_type, category_in.classification)
    _validate_parent_category(db, current_user.id, category_in.category_type, category_in.parent_category_id)
    category = TransactionCategory(**category_in.model_dump(), user_id=current_user.id)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}")
def update_category(category_id: str, category_in: TransactionCategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category = db.query(TransactionCategory).filter(
        TransactionCategory.id == category_id, TransactionCategory.is_deleted == False, TransactionCategory.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    data = category_in.model_dump(exclude_unset=True)
    effective_type = data.get("category_type", category.category_type)
    if "classification" in data:
        _validate_classification(effective_type, data["classification"])
    if "parent_category_id" in data:
        _validate_parent_category(db, current_user.id, effective_type, data["parent_category_id"], self_id=category_id)
    for key, val in data.items():
        setattr(category, key, val)
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    category = db.query(TransactionCategory).filter(
        TransactionCategory.id == category_id, TransactionCategory.is_deleted == False, TransactionCategory.user_id == current_user.id
    ).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    category.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": category_id}


# ACCOUNTS (WALLETS)

@router.post("/accounts")
def create_account(account_in: FinanceAccountCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    acc = FinanceAccount(**account_in.model_dump(), opening_balance=account_in.balance, user_id=current_user.id)
    db.add(acc)
    db.commit()
    db.refresh(acc)
    return acc


@router.put("/accounts/{account_id}")
def update_account(account_id: str, account_in: FinanceAccountUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    acc = db.query(FinanceAccount).filter(
        FinanceAccount.id == account_id, FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    for key, val in account_in.model_dump(exclude_unset=True).items():
        setattr(acc, key, val)
    db.commit()
    db.refresh(acc)
    return acc


@router.delete("/accounts/{account_id}")
def delete_account(account_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    acc = db.query(FinanceAccount).filter(
        FinanceAccount.id == account_id, FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id
    ).first()
    if not acc:
        raise HTTPException(status_code=404, detail="Account not found")
    acc.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": account_id}


# TRANSACTIONS (LEDGER)

@router.get("/transactions")
def list_transactions(
    account_id: str | None = None,
    client_id: str | None = None,
    category: str | None = None,
    transaction_type: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FinanceTransaction).filter(FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id)
    if account_id:
        # A transfer's destination account only appears in to_account_id, not account_id — filtering
        # by account_id alone would hide incoming transfers from that account's own ledger view.
        query = query.filter(or_(FinanceTransaction.account_id == account_id, FinanceTransaction.to_account_id == account_id))
    if client_id:
        query = query.filter(FinanceTransaction.client_id == client_id)
    if category:
        query = query.filter(FinanceTransaction.category == category)
    if transaction_type:
        query = query.filter(FinanceTransaction.transaction_type == transaction_type)
    if start_date:
        query = query.filter(FinanceTransaction.date >= start_date)
    if end_date:
        query = query.filter(FinanceTransaction.date <= end_date)
    total = query.count()
    items = query.order_by(FinanceTransaction.date.desc(), FinanceTransaction.created_at.desc()).offset(offset).limit(limit).all()
    return {"items": items, "total": total}


@router.post("/transactions")
def create_transaction(tx_in: FinanceTransactionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if tx_in.transaction_type == "transfer" and not tx_in.to_account_id:
        raise HTTPException(status_code=400, detail="to_account_id is required for transfers")
    if tx_in.transaction_type == "transfer" and tx_in.to_account_id == tx_in.account_id:
        raise HTTPException(status_code=400, detail="Cannot transfer an account to itself")

    tx = FinanceTransaction(**tx_in.model_dump(), user_id=current_user.id)
    db.add(tx)
    _apply_transaction_effect(db, tx, sign=1, user_id=current_user.id)
    db.commit()
    db.refresh(tx)
    return tx


@router.put("/transactions/{transaction_id}")
def update_transaction(transaction_id: str, tx_in: FinanceTransactionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tx = db.query(FinanceTransaction).filter(
        FinanceTransaction.id == transaction_id, FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    _apply_transaction_effect(db, tx, sign=-1, user_id=current_user.id)  # reverse the old effect
    for key, val in tx_in.model_dump(exclude_unset=True).items():
        setattr(tx, key, val)
    _apply_transaction_effect(db, tx, sign=1, user_id=current_user.id)  # apply the new effect

    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tx = db.query(FinanceTransaction).filter(
        FinanceTransaction.id == transaction_id, FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    _apply_transaction_effect(db, tx, sign=-1, user_id=current_user.id)
    tx.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": transaction_id}


# GOALS

@router.post("/goals")
def create_goal(goal_in: FinancialGoalCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = FinancialGoal(**goal_in.model_dump(), user_id=current_user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    net_worth = compute_net_worth(db, current_user.id) if goal.goal_type == "net_worth" else None
    return _serialize_goal(goal, net_worth)


@router.put("/goals/{goal_id}")
def update_goal(goal_id: str, goal_in: FinancialGoalUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id, FinancialGoal.is_deleted == False, FinancialGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    for key, val in goal_in.model_dump(exclude_unset=True).items():
        setattr(goal, key, val)
    db.commit()
    db.refresh(goal)
    net_worth = compute_net_worth(db, current_user.id) if goal.goal_type == "net_worth" else None
    return _serialize_goal(goal, net_worth)


@router.delete("/goals/{goal_id}")
def delete_goal(goal_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    goal = db.query(FinancialGoal).filter(
        FinancialGoal.id == goal_id, FinancialGoal.is_deleted == False, FinancialGoal.user_id == current_user.id
    ).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": goal_id}


# BUDGETS

@router.get("/budgets")
def list_budgets(period: str = Query(..., description="YYYY-MM"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budgets = db.query(Budget).filter(Budget.period == period, Budget.is_deleted == False, Budget.user_id == current_user.id).all()
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.transaction_type == "expense",
        FinanceTransaction.is_deleted == False,
        FinanceTransaction.user_id == current_user.id,
        FinanceTransaction.date >= f"{period}-01",
        FinanceTransaction.date <= f"{period}-31",
    ).all()

    spent_by_category: dict[str, float] = {}
    for t in txs:
        spent_by_category[t.category] = spent_by_category.get(t.category, 0.0) + t.amount

    return [
        {
            "id": b.id,
            "category": b.category,
            "monthly_limit": b.monthly_limit,
            "period": b.period,
            "spent": round(spent_by_category.get(b.category, 0.0), 2),
        }
        for b in budgets
    ]


@router.post("/budgets")
def upsert_budget(budget_in: BudgetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(Budget).filter(
        Budget.category == budget_in.category,
        Budget.period == budget_in.period,
        Budget.is_deleted == False,
        Budget.user_id == current_user.id,
    ).first()
    if existing:
        existing.monthly_limit = budget_in.monthly_limit
        db.commit()
        db.refresh(existing)
        return existing

    budget = Budget(**budget_in.model_dump(), user_id=current_user.id)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/budgets/{budget_id}")
def delete_budget(budget_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(Budget.id == budget_id, Budget.is_deleted == False, Budget.user_id == current_user.id).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    budget.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": budget_id}


# REPORTS

@router.get("/reports")
def get_finance_reports(months: int = Query(6, ge=1, le=24), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = db.query(FinanceTransaction).filter(FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id).all()

    today = datetime.now(timezone.utc)
    month_keys = []
    cursor = today.replace(day=1)
    for _ in range(months):
        month_keys.append(cursor.strftime("%Y-%m"))
        cursor = (cursor - timedelta(days=1)).replace(day=1)
    month_keys.reverse()

    monthly_trend = []
    for m in month_keys:
        income = sum(t.amount for t in txs if t.transaction_type == "income" and t.date.startswith(m))
        expense = sum(t.amount for t in txs if t.transaction_type == "expense" and t.date.startswith(m))
        monthly_trend.append({"month": m, "income": round(income, 2), "expense": round(expense, 2)})

    current_month = today.strftime("%Y-%m")
    expense_by_category: dict[str, float] = {}
    for t in txs:
        if t.transaction_type == "expense" and t.date.startswith(current_month):
            expense_by_category[t.category] = expense_by_category.get(t.category, 0.0) + t.amount

    return {
        "monthly_trend": monthly_trend,
        "current_month_expense_by_category": {k: round(v, 2) for k, v in expense_by_category.items()},
    }


# INCOME STATEMENT

def _prior_period(period: str) -> str:
    year, month = int(period[:4]), int(period[5:7])
    if month == 1:
        return f"{year - 1}-12"
    return f"{year}-{month - 1:02d}"


def _period_totals(txs: list[FinanceTransaction], period: str) -> dict:
    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}
    for t in txs:
        if not t.date.startswith(period):
            continue
        if t.transaction_type == "income":
            income_by_category[t.category] = income_by_category.get(t.category, 0.0) + t.amount
        elif t.transaction_type == "expense":
            expense_by_category[t.category] = expense_by_category.get(t.category, 0.0) + t.amount
    total_income = sum(income_by_category.values())
    total_expense = sum(expense_by_category.values())
    return {
        "income_by_category": {k: round(v, 2) for k, v in sorted(income_by_category.items(), key=lambda kv: -kv[1])},
        "expense_by_category": {k: round(v, 2) for k, v in sorted(expense_by_category.items(), key=lambda kv: -kv[1])},
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_income": round(total_income - total_expense, 2),
    }


def _pct_change(current: float, prior: float) -> float | None:
    if prior == 0:
        return None
    return round(((current - prior) / abs(prior)) * 100, 1)


@router.get("/income-statement")
def get_income_statement(
    period: str = Query(..., description="YYYY-MM"),
    hours_worked: float | None = Query(None, gt=0, description="Hours worked this period, to compute hourly income"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    txs = db.query(FinanceTransaction).filter(FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id).all()
    current = _period_totals(txs, period)
    prior = _period_totals(txs, _prior_period(period))

    result = {
        "period": period,
        "prior_period": _prior_period(period),
        **current,
        "prior_total_income": prior["total_income"],
        "prior_total_expense": prior["total_expense"],
        "prior_net_income": prior["net_income"],
        "income_change_pct": _pct_change(current["total_income"], prior["total_income"]),
        "expense_change_pct": _pct_change(current["total_expense"], prior["total_expense"]),
        "net_income_change_pct": _pct_change(current["net_income"], prior["net_income"]),
        "savings_rate_pct": round((current["net_income"] / current["total_income"]) * 100, 1) if current["total_income"] else 0.0,
        "hours_worked": hours_worked,
        "hourly_gross_income": round(current["total_income"] / hours_worked, 2) if hours_worked else None,
        "hourly_net_income": round(current["net_income"] / hours_worked, 2) if hours_worked else None,
    }
    return result


# CASHFLOW FORECAST
#
# Driven by the Forecasted Income Statement's budget (not a trailing-average extrapolation): each
# month's budgeted income/expense (manual override if set, else the same trailing-average default
# the Forecasted Income Statement itself falls back to) is assumed to land in a lump sum on that
# month's last day. For the current, still-in-progress month, whatever's already actually happened
# is subtracted from the budget first, so the projection always reflects only what's left to come —
# no double-counting, and it tightens automatically as the month goes on.

MONTHS_PER_PERIOD = {"monthly": 1, "quarterly": 3, "semi_yearly": 6, "yearly": 12}
DEFAULT_CASHFLOW_PERIODS = {"monthly": 12, "quarterly": 8, "semi_yearly": 6, "yearly": 5}

# Used only by the separate simple /forecasted-income-statement endpoint below (an
# InsuranceTab.tsx dependency) — NOT by the cashflow forecast above, which is budget-driven.
GRANULARITY_DAYS = {
    "daily": 1,
    "weekly": 7,
    "monthly": 30,
    "quarterly": 91,
    "semi_yearly": 182,
    "yearly": 365,
}
DEFAULT_PERIODS = {
    "daily": 14,
    "weekly": 8,
    "monthly": 12,
    "quarterly": 8,
    "semi_yearly": 6,
    "yearly": 5,
}


def _month_end(y: int, m: int) -> date:
    return date(y, 12, 31) if m == 12 else date(y, m + 1, 1) - timedelta(days=1)


def _actual_so_far_this_month(db: Session, user_id: str, y: int, m: int, today: date) -> tuple[float, float]:
    start = f"{y:04d}-{m:02d}-01"
    end = today.isoformat()
    if start > end:
        return 0.0, 0.0
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == user_id,
        FinanceTransaction.date >= start, FinanceTransaction.date <= end,
    ).all()
    income = sum(t.amount for t in txs if t.transaction_type == "income")
    expense = sum(t.amount for t in txs if t.transaction_type == "expense")
    return income, expense


@router.get("/cashflow-forecast")
def get_cashflow_forecast(
    granularity: str = Query("monthly", pattern="^(monthly|quarterly|semi_yearly|yearly)$"),
    periods: int | None = Query(None, ge=1, le=20),
    include_standby_cash: bool = Query(False, description="Also count accounts flagged as standby cash in the starting balance"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    months_per_period = MONTHS_PER_PERIOD[granularity]
    num_periods = periods or DEFAULT_CASHFLOW_PERIODS[granularity]
    total_months = months_per_period * num_periods

    today = datetime.now(timezone.utc).date()
    starting_balance, _ = _cash_and_credit_balances(db, current_user.id)
    if include_standby_cash:
        standby_accounts = db.query(FinanceAccount).filter(
            FinanceAccount.user_id == current_user.id, FinanceAccount.is_deleted == False, FinanceAccount.is_standby_cash == True
        ).all()
        starting_balance += sum(a.balance for a in standby_accounts)

    rolling_months = []
    y, m = today.year, today.month
    for _ in range(total_months):
        rolling_months.append((y, m))
        m += 1
        if m > 12:
            m = 1
            y += 1

    budget_income: dict[tuple, float] = {}
    budget_expense: dict[tuple, float] = {}
    for yr in sorted({y for y, _m in rolling_months}):
        stmt = income_statement.build_statement(db, current_user.id, "monthly", yr, use_forecast_default=True)
        for idx in range(12):
            budget_income[(yr, idx + 1)] = stmt["income"]["total_income"]["periods"][idx]
            budget_expense[(yr, idx + 1)] = stmt["expense"]["total_expense"]["periods"][idx]

    running_balance = starting_balance
    forecast = []
    buckets = [rolling_months[i:i + months_per_period] for i in range(0, len(rolling_months), months_per_period)]
    for idx, bucket in enumerate(buckets, start=1):
        period_income = 0.0
        period_expense = 0.0
        for (by, bm) in bucket:
            act_income, act_expense = _actual_so_far_this_month(db, current_user.id, by, bm, today)
            period_income += max(0.0, budget_income.get((by, bm), 0.0) - act_income)
            period_expense += max(0.0, budget_expense.get((by, bm), 0.0) - act_expense)
        net = round(period_income - period_expense, 2)
        running_balance = round(running_balance + net, 2)
        last_y, last_m = bucket[-1]
        forecast.append({
            "period_index": idx,
            "period_end_date": _month_end(last_y, last_m).isoformat(),
            "projected_income": round(period_income, 2),
            "projected_expense": round(period_expense, 2),
            "projected_net": net,
            "projected_balance": running_balance,
        })

    return {
        "granularity": granularity,
        "current_balance": round(starting_balance, 2),
        "forecast": forecast,
    }


# FORECASTED INCOME STATEMENT — an Income Statement-shaped view of one Cashflow Forecast period,
# so both modules stay numerically consistent (same trailing-average methodology, same totals).

@router.get("/forecasted-income-statement")
def get_forecasted_income_statement(
    granularity: str = Query("monthly", description="daily, weekly, monthly, quarterly, semi_yearly, yearly"),
    lookback_days: int = Query(90, ge=7, le=730),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if granularity not in GRANULARITY_DAYS:
        raise HTTPException(status_code=400, detail=f"granularity must be one of {list(GRANULARITY_DAYS)}")
    period_days = GRANULARITY_DAYS[granularity]

    today = datetime.now(timezone.utc).date()
    lookback_start = (today - timedelta(days=lookback_days)).isoformat()
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False,
        FinanceTransaction.user_id == current_user.id,
        FinanceTransaction.date >= lookback_start,
    ).all()

    effective_days = max(lookback_days, 1)
    scale = period_days / effective_days

    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}
    for t in txs:
        if t.transaction_type == "income":
            income_by_category[t.category] = income_by_category.get(t.category, 0.0) + t.amount * scale
        elif t.transaction_type == "expense":
            expense_by_category[t.category] = expense_by_category.get(t.category, 0.0) + t.amount * scale

    total_income = round(sum(income_by_category.values()), 2)
    total_expense = round(sum(expense_by_category.values()), 2)
    net_income = round(total_income - total_expense, 2)

    return {
        "granularity": granularity,
        "period_days": period_days,
        "lookback_days": lookback_days,
        "income_by_category": {k: round(v, 2) for k, v in sorted(income_by_category.items(), key=lambda kv: -kv[1])},
        "expense_by_category": {k: round(v, 2) for k, v in sorted(expense_by_category.items(), key=lambda kv: -kv[1])},
        "total_income": total_income,
        "total_expense": total_expense,
        "net_income": net_income,
        "savings_rate_pct": round((net_income / total_income) * 100, 1) if total_income else 0.0,
    }


# STANDARD INCOME STATEMENT — shared grid engine (app/services/income_statement.py) used by both
# this forecasted view (defaults from the trailing-average projection) and the actual Income
# Statement grid below (defaults from real transactions). Any (year, month, category) cell the user
# hasn't edited falls back to that default, so the grid is fully populated on first load and only
# diverges where the user overrides it. Editing is only supported at monthly granularity —
# quarterly/semi_yearly/yearly are computed read-only rollups of the monthly data.


@router.get("/forecasted-income-statement/annual")
def get_annual_forecasted_income_statement(
    year: int = Query(..., ge=2000, le=2100),
    granularity: str = Query("monthly", description="monthly, quarterly, semi_yearly, yearly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return income_statement.build_statement(db, current_user.id, granularity, year, use_forecast_default=True)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/income-statement/grid")
def get_income_statement_grid(
    year: int = Query(..., ge=2000, le=2100),
    granularity: str = Query("monthly", description="monthly, quarterly, semi_yearly, yearly"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return income_statement.build_statement(db, current_user.id, granularity, year, use_forecast_default=False)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/forecasted-income-statement/annual/cell")
def upsert_annual_forecast_cell(cell: ForecastedIncomeStatementCellUpsert, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if cell.month < 1 or cell.month > 12:
        raise HTTPException(status_code=400, detail="month must be between 1 and 12")
    if cell.line_type not in ("income", "expense"):
        raise HTTPException(status_code=400, detail="line_type must be 'income' or 'expense'")

    entry = db.query(ForecastedIncomeStatementEntry).filter(
        ForecastedIncomeStatementEntry.is_deleted == False,
        ForecastedIncomeStatementEntry.user_id == current_user.id,
        ForecastedIncomeStatementEntry.year == cell.year,
        ForecastedIncomeStatementEntry.month == cell.month,
        ForecastedIncomeStatementEntry.line_type == cell.line_type,
        ForecastedIncomeStatementEntry.category == cell.category,
    ).first()
    if entry:
        entry.amount = cell.amount
    else:
        entry = ForecastedIncomeStatementEntry(**cell.model_dump(), user_id=current_user.id)
        db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/forecasted-income-statement/annual/cell")
def reset_annual_forecast_cell(
    year: int, month: int, line_type: str, category: str, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deletes a user override so the cell falls back to the trailing-average projection again."""
    entry = db.query(ForecastedIncomeStatementEntry).filter(
        ForecastedIncomeStatementEntry.is_deleted == False,
        ForecastedIncomeStatementEntry.user_id == current_user.id,
        ForecastedIncomeStatementEntry.year == year,
        ForecastedIncomeStatementEntry.month == month,
        ForecastedIncomeStatementEntry.line_type == line_type,
        ForecastedIncomeStatementEntry.category == category,
    ).first()
    if entry:
        entry.is_deleted = True
        db.commit()
    return {"status": "reset"}
