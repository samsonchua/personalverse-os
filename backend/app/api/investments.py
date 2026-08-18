from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import Investment, FinanceAccount, User
from app.schemas.schemas import InvestmentCreate, InvestmentUpdate
from app.services import price_feed

router = APIRouter(prefix="/finance/investments", tags=["Investment Portfolio"], dependencies=[Depends(get_current_user)])


def _sync_portfolio_accounts(db: Session, user_id: str) -> None:
    """Any account flagged tracks_investment_portfolio always mirrors the portfolio's total
    current value — so a Balance Sheet item linked to it (e.g. "Stocks") stays live without the
    user re-entering the total by hand every time a holding's price or units change."""
    investments = db.query(Investment).filter(Investment.user_id == user_id, Investment.is_deleted == False).all()
    total_value = sum(i.units * i.current_price_per_unit for i in investments)
    accounts = db.query(FinanceAccount).filter(
        FinanceAccount.user_id == user_id, FinanceAccount.is_deleted == False, FinanceAccount.tracks_investment_portfolio == True
    ).all()
    for a in accounts:
        a.balance = round(total_value, 2)


def _serialize(inv: Investment) -> dict:
    cost_basis = inv.units * inv.avg_cost_per_unit
    current_value = inv.units * inv.current_price_per_unit
    gain_loss = current_value - cost_basis
    gain_loss_pct = (gain_loss / cost_basis * 100) if cost_basis else 0.0
    return {
        "id": inv.id,
        "name": inv.name,
        "investment_type": inv.investment_type,
        "units": inv.units,
        "avg_cost_per_unit": inv.avg_cost_per_unit,
        "current_price_per_unit": inv.current_price_per_unit,
        "notes": inv.notes,
        "cost_basis": round(cost_basis, 2),
        "current_value": round(current_value, 2),
        "gain_loss": round(gain_loss, 2),
        "gain_loss_pct": round(gain_loss_pct, 2),
        "symbol": inv.symbol,
        "dividend_yield_pct": inv.dividend_yield_pct,
        "last_dividend_amount": inv.last_dividend_amount,
        "last_dividend_date": inv.last_dividend_date,
        "next_dividend_amount": inv.next_dividend_amount,
        "next_dividend_date": inv.next_dividend_date,
        "price_updated_at": inv.price_updated_at,
    }


@router.get("")
def list_investments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    investments = db.query(Investment).filter(Investment.user_id == current_user.id, Investment.is_deleted == False).order_by(Investment.created_at.desc()).all()
    return [_serialize(i) for i in investments]


@router.get("/summary")
def investment_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    investments = db.query(Investment).filter(Investment.user_id == current_user.id, Investment.is_deleted == False).all()
    serialized = [_serialize(i) for i in investments]

    total_cost = sum(i["cost_basis"] for i in serialized)
    total_value = sum(i["current_value"] for i in serialized)
    allocation: dict[str, float] = {}
    for i in serialized:
        allocation[i["investment_type"]] = allocation.get(i["investment_type"], 0.0) + i["current_value"]

    return {
        "total_cost_basis": round(total_cost, 2),
        "total_current_value": round(total_value, 2),
        "total_gain_loss": round(total_value - total_cost, 2),
        "total_gain_loss_pct": round((total_value - total_cost) / total_cost * 100, 2) if total_cost else 0.0,
        "allocation_by_type": {k: round(v, 2) for k, v in allocation.items()},
    }


@router.post("")
def create_investment(inv_in: InvestmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = Investment(**inv_in.model_dump(), user_id=current_user.id)
    db.add(inv)
    db.flush()
    _sync_portfolio_accounts(db, current_user.id)
    db.commit()
    db.refresh(inv)
    return _serialize(inv)


@router.put("/{investment_id}")
def update_investment(investment_id: str, inv_in: InvestmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = db.query(Investment).filter(Investment.id == investment_id, Investment.user_id == current_user.id, Investment.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    for key, val in inv_in.model_dump(exclude_unset=True).items():
        setattr(inv, key, val)
    db.flush()
    _sync_portfolio_accounts(db, current_user.id)
    db.commit()
    db.refresh(inv)
    return _serialize(inv)


@router.delete("/{investment_id}")
def delete_investment(investment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = db.query(Investment).filter(Investment.id == investment_id, Investment.user_id == current_user.id, Investment.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    inv.is_deleted = True
    db.flush()
    _sync_portfolio_accounts(db, current_user.id)
    db.commit()
    return {"status": "deleted", "id": investment_id}


def _refresh_one(inv: Investment) -> str | None:
    """Fetches live price + dividend info for one holding and applies it in place. Returns an error
    message on failure (holding is left untouched), or None on success — never raises, so a bulk
    refresh can report per-holding results instead of one bad symbol failing the whole batch."""
    if not inv.symbol:
        return "No symbol set for this holding"
    try:
        price = price_feed.fetch_latest_price(inv.symbol)
        if price is None:
            return f"No price data available for {inv.symbol}"
        inv.current_price_per_unit = price
        div_info = price_feed.fetch_dividend_info(inv.symbol, price)
        inv.dividend_yield_pct = div_info["dividend_yield_pct"]
        inv.last_dividend_amount = div_info["last_dividend_amount"]
        inv.last_dividend_date = div_info["last_dividend_date"]
        inv.price_updated_at = datetime.now(timezone.utc)
        return None
    except price_feed.PriceFeedError as e:
        return str(e)


@router.post("/{investment_id}/refresh")
def refresh_investment(investment_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    inv = db.query(Investment).filter(Investment.id == investment_id, Investment.user_id == current_user.id, Investment.is_deleted == False).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    error = _refresh_one(inv)
    if error:
        raise HTTPException(status_code=502, detail=error)
    db.flush()
    _sync_portfolio_accounts(db, current_user.id)
    db.commit()
    db.refresh(inv)
    return _serialize(inv)


@router.post("/refresh-all")
def refresh_all_investments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Refreshes every holding that has a symbol set. Holdings without one (or whose lookup fails)
    are reported back individually rather than blocking the rest of the portfolio."""
    investments = db.query(Investment).filter(Investment.user_id == current_user.id, Investment.is_deleted == False).all()
    results = []
    for inv in investments:
        error = _refresh_one(inv)
        results.append({"id": inv.id, "name": inv.name, "symbol": inv.symbol, "error": error})
    db.flush()
    _sync_portfolio_accounts(db, current_user.id)
    db.commit()
    return {"results": results, "refreshed": sum(1 for r in results if not r["error"])}
