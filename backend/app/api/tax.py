from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import User
from app.schemas.schemas import TaxCalculateRequest, FormBEstimateRequest
from app.services import income_statement

router = APIRouter(prefix="/finance/tax", tags=["Income Tax Planning"], dependencies=[Depends(get_current_user)])

# Malaysia resident individual progressive tax brackets (LHDN). Verify against
# the current Year of Assessment before relying on this for a real filing —
# brackets/reliefs are revised periodically by the government.
# Each entry: (lower_bound_inclusive, upper_bound_inclusive_or_None, rate_percent)
TAX_BRACKETS = [
    (0, 5_000, 0.0),
    (5_000, 20_000, 1.0),
    (20_000, 35_000, 3.0),
    (35_000, 50_000, 6.0),
    (50_000, 70_000, 11.0),
    (70_000, 100_000, 19.0),
    (100_000, 400_000, 25.0),
    (400_000, 600_000, 26.0),
    (600_000, 2_000_000, 28.0),
    (2_000_000, None, 30.0),
]

# Common relief categories shown to the user as suggestions — not exhaustive
# of every LHDN relief, and caps should be verified for the current YA.
SUGGESTED_RELIEFS = [
    {"name": "Individual relief", "typical_amount": 9000},
    {"name": "EPF contribution", "typical_amount": 4000},
    {"name": "Life insurance premium", "typical_amount": 3000},
    {"name": "SOCSO contribution", "typical_amount": 350},
    {"name": "Lifestyle relief (books, gadgets, internet)", "typical_amount": 2500},
    {"name": "Medical expenses (self/family)", "typical_amount": 8000},
    {"name": "Child relief (per child, unmarried & under 18)", "typical_amount": 2000},
]


def _compute_tax(annual_income: float, reliefs: list) -> dict:
    total_reliefs = sum(r.amount for r in reliefs)
    chargeable_income = max(0.0, annual_income - total_reliefs)

    tax_by_bracket = []
    total_tax = 0.0
    marginal_rate = 0.0

    for lower, upper, rate in TAX_BRACKETS:
        if chargeable_income <= lower:
            break  # chargeable income doesn't reach this bracket
        bracket_top = upper if upper is not None else chargeable_income
        taxable_in_bracket = min(chargeable_income, bracket_top) - lower
        if taxable_in_bracket <= 0:
            continue
        bracket_tax = taxable_in_bracket * rate / 100
        tax_by_bracket.append({
            "range": f"RM{lower:,.0f} - {('RM' + format(upper, ',.0f')) if upper else 'above'}",
            "rate_percent": rate,
            "taxable_amount": round(taxable_in_bracket, 2),
            "tax": round(bracket_tax, 2),
        })
        total_tax += bracket_tax
        marginal_rate = rate

    effective_rate = (total_tax / annual_income * 100) if annual_income else 0.0
    net_income = annual_income - total_tax

    return {
        "annual_income": annual_income,
        "total_reliefs": round(total_reliefs, 2),
        "chargeable_income": round(chargeable_income, 2),
        "tax_by_bracket": tax_by_bracket,
        "total_tax": round(total_tax, 2),
        "effective_rate_percent": round(effective_rate, 2),
        "marginal_rate_percent": marginal_rate,
        "net_income": round(net_income, 2),
        "monthly_net_income": round(net_income / 12, 2),
    }


@router.get("/suggested-reliefs")
def get_suggested_reliefs():
    return SUGGESTED_RELIEFS


@router.post("/calculate")
def calculate_tax(req: TaxCalculateRequest):
    return _compute_tax(req.annual_income, req.reliefs)


def _income_source(category: str, parent_category: str | None) -> str:
    """Form B separates statutory income by source. We piggyback on the Income Statement's
    category taxonomy rather than inventing a new one: a line (or its parent) named "Business"
    counts as business income, "Salary" as employment income, everything else as other income."""
    name = parent_category or category
    if name == "Business":
        return "business"
    if name == "Salary":
        return "employment"
    return "other"


@router.post("/form-b-estimate")
def form_b_estimate(req: FormBEstimateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Form B-style annual estimate: business/employment/other statutory income sourced from the
    Income Statement — actual figures for months already past, the Forecasted Income Statement's
    budget for months still ahead — fed into the same progressive tax calculation as /calculate."""
    today = datetime.now(timezone.utc).date()

    def monthly_sources(use_forecast_default: bool) -> list[dict]:
        stmt = income_statement.build_statement(db, current_user.id, "monthly", req.year, use_forecast_default=use_forecast_default)
        result = [{"business": 0.0, "employment": 0.0, "other": 0.0} for _ in range(12)]
        for classification in ("fixed", "variable"):
            for line in stmt["income"][classification]["lines"]:
                source = _income_source(line["category"], line["parent_category"])
                for i in range(12):
                    result[i][source] += line["periods"][i]
        return result

    actual_monthly = monthly_sources(use_forecast_default=False)
    forecast_monthly = monthly_sources(use_forecast_default=True)

    monthly_breakdown = []
    totals = {"business": 0.0, "employment": 0.0, "other": 0.0}
    for m in range(12):
        is_past_or_current = req.year < today.year or (req.year == today.year and (m + 1) <= today.month)
        data = actual_monthly[m] if is_past_or_current else forecast_monthly[m]
        monthly_breakdown.append({
            "month": m + 1,
            "source": "actual" if is_past_or_current else "forecast",
            "business": round(data["business"], 2),
            "employment": round(data["employment"], 2),
            "other": round(data["other"], 2),
        })
        for k in totals:
            totals[k] += data[k]

    statutory_business_income = round(totals["business"], 2)
    statutory_employment_income = round(totals["employment"], 2)
    other_income = round(totals["other"], 2)
    aggregate_income = round(statutory_business_income + statutory_employment_income + other_income, 2)

    return {
        "year": req.year,
        "monthly_breakdown": monthly_breakdown,
        "statutory_business_income": statutory_business_income,
        "statutory_employment_income": statutory_employment_income,
        "other_income": other_income,
        "aggregate_income": aggregate_income,
        "tax": _compute_tax(aggregate_income, req.reliefs),
    }
