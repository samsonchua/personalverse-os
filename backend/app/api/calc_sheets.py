from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import CalcSheet, User
from app.schemas.schemas import CalcSheetCreate, CalcSheetUpdate

router = APIRouter(prefix="/calc-sheets", tags=["Calc Sheet"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_sheets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(CalcSheet)
        .filter(CalcSheet.user_id == current_user.id, CalcSheet.is_deleted == False)
        .order_by(CalcSheet.updated_at.desc())
        .all()
    )


@router.post("")
def create_sheet(sheet_in: CalcSheetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = CalcSheet(**sheet_in.model_dump(), user_id=current_user.id)
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.put("/{sheet_id}")
def update_sheet(sheet_id: str, sheet_in: CalcSheetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(CalcSheet).filter(CalcSheet.id == sheet_id, CalcSheet.user_id == current_user.id, CalcSheet.is_deleted == False).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    for key, val in sheet_in.model_dump(exclude_unset=True).items():
        setattr(sheet, key, val)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.delete("/{sheet_id}")
def delete_sheet(sheet_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sheet = db.query(CalcSheet).filter(CalcSheet.id == sheet_id, CalcSheet.user_id == current_user.id, CalcSheet.is_deleted == False).first()
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found")
    sheet.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": sheet_id}
