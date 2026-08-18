from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import EPFProfile, FinanceAccount, User
from app.schemas.schemas import EPFProfileUpsert
from app.services.income_statement import average_monthly_expense

router = APIRouter(prefix="/finance/epf", tags=["EPF & Retirement"], dependencies=[Depends(get_current_user)])


def _get_active_profile(db: Session, user_id: str) -> EPFProfile | None:
    return db.query(EPFProfile).filter(EPFProfile.user_id == user_id, EPFProfile.is_deleted == False).order_by(EPFProfile.created_at.desc()).first()


def _synced_balance(db: Session, user_id: str) -> float | None:
    """Sum of every account flagged counts_toward_epf — None if none are flagged, so callers can
    fall back to the manually-entered profile balance."""
    accounts = db.query(FinanceAccount).filter(
        FinanceAccount.user_id == user_id, FinanceAccount.is_deleted == False, FinanceAccount.counts_toward_epf == True
    ).all()
    if not accounts:
        return None
    return round(sum(a.balance for a in accounts), 2)


def _profile_with_sync(profile: EPFProfile, synced: float | None) -> dict:
    return {
        "id": profile.id,
        "current_balance": synced if synced is not None else profile.current_balance,
        "monthly_salary": profile.monthly_salary,
        "employee_contribution_rate": profile.employee_contribution_rate,
        "employer_contribution_rate": profile.employer_contribution_rate,
        "annual_dividend_rate": profile.annual_dividend_rate,
        "current_age": profile.current_age,
        "retirement_age": profile.retirement_age,
        "safe_withdrawal_rate": profile.safe_withdrawal_rate or 4.0,
        "is_balance_synced": synced is not None,
    }


@router.get("")
def get_profile(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = _get_active_profile(db, current_user.id)
    if not profile:
        return None
    return _profile_with_sync(profile, _synced_balance(db, current_user.id))


@router.post("")
def upsert_profile(profile_in: EPFProfileUpsert, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = _get_active_profile(db, current_user.id)
    if existing:
        for key, val in profile_in.model_dump().items():
            setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return existing

    profile = EPFProfile(**profile_in.model_dump(), user_id=current_user.id)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/forecast")
def get_forecast(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = _get_active_profile(db, current_user.id)
    if not profile:
        return {"years": [], "projected_retirement_balance": 0.0}

    annual_contribution = profile.monthly_salary * 12 * (
        (profile.employee_contribution_rate + profile.employer_contribution_rate) / 100
    )
    dividend_rate = profile.annual_dividend_rate / 100

    synced = _synced_balance(db, current_user.id)
    balance = synced if synced is not None else profile.current_balance
    years = []
    for age in range(profile.current_age, profile.retirement_age + 1):
        if age > profile.current_age:
            balance = balance * (1 + dividend_rate) + annual_contribution
        years.append({"age": age, "balance": round(balance, 2)})

    projected_retirement_balance = round(years[-1]["balance"], 2) if years else 0.0
    withdrawal_rate = (profile.safe_withdrawal_rate or 4.0) / 100
    projected_monthly_retirement_income = round(projected_retirement_balance * withdrawal_rate / 12, 2)
    current_avg_monthly_expense = average_monthly_expense(db, current_user.id)
    retirement_income_gap = round(projected_monthly_retirement_income - current_avg_monthly_expense, 2)

    return {
        "years": years,
        "annual_contribution": round(annual_contribution, 2),
        "projected_retirement_balance": projected_retirement_balance,
        "safe_withdrawal_rate": profile.safe_withdrawal_rate or 4.0,
        "projected_monthly_retirement_income": projected_monthly_retirement_income,
        "current_avg_monthly_expense": current_avg_monthly_expense,
        "retirement_income_gap": retirement_income_gap,
        "is_on_track": retirement_income_gap >= 0,
    }
