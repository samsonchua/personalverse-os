from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import KnowledgeItem, User
from app.schemas.schemas import KnowledgeItemCreate, NotebookLMImportRequest
from app.services.ai_engine import ai_engine

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"], dependencies=[Depends(get_current_user)])

@router.get("/items")
def list_knowledge_items(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(KnowledgeItem).filter(KnowledgeItem.is_deleted == False, KnowledgeItem.user_id == current_user.id).order_by(KnowledgeItem.created_at.desc()).all()

@router.post("/items")
def create_knowledge_item(item_in: KnowledgeItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = KnowledgeItem(**item_in.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.post("/notebooklm/import")
def import_notebooklm(import_req: NotebookLMImportRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # AI process NotebookLM raw text synthesis
    ai_res = ai_engine.chat("research_agent", f"Synthesize NotebookLM notes for title '{import_req.title}': {import_req.raw_markdown[:300]}")

    item = KnowledgeItem(
        title=f"NotebookLM: {import_req.title}",
        item_type="notebooklm",
        content=import_req.raw_markdown,
        summary=ai_res["response"],
        tags=import_req.tags,
        key_takeaways_json=[
            "Key Principle 1: Knowledge centralization enables emergent insights",
            "Key Principle 2: Connect Second Brain entities to daily goals"
        ],
        user_id=current_user.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item
