from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import Skill, SkillMicroTask, TimeBlock, User
from app.schemas.schemas import (
    SkillCreate, SkillUpdate, SkillMicroTaskCreate, SkillMicroTaskUpdate, SkillMicroTaskSchedule,
)

router = APIRouter(prefix="/skills", tags=["Skill Development"], dependencies=[Depends(get_current_user)])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skills = db.query(Skill).filter(Skill.is_deleted == False, Skill.user_id == current_user.id).order_by(Skill.created_at.desc()).all()
    result = []
    for s in skills:
        tasks = (
            db.query(SkillMicroTask)
            .filter(SkillMicroTask.skill_id == s.id, SkillMicroTask.is_deleted == False, SkillMicroTask.user_id == current_user.id)
            .order_by(SkillMicroTask.created_at)
            .all()
        )
        completed = sum(1 for t in tasks if t.is_completed)
        result.append({
            "id": s.id, "name": s.name, "category": s.category, "current_level": s.current_level,
            "target_level": s.target_level, "target_date": s.target_date, "notes": s.notes,
            "tasks": tasks,
            "task_progress_pct": round((completed / len(tasks)) * 100) if tasks else 0,
        })
    return result


@router.post("")
def create_skill(skill_in: SkillCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skill = Skill(**skill_in.model_dump(), user_id=current_user.id)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill


@router.put("/{skill_id}")
def update_skill(skill_id: str, skill_in: SkillUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skill = db.query(Skill).filter(Skill.id == skill_id, Skill.is_deleted == False, Skill.user_id == current_user.id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    for key, val in skill_in.model_dump(exclude_unset=True).items():
        setattr(skill, key, val)
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}")
def delete_skill(skill_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skill = db.query(Skill).filter(Skill.id == skill_id, Skill.is_deleted == False, Skill.user_id == current_user.id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    skill.is_deleted = True
    db.query(SkillMicroTask).filter(SkillMicroTask.skill_id == skill_id, SkillMicroTask.user_id == current_user.id).update({"is_deleted": True})
    db.commit()
    return {"status": "deleted", "id": skill_id}


@router.post("/tasks")
def create_task(task_in: SkillMicroTaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skill = db.query(Skill).filter(Skill.id == task_in.skill_id, Skill.is_deleted == False, Skill.user_id == current_user.id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    task = SkillMicroTask(**task_in.model_dump(), user_id=current_user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.put("/tasks/{task_id}")
def update_task(task_id: str, task_in: SkillMicroTaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(SkillMicroTask).filter(SkillMicroTask.id == task_id, SkillMicroTask.is_deleted == False, SkillMicroTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, val in task_in.model_dump(exclude_unset=True).items():
        setattr(task, key, val)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(SkillMicroTask).filter(SkillMicroTask.id == task_id, SkillMicroTask.is_deleted == False, SkillMicroTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": task_id}


@router.post("/tasks/{task_id}/schedule")
def schedule_task(task_id: str, sched_in: SkillMicroTaskSchedule, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Pushes a skill micro-task onto the Daily Planner as a TimeBlock."""
    task = db.query(SkillMicroTask).filter(SkillMicroTask.id == task_id, SkillMicroTask.is_deleted == False, SkillMicroTask.user_id == current_user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    skill = db.query(Skill).filter(Skill.id == task.skill_id, Skill.user_id == current_user.id).first()
    task.scheduled_date = sched_in.block_date

    block = TimeBlock(
        title=f"Practice: {skill.name if skill else 'Skill'} — {task.title}",
        block_date=sched_in.block_date,
        start_time=sched_in.start_time,
        end_time=sched_in.end_time,
        user_id=current_user.id,
    )
    db.add(block)
    db.commit()
    db.refresh(block)
    db.refresh(task)
    return {"task": task, "time_block": block}
