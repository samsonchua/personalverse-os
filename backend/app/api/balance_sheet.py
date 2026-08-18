from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import User, BalanceSheetItem, FinanceAccount, FinanceTransaction
from app.schemas.schemas import BalanceSheetItemCreate, BalanceSheetItemUpdate, BalanceSheetItemLinkAccount

router = APIRouter(prefix="/finance/balance-sheet", tags=["Balance Sheet"], dependencies=[Depends(get_current_user)])

VALID_CATEGORIES = {"fixed_asset", "current_asset", "fixed_liability", "current_liability"}
LIABILITY_CATEGORIES = {"fixed_liability", "current_liability"}
CASH_SUBCATEGORIES = {"cash", "bank"}
CREDIT_SUBCATEGORIES = {"credit_card"}


def _sign_adjust(item: BalanceSheetItem, raw: float | None) -> float | None:
    """Liability accounts store negative balances; balance sheet liability values are positive."""
    if raw is None:
        return None
    return abs(raw) if item.category in LIABILITY_CATEGORIES else raw


def _live_value(item: BalanceSheetItem, accounts_by_id: dict[str, FinanceAccount]) -> float:
    """An item linked to a live account tracks that account's current balance instead of its own
    stored `value` (a frozen manual fallback for unlinked items)."""
    account = accounts_by_id.get(item.linked_account_id) if item.linked_account_id else None
    value = _sign_adjust(item, account.balance) if account else None
    return item.value if value is None else value


def _balance_as_of(db: Session, user_id: str, account_id: str, current_balance: float, as_of: str) -> float:
    """Replays this account's transactions dated on/after `as_of` backward from its current
    balance — no stored history needed, the ledger already has everything. Mirrors the exact sign
    convention `_apply_transaction_effect` (finance.py) uses to apply them going forward."""
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.user_id == user_id, FinanceTransaction.is_deleted == False,
        FinanceTransaction.date >= as_of,
        or_(FinanceTransaction.account_id == account_id, FinanceTransaction.to_account_id == account_id),
    ).all()
    delta = 0.0
    for tx in txs:
        if tx.transaction_type == "income" and tx.account_id == account_id:
            delta += tx.amount
        elif tx.transaction_type == "expense" and tx.account_id == account_id:
            delta -= tx.amount
        elif tx.transaction_type == "transfer":
            if tx.account_id == account_id:
                delta -= tx.amount
            if tx.to_account_id == account_id:
                delta += tx.amount
    return current_balance - delta


def _compare_value(item: BalanceSheetItem, compare_balances_by_id: dict[str, float] | None) -> float:
    """Same idea as `_live_value` but reads a historical balance instead — items with no linked
    account (or no transaction history to replay) just keep their static stored value, so they
    contribute nothing to the variance either way."""
    if compare_balances_by_id is None or item.linked_account_id not in compare_balances_by_id:
        return item.value
    raw = compare_balances_by_id[item.linked_account_id]
    adjusted = _sign_adjust(item, raw)
    return item.value if adjusted is None else adjusted


