from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import JournalEntry, User
from app.schemas.schemas import JournalEntryCreate

router = APIRouter(prefix="/second-brain", tags=["Second Brain"], dependencies=[Depends(get_current_user)])

@router.get("/entries")
def get_journal_entries(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(JournalEntry).filter(JournalEntry.is_deleted == False, JournalEntry.user_id == current_user.id).order_by(JournalEntry.created_at.desc()).all()

@router.post("/entries")
def create_journal_entry(entry_in: JournalEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    entry = JournalEntry(**entry_in.model_dump(), user_id=current_user.id)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
