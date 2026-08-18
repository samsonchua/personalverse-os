from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import WorkProject, WorkMeeting, WorkTask, User
from app.schemas.schemas import WorkProjectCreate, WorkMeetingCreate, WorkTaskCreate
from app.services.ai_engine import ai_engine

router = APIRouter(prefix="/work", tags=["WorkBuddy"], dependencies=[Depends(get_current_user)])

@router.get("/summary")
def get_work_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    projects = db.query(WorkProject).filter(WorkProject.user_id == current_user.id, WorkProject.is_deleted == False).all()
    tasks = db.query(WorkTask).filter(WorkTask.user_id == current_user.id, WorkTask.is_deleted == False).all()
    meetings = db.query(WorkMeeting).filter(WorkMeeting.user_id == current_user.id, WorkMeeting.is_deleted == False).all()

    return {
        "projects": projects,
        "tasks": tasks,
        "meetings": meetings
    }

@router.post("/projects")
def create_project(project_in: WorkProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    proj = WorkProject(**project_in.model_dump(), user_id=current_user.id)
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj

@router.post("/tasks")
def create_task(task_in: WorkTaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = WorkTask(**task_in.model_dump(), user_id=current_user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.post("/meetings")
def create_meeting(meeting_in: WorkMeetingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = meeting_in.model_dump()
    # Auto summarize meeting transcript with AI Meeting Assistant if provided
    if meeting_in.transcript and not meeting_in.summary:
        ai_res = ai_engine.chat("meeting_assistant", f"Summarize transcript: {meeting_in.transcript[:300]}")
        data["summary"] = ai_res["response"]
        data["action_items_json"] = ["Review architecture proposal", "Set up staging container deployment"]

    data["user_id"] = current_user.id
    mtg = WorkMeeting(**data)
    db.add(mtg)
    db.commit()
    db.refresh(mtg)
    return mtg