def _nest_items(
    items: list[BalanceSheetItem], accounts_by_id: dict[str, FinanceAccount], compare_balances_by_id: dict[str, float] | None
) -> list[dict]:
    """Builds a parent -> sub_items tree. Orphaned children (a deleted/missing parent) surface at
    the top level rather than silently disappearing."""
    by_id = {i.id: {"item": i, "sub_items": []} for i in items}
    roots = []
    for i in items:
        node = by_id[i.id]
        if i.parent_id and i.parent_id in by_id:
            by_id[i.parent_id]["sub_items"].append(node)
        else:
            roots.append(node)

    def serialize(node) -> dict:
        i = node["item"]
        sub_items = [serialize(c) for c in node["sub_items"]]
        own_value = _live_value(i, accounts_by_id)
        total_value = own_value + sum(s["total_value"] for s in sub_items)
        account = accounts_by_id.get(i.linked_account_id) if i.linked_account_id else None
        opening_value = _sign_adjust(i, account.opening_balance) if account else None
        since_beginning = round(own_value - opening_value, 2) if opening_value is not None else None
        compare_value = None
        compare_variance = None
        if compare_balances_by_id is not None and i.linked_account_id in compare_balances_by_id:
            compare_value = _compare_value(i, compare_balances_by_id)
            compare_variance = round(own_value - compare_value, 2)
        return {
            "id": i.id, "category": i.category, "parent_id": i.parent_id, "subcategory": i.subcategory,
            "name": i.name, "value": own_value, "total_value": total_value,
            "instalment_amount": i.instalment_amount, "min_payment": i.min_payment,
            "nominee": i.nominee, "notes": i.notes, "created_at": i.created_at,
            "linked_account_id": i.linked_account_id, "is_live": i.linked_account_id in accounts_by_id,
            "opening_value": opening_value, "since_beginning": since_beginning,
            "compare_value": compare_value, "compare_variance": compare_variance,
            "sub_items": sub_items,
        }

    return [serialize(r) for r in roots]


def compute_net_worth(db: Session, user_id: str) -> float:
    """Reusable outside this router — e.g. a "net worth" Goal syncs its progress from this."""
    items = db.query(BalanceSheetItem).filter(BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == user_id).all()
    accounts_by_id = {
        a.id: a for a in db.query(FinanceAccount).filter(FinanceAccount.is_deleted == False, FinanceAccount.user_id == user_id).all()
    }
    total_assets = sum(_live_value(i, accounts_by_id) for i in items if i.category in ("fixed_asset", "current_asset"))
    total_liabilities = sum(_live_value(i, accounts_by_id) for i in items if i.category in ("fixed_liability", "current_liability"))
    return round(total_assets - total_liabilities, 2)


