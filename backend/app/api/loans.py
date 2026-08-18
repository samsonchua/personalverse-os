from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import User, Loan, FinanceAccount, FinanceTransaction, BalanceSheetItem
from app.schemas.schemas import LoanCreate, LoanPaymentLog

router = APIRouter(prefix="/finance/loans", tags=["Instalments & Loans"], dependencies=[Depends(get_current_user)])


def _add_months(d: date, months: int) -> date:
    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, 28)  # avoid month-length edge cases
    return date(year, month, day)


def _amortization_schedule(principal: float, annual_rate: float, tenure_months: int, start_date: str):
    monthly_rate = annual_rate / 12 / 100
    if monthly_rate == 0:
        monthly_payment = principal / tenure_months
    else:
        monthly_payment = principal * monthly_rate * (1 + monthly_rate) ** tenure_months / ((1 + monthly_rate) ** tenure_months - 1)

    try:
        start = date.fromisoformat(start_date)
    except ValueError:
        start = date.today()

    balance = principal
    schedule = []
    total_interest = 0.0
    for month in range(1, tenure_months + 1):
        interest = balance * monthly_rate
        principal_paid = min(monthly_payment - interest, balance)
        balance = max(0.0, balance - principal_paid)
        total_interest += interest
        schedule.append({
            "month": month,
            "date": _add_months(start, month).isoformat(),
            "payment": round(principal_paid + interest, 2),
            "principal": round(principal_paid, 2),
            "interest": round(interest, 2),
            "balance": round(balance, 2),
        })

    return {
        "monthly_payment": round(monthly_payment, 2),
        "total_interest": round(total_interest, 2),
        "total_paid": round(principal + total_interest, 2),
        "payoff_date": schedule[-1]["date"] if schedule else None,
        "schedule": schedule,
    }


@router.get("")
def list_loans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    loans = db.query(Loan).filter(Loan.is_deleted == False, Loan.user_id == current_user.id).order_by(Loan.created_at.desc()).all()
    results = []
    for loan in loans:
        summary = _amortization_schedule(loan.principal_amount, loan.annual_interest_rate, loan.tenure_months, loan.start_date)
        results.append({
            "id": loan.id,
            "name": loan.name,
            "loan_type": loan.loan_type,
            "principal_amount": loan.principal_amount,
            "annual_interest_rate": loan.annual_interest_rate,
            "tenure_months": loan.tenure_months,
            "start_date": loan.start_date,
            "linked_asset_id": loan.linked_asset_id,
            "notes": loan.notes,
            "monthly_payment": summary["monthly_payment"],
            "total_interest": summary["total_interest"],
            "total_paid": summary["total_paid"],
            "payoff_date": summary["payoff_date"],
        })
    return results


@router.post("")
def create_loan(loan_in: LoanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if loan_in.linked_asset_id:
        asset = db.query(BalanceSheetItem).filter(
            BalanceSheetItem.id == loan_in.linked_asset_id, BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
        ).first()
        if not asset:
            raise HTTPException(status_code=404, detail="Linked asset not found")
    loan = Loan(**loan_in.model_dump(), user_id=current_user.id)
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@router.delete("/{loan_id}")
def delete_loan(loan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.is_deleted == False, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    loan.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": loan_id}


@router.get("/{loan_id}/schedule")
def get_loan_schedule(loan_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.is_deleted == False, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return _amortization_schedule(loan.principal_amount, loan.annual_interest_rate, loan.tenure_months, loan.start_date)


@router.post("/{loan_id}/log-payment")
def log_payment(loan_id: str, payment_in: LoanPaymentLog, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Records an instalment payment as an expense transaction and, if the loan is linked to a
    balance sheet asset (e.g. a car), depreciates that asset by the same amount — the payment
    amount IS the depreciation amount, matching how instalment-financed assets actually lose
    book value here."""
    loan = db.query(Loan).filter(Loan.id == loan_id, Loan.is_deleted == False, Loan.user_id == current_user.id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    account = db.query(FinanceAccount).filter(
        FinanceAccount.id == payment_in.account_id, FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    amount = payment_in.amount
    if amount is None:
        amount = _amortization_schedule(loan.principal_amount, loan.annual_interest_rate, loan.tenure_months, loan.start_date)["monthly_payment"]

    tx = FinanceTransaction(
        account_id=payment_in.account_id,
        transaction_type="expense",
        amount=amount,
        category="Loan Payment",
        description=payment_in.notes or f"Instalment payment — {loan.name}",
        date=payment_in.date,
        user_id=current_user.id,
    )
    account.balance -= amount
    db.add(tx)

    depreciated_asset = None
    if loan.linked_asset_id:
        asset = db.query(BalanceSheetItem).filter(
            BalanceSheetItem.id == loan.linked_asset_id, BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
        ).first()
        if asset:
            asset.value = max(0.0, asset.value - amount)
            depreciated_asset = asset

    db.commit()
    db.refresh(tx)
    if depreciated_asset:
        db.refresh(depreciated_asset)

    return {
        "transaction": tx,
        "depreciated_asset": depreciated_asset,
        "depreciation_amount": amount if depreciated_asset else 0.0,
    }
