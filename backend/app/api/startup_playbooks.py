from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import StartupPlaybook, User
from app.schemas.schemas import StartupPlaybookCreate, StartupPlaybookUpdate, StartupPlaybookGenerateRequest
from app.services.startup_playbook_generator import generate_playbook

router = APIRouter(prefix="/startup-playbooks", tags=["Startup Playbook"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_playbooks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(StartupPlaybook)
        .filter(StartupPlaybook.is_deleted == False, StartupPlaybook.user_id == current_user.id)
        .order_by(StartupPlaybook.created_at.desc())
        .all()
    )


@router.post("/generate")
def generate(req: StartupPlaybookGenerateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = generate_playbook(req.name)
    playbook = StartupPlaybook(
        name=req.name,
        industry=data.get("industry"),
        founding_story=data.get("founding_story"),
        initial_cost_estimate=data.get("initial_cost_estimate"),
        initial_cost_notes=data.get("initial_cost_notes"),
        business_plan_summary=data.get("business_plan_summary"),
        key_details=data.get("key_details"),
        roi_notes=data.get("roi_notes"),
        tags=", ".join(data.get("tags", [])) if isinstance(data.get("tags"), list) else data.get("tags"),
        source=data.get("_source", "manual"),
        user_id=current_user.id,
    )
    db.add(playbook)
    db.commit()
    db.refresh(playbook)
    return playbook


@router.post("")
def create_playbook(playbook_in: StartupPlaybookCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    playbook = StartupPlaybook(**playbook_in.model_dump(), source="manual", user_id=current_user.id)
    db.add(playbook)
    db.commit()
    db.refresh(playbook)
    return playbook


@router.put("/{playbook_id}")
def update_playbook(playbook_id: str, playbook_in: StartupPlaybookUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    playbook = db.query(StartupPlaybook).filter(
        StartupPlaybook.id == playbook_id, StartupPlaybook.is_deleted == False, StartupPlaybook.user_id == current_user.id
    ).first()
    if not playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    for key, val in playbook_in.model_dump(exclude_unset=True).items():
        setattr(playbook, key, val)
    db.commit()
    db.refresh(playbook)
    return playbook


@router.delete("/{playbook_id}")
def delete_playbook(playbook_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    playbook = db.query(StartupPlaybook).filter(
        StartupPlaybook.id == playbook_id, StartupPlaybook.is_deleted == False, StartupPlaybook.user_id == current_user.id
    ).first()
    if not playbook:
        raise HTTPException(status_code=404, detail="Playbook not found")
    playbook.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": playbook_id}