@router.get("")
def get_balance_sheet(
    compare_to: str | None = Query(None, description="YYYY-MM-DD; shows variance vs. this date, computed from transaction history"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items = db.query(BalanceSheetItem).filter(
        BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
    ).order_by(BalanceSheetItem.created_at).all()

    accounts_by_id = {
        a.id: a for a in db.query(FinanceAccount).filter(
            FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id
        ).all()
    }

    compare_balances_by_id = None
    if compare_to:
        compare_balances_by_id = {
            a.id: _balance_as_of(db, current_user.id, a.id, a.balance, compare_to) for a in accounts_by_id.values()
        }

    grouped_flat = {c: [] for c in VALID_CATEGORIES}
    for item in items:
        grouped_flat.setdefault(item.category, []).append(item)

    grouped_nested = {c: _nest_items(grouped_flat[c], accounts_by_id, compare_balances_by_id) for c in VALID_CATEGORIES}

    totals = {c: sum(_live_value(i, accounts_by_id) for i in grouped_flat[c]) for c in VALID_CATEGORIES}
    total_assets = totals["fixed_asset"] + totals["current_asset"]
    total_liabilities = totals["fixed_liability"] + totals["current_liability"]

    total_cash_balance = sum(
        _live_value(i, accounts_by_id) for i in grouped_flat["current_asset"] if i.subcategory in CASH_SUBCATEGORIES
    )
    total_credit_balance = sum(
        _live_value(i, accounts_by_id)
        for cat in ("fixed_liability", "current_liability") for i in grouped_flat[cat] if i.subcategory in CREDIT_SUBCATEGORIES
    )

    totals_response = {
        "fixed_assets": totals["fixed_asset"],
        "current_assets": totals["current_asset"],
        "fixed_liabilities": totals["fixed_liability"],
        "current_liabilities": totals["current_liability"],
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities,
        "total_cash_balance": round(total_cash_balance, 2),
        "total_credit_balance": round(total_credit_balance, 2),
    }

    if compare_balances_by_id is not None:
        compare_totals = {c: sum(_compare_value(i, compare_balances_by_id) for i in grouped_flat[c]) for c in VALID_CATEGORIES}
        compare_total_assets = compare_totals["fixed_asset"] + compare_totals["current_asset"]
        compare_total_liabilities = compare_totals["fixed_liability"] + compare_totals["current_liability"]
        totals_response.update({
            "compare_to": compare_to,
            "total_assets_change": round(total_assets - compare_total_assets, 2),
            "total_liabilities_change": round(total_liabilities - compare_total_liabilities, 2),
            "net_worth_change": round((total_assets - total_liabilities) - (compare_total_assets - compare_total_liabilities), 2),
        })

    return {
        "fixed_assets": grouped_nested["fixed_asset"],
        "current_assets": grouped_nested["current_asset"],
        "fixed_liabilities": grouped_nested["fixed_liability"],
        "current_liabilities": grouped_nested["current_liability"],
        "totals": totals_response,
    }


@router.post("/items")
def create_item(item_in: BalanceSheetItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if item_in.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {sorted(VALID_CATEGORIES)}")
    if item_in.parent_id:
        parent = db.query(BalanceSheetItem).filter(
            BalanceSheetItem.id == item_in.parent_id, BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
        ).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent item not found")
    item = BalanceSheetItem(**item_in.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.put("/items/{item_id}")
def update_item(item_id: str, item_in: BalanceSheetItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(BalanceSheetItem).filter(
        BalanceSheetItem.id == item_id, BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    data = item_in.model_dump(exclude_unset=True)
    if "category" in data and data["category"] not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"category must be one of {sorted(VALID_CATEGORIES)}")
    if data.get("parent_id") == item_id:
        raise HTTPException(status_code=400, detail="An item cannot be its own parent")
    for key, val in data.items():
        setattr(item, key, val)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/items/{item_id}")
def delete_item(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(BalanceSheetItem).filter(
        BalanceSheetItem.id == item_id, BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    item.is_deleted = True
    db.query(BalanceSheetItem).filter(
        BalanceSheetItem.parent_id == item_id, BalanceSheetItem.user_id == current_user.id
    ).update({"parent_id": None})
    db.commit()
    return {"status": "deleted", "id": item_id}


@router.post("/items/{item_id}/link-account")
def link_account(
    item_id: str, link_in: BalanceSheetItemLinkAccount, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Links this item to a live FinanceAccount so its value tracks that account's balance from now
    on. Either links an existing account, or creates a new one seeded with this item's current value
    as the opening balance (sign-flipped for liabilities, matching how loan/credit_card accounts are
    stored elsewhere)."""
    item = db.query(BalanceSheetItem).filter(
        BalanceSheetItem.id == item_id, BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if bool(link_in.account_id) == bool(link_in.create_account):
        raise HTTPException(status_code=400, detail="Provide exactly one of account_id or create_account")

    if link_in.account_id:
        account = db.query(FinanceAccount).filter(
            FinanceAccount.id == link_in.account_id, FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id
        ).first()
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
    else:
        opening_balance = -abs(item.value) if item.category in LIABILITY_CATEGORIES else item.value
        account = FinanceAccount(
            name=link_in.create_account.name,
            account_type=link_in.create_account.account_type,
            icon=link_in.create_account.icon,
            balance=opening_balance,
            opening_balance=opening_balance,
            user_id=current_user.id,
        )
        db.add(account)
        db.flush()  # populate account.id (client-side default) before linking

    item.linked_account_id = account.id
    db.commit()
    db.refresh(item)
    return item


@router.post("/items/{item_id}/unlink-account")
def unlink_account(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Freezes the item's value at the linked account's current balance, then detaches it — the
    number stops moving but isn't lost."""
    item = db.query(BalanceSheetItem).filter(
        BalanceSheetItem.id == item_id, BalanceSheetItem.is_deleted == False, BalanceSheetItem.user_id == current_user.id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.linked_account_id:
        accounts_by_id = {
            a.id: a for a in db.query(FinanceAccount).filter(
                FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id
            ).all()
        }
        item.value = _live_value(item, accounts_by_id)
        item.linked_account_id = None
    db.commit()
    db.refresh(item)
    return item
