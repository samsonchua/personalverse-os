"""
Shared "standard income statement" engine, used by both the actual Income Statement
(GET /finance/income-statement/grid) and the Forecasted Income Statement
(GET /finance/forecasted-income-statement/annual). Both statements share the same category
taxonomy (fixed/variable income with deduction nesting, fixed/variable/yearly/disbursement
expenses) and the same manual-override store (ForecastedIncomeStatementEntry, keyed by
year+month+line_type+category) — they differ only in what a cell defaults to when no override
exists: real transaction sums for "actual", the trailing-average projection for "forecast".

Money math is a flat sum per classification bucket, sign-flipped for `is_deduction` rows.
`parent_category_id` is display-only (drives indentation/ordering), never part of the sum — every
row, parent or child, contributes its own signed amount directly to its bucket's total.
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.models import FinanceTransaction, FinanceAccount, TransactionCategory, ForecastedIncomeStatementEntry

INCOME_CLASSIFICATIONS = ["fixed", "variable", "disbursement"]
EXPENSE_CLASSIFICATIONS = ["fixed", "variable", "yearly", "disbursement"]
GRANULARITIES = ("monthly", "quarterly", "semi_yearly", "yearly")

MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

# Transfers to these account types leave cash but represent a real financial event worth seeing on
# the Income Statement (paying down debt, topping up an investment, buying an asset) — surfaced as
# a synthetic "Transfer to {account name}" Disbursement Expense line. Transfers to bank/cash are
# pure internal movement between your own liquid accounts and have no P&L impact, so they're
# excluded.
TRANSFER_DISBURSEMENT_TYPES = {"loan", "credit_card", "investment", "asset"}


def _all_transfer_disbursement_rows(db: Session, user_id: str) -> list[tuple[str, str, float]]:
    """(synthetic category name, date, amount) for every qualifying transfer this user has ever
    made — unbounded by date. `build_statement` fetches this exactly once per request and hands it
    to both `_actual_monthly_sums` and `_default_monthly_projection`, which each need a different
    date slice of the same data; querying it twice (each needing its own transfer-txs + accounts
    round trip) used to cost 4 extra DB round trips per request for no reason."""
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False,
        FinanceTransaction.user_id == user_id,
        FinanceTransaction.transaction_type == "transfer",
    ).all()
    to_ids = {t.to_account_id for t in txs if t.to_account_id}
    if not to_ids:
        return []
    accounts_by_id = {a.id: a for a in db.query(FinanceAccount).filter(FinanceAccount.id.in_(to_ids)).all()}
    rows = []
    for t in txs:
        acc = accounts_by_id.get(t.to_account_id)
        if not acc or acc.account_type not in TRANSFER_DISBURSEMENT_TYPES:
            continue
        rows.append((f"Transfer to {acc.name}", t.date, t.amount))
    return rows


def _transfer_expense_rows(
    db: Session, user_id: str, start: str, end: str, all_rows: list[tuple[str, str, float]] | None = None
) -> list[tuple[str, str, float]]:
    """(synthetic category name, date, amount) for qualifying transfers in [start, end]. Pass
    `all_rows` (from `_all_transfer_disbursement_rows`) to filter in memory instead of re-querying —
    callers with no pre-fetched data (e.g. standalone `average_monthly_expense`) still work as before."""
    rows = all_rows if all_rows is not None else _all_transfer_disbursement_rows(db, user_id)
    return [r for r in rows if start <= r[1] <= end]


def valid_classifications(category_type: str) -> list[str]:
    return INCOME_CLASSIFICATIONS if category_type == "income" else EXPENSE_CLASSIFICATIONS


def _current_cash_balance(db: Session, user_id: str) -> float:
    """Today's actual total cash balance (bank + cash accounts) — the anchor point Beginning
    Balance is replayed backward from. Mirrors finance.py's `_cash_and_credit_balances` (kept as a
    separate small query here rather than imported, since finance.py imports this module)."""
    accounts = db.query(FinanceAccount).filter(
        FinanceAccount.is_deleted == False, FinanceAccount.user_id == user_id, FinanceAccount.account_type.in_(["cash", "bank"])
    ).all()
    return round(sum(a.balance for a in accounts), 2)


def average_monthly_expense(db: Session, user_id: str) -> float:
    """Trailing-average projected monthly expense — the same forward-looking figure the Emergency
    Fund uses, reused wherever "what does a typical month cost" is needed (e.g. EPF retirement
    readiness)."""
    _, expense_by_category = _default_monthly_projection(db, user_id)
    return round(sum(expense_by_category.values()), 2)


def _default_monthly_projection(
    db: Session, user_id: str, lookback_days: int = 90, transfer_rows: list[tuple[str, str, float]] | None = None
) -> tuple[dict[str, float], dict[str, float]]:
    """Trailing-average monthly income/expense per category, normalized to a 30-day month. Pass
    `transfer_rows` (from `_all_transfer_disbursement_rows`) when the caller already has it, to
    avoid a redundant DB round trip."""
    today = datetime.now(timezone.utc).date()
    lookback_start = (today - timedelta(days=lookback_days)).isoformat()
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False,
        FinanceTransaction.user_id == user_id,
        FinanceTransaction.date >= lookback_start,
    ).all()

    effective_days = max(lookback_days, 1)
    scale = 30 / effective_days

    income_by_category: dict[str, float] = {}
    expense_by_category: dict[str, float] = {}
    for t in txs:
        if t.transaction_type == "income":
            income_by_category[t.category] = income_by_category.get(t.category, 0.0) + t.amount * scale
        elif t.transaction_type == "expense":
            expense_by_category[t.category] = expense_by_category.get(t.category, 0.0) + t.amount * scale
    for name, _date, amount in _transfer_expense_rows(db, user_id, lookback_start, today.isoformat(), transfer_rows):
        expense_by_category[name] = expense_by_category.get(name, 0.0) + amount * scale
    return income_by_category, expense_by_category


def _actual_monthly_sums(
    db: Session, user_id: str, years: list[int], transfer_rows: list[tuple[str, str, float]] | None = None
) -> dict[tuple, float]:
    """Real per-(line_type, category, year, month) transaction sums across the given years. Pass
    `transfer_rows` (from `_all_transfer_disbursement_rows`) when the caller already has it, to
    avoid a redundant DB round trip."""
    start = f"{min(years)}-01-01"
    end = f"{max(years)}-12-31"
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False,
        FinanceTransaction.user_id == user_id,
        FinanceTransaction.date >= start,
        FinanceTransaction.date <= end,
    ).all()
    result: dict[tuple, float] = {}
    for t in txs:
        if t.transaction_type not in ("income", "expense"):
            continue
        y, m = int(t.date[:4]), int(t.date[5:7])
        key = (t.transaction_type, t.category, y, m)
        result[key] = result.get(key, 0.0) + t.amount
    for name, date, amount in _transfer_expense_rows(db, user_id, start, end, transfer_rows):
        y, m = int(date[:4]), int(date[5:7])
        key = ("expense", name, y, m)
        result[key] = result.get(key, 0.0) + amount
    return result


def _years_for(granularity: str, year: int) -> list[int]:
    if granularity == "yearly":
        return list(range(year - 4, year + 1))
    return [year]


def _month_buckets(granularity: str, years: list[int]) -> list[list[tuple[int, int]]]:
    if granularity == "yearly":
        return [[(y, m) for m in range(1, 13)] for y in years]
    year = years[0]
    all_months = [(year, m) for m in range(1, 13)]
    if granularity == "monthly":
        return [[mo] for mo in all_months]
    if granularity == "quarterly":
        return [all_months[i:i + 3] for i in range(0, 12, 3)]
    if granularity == "semi_yearly":
        return [all_months[0:6], all_months[6:12]]
    raise ValueError(f"Unknown granularity: {granularity}")


def _period_labels(granularity: str, years: list[int]) -> list[str]:
    if granularity == "yearly":
        return [str(y) for y in years]
    if granularity == "monthly":
        return list(MONTH_SHORT)
    if granularity == "quarterly":
        return ["Q1", "Q2", "Q3", "Q4"]
    if granularity == "semi_yearly":
        return ["H1", "H2"]
    raise ValueError(f"Unknown granularity: {granularity}")


def _order_category_names(names: set[str], category_type: str, cat_by_name: dict[str, TransactionCategory]) -> list[str]:
    """Roots (alphabetical) each immediately followed by their children (alphabetical), recursively.
    Categories with no matching TransactionCategory row (derived only from transaction history)
    are treated as roots too.

    `names` is already filtered to one classification bucket (see `build_bucket`) — a child whose
    parent has a *different* classification (e.g. a "variable" child under a "fixed" parent, which
    is legal: `parent_category_id` is purely a display grouping, never part of bucket placement)
    won't have that parent in `names`. Such a child must be treated as a root within this bucket, or
    the walk below — which only starts from roots — would never reach it and it would silently
    vanish from the statement entirely rather than just losing its indentation."""
    ids_in_names = {cat_by_name[n].id for n in names if n in cat_by_name}
    children_of: dict[str, list[str]] = {}
    roots: list[str] = []
    for name in names:
        c = cat_by_name.get(name)
        if c and c.parent_category_id and c.parent_category_id in ids_in_names:
            children_of.setdefault(c.parent_category_id, []).append(name)
        else:
            roots.append(name)
    roots.sort()
    for k in children_of:
        children_of[k].sort()

    ordered: list[str] = []

    def walk(name: str):
        ordered.append(name)
        c = cat_by_name.get(name)
        if c:
            for child_name in children_of.get(c.id, []):
                walk(child_name)

    for r in roots:
        walk(r)
    return ordered


def build_statement(db: Session, user_id: str, granularity: str, year: int, use_forecast_default: bool) -> dict:
    if granularity not in GRANULARITIES:
        raise ValueError(f"granularity must be one of {GRANULARITIES}")

    years = _years_for(granularity, year)
    buckets = _month_buckets(granularity, years)
    labels = _period_labels(granularity, years)
    editable = granularity == "monthly"
    period_year_month = [b[0] for b in buckets] if editable else None

    # Fetched once and reused everywhere below that needs it — each of the two call sites used to
    # independently re-query the same transfer transactions + accounts, costing several redundant
    # DB round trips per request (painful when the DB is geographically far from the app server).
    transfer_rows = _all_transfer_disbursement_rows(db, user_id)

    entries = db.query(ForecastedIncomeStatementEntry).filter(
        ForecastedIncomeStatementEntry.is_deleted == False,
        ForecastedIncomeStatementEntry.user_id == user_id,
        ForecastedIncomeStatementEntry.year.in_(years),
    ).all()
    overrides = {(e.line_type, e.category, e.year, e.month): e.amount for e in entries}

    if use_forecast_default:
        default_income, default_expense = _default_monthly_projection(db, user_id, transfer_rows=transfer_rows)

        def default_amount(line_type: str, category: str, y: int, m: int) -> float:
            source = default_income if line_type == "income" else default_expense
            return source.get(category, 0.0)
    else:
        actual_map = _actual_monthly_sums(db, user_id, years, transfer_rows=transfer_rows)
        default_income, default_expense = None, None  # computed lazily below only if needed for the emergency fund

        def default_amount(line_type: str, category: str, y: int, m: int) -> float:
            return actual_map.get((line_type, category, y, m), 0.0)

    categories = db.query(TransactionCategory).filter(
        TransactionCategory.is_deleted == False, TransactionCategory.user_id == user_id
    ).all()
    cat_by_name = {"income": {}, "expense": {}}
    category_names: dict[str, set] = {"income": set(), "expense": set()}
    for c in categories:
        cat_by_name.setdefault(c.category_type, {})[c.name] = c
        category_names.setdefault(c.category_type, set()).add(c.name)
    if use_forecast_default:
        for cat in default_income:
            category_names["income"].add(cat)
        for cat in default_expense:
            category_names["expense"].add(cat)
    else:
        for (lt, cat, _y, _m) in actual_map:
            category_names.setdefault(lt, set()).add(cat)
    for (lt, cat, _y, _m) in overrides:
        category_names.setdefault(lt, set()).add(cat)

    def line_amounts(line_type: str, category: str) -> list[float]:
        result = []
        for bucket in buckets:
            total = 0.0
            for (y, m) in bucket:
                val = overrides.get((line_type, category, y, m))
                if val is None:
                    val = default_amount(line_type, category, y, m)
                total += val
            result.append(round(total, 2))
        return result

    def classification_of(line_type: str, name: str) -> str:
        meta = cat_by_name.get(line_type, {}).get(name)
        if meta and meta.classification:
            return meta.classification
        if line_type == "expense" and name.startswith("Transfer to "):
            return "disbursement"
        return "variable"

    def build_bucket(line_type: str, classification: str) -> dict:
        names = {n for n in category_names.get(line_type, set()) if classification_of(line_type, n) == classification}
        ordered_names = _order_category_names(names, line_type, cat_by_name.get(line_type, {}))
        lines = []
        for name in ordered_names:
            meta = cat_by_name.get(line_type, {}).get(name)
            is_deduction = bool(meta and meta.is_deduction)
            is_credit_card = bool(meta and meta.is_credit_card)
            parent_name = None
            if meta and meta.parent_category_id:
                parent = next((c for c in cat_by_name.get(line_type, {}).values() if c.id == meta.parent_category_id), None)
                parent_name = parent.name if parent else None
            sign = -1 if is_deduction else 1
            raw = line_amounts(line_type, name)
            periods = [round(a * sign, 2) for a in raw]
            lines.append({
                "category": name,
                "is_deduction": is_deduction,
                "is_credit_card": is_credit_card,
                "parent_category": parent_name,
                "periods": periods,
                "average": round(sum(periods) / len(periods), 2) if periods else 0.0,
                "total": round(sum(periods), 2),
            })
        n = len(buckets)
        periods_total = [round(sum(l["periods"][i] for l in lines), 2) for i in range(n)]
        return {
            "classification": classification,
            "lines": lines,
            "periods": periods_total,
            "average": round(sum(periods_total) / n, 2) if n else 0.0,
            "total": round(sum(periods_total), 2),
        }

    n = len(buckets)
    income_buckets = {c: build_bucket("income", c) for c in INCOME_CLASSIFICATIONS}
    expense_buckets = {c: build_bucket("expense", c) for c in EXPENSE_CLASSIFICATIONS}

    total_income_periods = [round(sum(income_buckets[c]["periods"][i] for c in INCOME_CLASSIFICATIONS), 2) for i in range(n)]
    credit_card_lines = [l for c in INCOME_CLASSIFICATIONS for l in income_buckets[c]["lines"] if l["is_credit_card"]]
    cc_periods = [round(sum(l["periods"][i] for l in credit_card_lines), 2) for i in range(n)]
    total_income_excl_cc_periods = [round(total_income_periods[i] - cc_periods[i], 2) for i in range(n)]

    total_expense_periods = [round(sum(expense_buckets[c]["periods"][i] for c in EXPENSE_CLASSIFICATIONS), 2) for i in range(n)]
    net_income_periods = [round(total_income_periods[i] - total_expense_periods[i], 2) for i in range(n)]

    # Beginning Balance per period, anchored to today's actual cash balance and replayed backward —
    # same idea as the Balance Sheet's `since_beginning` (balance_sheet.py's `_balance_as_of`), just
    # applied to the whole statement's net income instead of one account's transactions. The LAST
    # period's ending balance (beginning + that period's net income) always equals today's actual
    # balance; every earlier period is derived by peeling off later periods' net income in reverse.
    # For a fully past year this is an approximation (transactions after that year also happened),
    # but there's no stored historical balance to replay against otherwise.
    current_cash_balance = _current_cash_balance(db, user_id)
    beginning_balance_periods = [0.0] * n
    running = current_cash_balance
    for i in range(n - 1, -1, -1):
        running -= net_income_periods[i]
        beginning_balance_periods[i] = round(running, 2)

    # Emergency fund is always the forward-looking trailing-average projection, regardless of
    # whether this statement itself is "actual" or "forecast" — it's a planning constant, not a
    # per-period figure, so the same amount is subtracted from every period's net income. Reuses the
    # projection already computed above for the forecast-default case instead of recomputing it.
    if default_expense is None:
        _, default_expense = _default_monthly_projection(db, user_id, transfer_rows=transfer_rows)
    ef_default_expense = default_expense
    avg_monthly_expense_projected = round(sum(ef_default_expense.values()), 2)
    emergency_fund_3mo = round(avg_monthly_expense_projected * 3, 2)
    cash_surplus_periods = [round(net_income_periods[i] - emergency_fund_3mo, 2) for i in range(n)]

    def summarize(periods: list[float]) -> dict:
        return {"periods": periods, "average": round(sum(periods) / n, 2) if n else 0.0, "total": round(sum(periods), 2)}

    # Cash Surplus' Total/Average must NOT sum the per-period figures — each period already has the
    # same emergency_fund_3mo constant subtracted, so naively summing 12 of them would subtract the
    # fund 12 times over. The Total instead subtracts it once from the annual Net Income total.
    cash_surplus_summary = summarize(cash_surplus_periods)
    cash_surplus_summary["total"] = round(sum(net_income_periods) - emergency_fund_3mo, 2)
    cash_surplus_summary["average"] = round(cash_surplus_summary["total"] / n, 2) if n else 0.0

    # Beginning Balance's "Total" column is the running balance's actual endpoint (today's cash
    # balance) rather than a sum — summing 12 different months' starting balances has no real
    # meaning, but "where the balance ended up" does.
    beginning_balance_summary = summarize(beginning_balance_periods)
    beginning_balance_summary["total"] = current_cash_balance

    analysis = {
        "fixed": {
            "income": income_buckets["fixed"]["total"], "expense": expense_buckets["fixed"]["total"],
            "diff": round(income_buckets["fixed"]["total"] - expense_buckets["fixed"]["total"], 2),
        },
        "variable": {
            "income": income_buckets["variable"]["total"], "expense": expense_buckets["variable"]["total"],
            "diff": round(income_buckets["variable"]["total"] - expense_buckets["variable"]["total"], 2),
        },
    }

    return {
        "granularity": granularity,
        "year": year,
        "years": years,
        "period_labels": labels,
        "editable": editable,
        "period_year_month": period_year_month,
        "beginning_balance": beginning_balance_summary,
        "income": {
            "fixed": income_buckets["fixed"],
            "variable": income_buckets["variable"],
            "disbursement": income_buckets["disbursement"],
            "total_income": summarize(total_income_periods),
            "total_income_excl_credit_card": summarize(total_income_excl_cc_periods),
            "gross_disposable_income": summarize(total_income_periods),
        },
        "expense": {
            "fixed": expense_buckets["fixed"],
            "variable": expense_buckets["variable"],
            "yearly": expense_buckets["yearly"],
            "disbursement": expense_buckets["disbursement"],
            "total_expense": summarize(total_expense_periods),
        },
        "net_income": summarize(net_income_periods),
        "emergency_fund_3mo": emergency_fund_3mo,
        "cash_surplus": cash_surplus_summary,
        "analysis": analysis,
    }
