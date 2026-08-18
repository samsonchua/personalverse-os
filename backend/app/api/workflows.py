from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import WorkflowDiagram, User
from app.schemas.schemas import WorkflowDiagramCreate, WorkflowDiagramUpdate

router = APIRouter(prefix="/workflows", tags=["Workflow Designer"], dependencies=[Depends(get_current_user)])


@router.get("")
def list_workflows(entity_type: str | None = None, entity_id: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(WorkflowDiagram).filter(WorkflowDiagram.user_id == current_user.id, WorkflowDiagram.is_deleted == False)
    if entity_type:
        query = query.filter(WorkflowDiagram.entity_type == entity_type)
    if entity_id:
        query = query.filter(WorkflowDiagram.entity_id == entity_id)
    return query.order_by(WorkflowDiagram.updated_at.desc()).all()


@router.post("")
def create_workflow(wf_in: WorkflowDiagramCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wf = WorkflowDiagram(**wf_in.model_dump(), user_id=current_user.id)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return wf


@router.put("/{workflow_id}")
def update_workflow(workflow_id: str, wf_in: WorkflowDiagramUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wf = db.query(WorkflowDiagram).filter(WorkflowDiagram.id == workflow_id, WorkflowDiagram.user_id == current_user.id, WorkflowDiagram.is_deleted == False).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    for key, val in wf_in.model_dump(exclude_unset=True).items():
        setattr(wf, key, val)
    db.commit()
    db.refresh(wf)
    return wf


@router.delete("/{workflow_id}")
def delete_workflow(workflow_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wf = db.query(WorkflowDiagram).filter(WorkflowDiagram.id == workflow_id, WorkflowDiagram.user_id == current_user.id, WorkflowDiagram.is_deleted == False).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    wf.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": workflow_id}
