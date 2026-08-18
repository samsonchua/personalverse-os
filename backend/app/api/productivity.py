from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import (
    User, Habit, HabitLog, TimeBlock, ClientService, Client, SkillMicroTask, Skill,
    FinancialGoal, KnowledgeItem, HealthMetric, CareerSkill,
)
from app.schemas.schemas import HabitCreate, HabitLogCreate, TimeBlockCreate, TimeBlockUpdate

router = APIRouter(prefix="/productivity", tags=["Daily Productivity"], dependencies=[Depends(get_current_user)])

@router.get("/summary")
def get_productivity_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    habits = db.query(Habit).filter(Habit.is_deleted == False, Habit.user_id == current_user.id).all()
    time_blocks = db.query(TimeBlock).filter(TimeBlock.user_id == current_user.id).all()
    return {
        "habits": habits,
        "time_blocks": time_blocks
    }

@router.post("/habits")
def create_habit(habit_in: HabitCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    habit = Habit(**habit_in.model_dump(), user_id=current_user.id)
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit

@router.post("/habits/log")
def log_habit(log_in: HabitLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    habit = db.query(Habit).filter(Habit.id == log_in.habit_id, Habit.user_id == current_user.id).first()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    log = HabitLog(**log_in.model_dump(), user_id=current_user.id)
    db.add(log)

    if log_in.status:
        habit.current_streak += 1

    db.commit()
    db.refresh(log)
    return log

@router.post("/time-blocks")
def create_time_block(tb_in: TimeBlockCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tb = TimeBlock(**tb_in.model_dump(), user_id=current_user.id)
    db.add(tb)
    db.commit()
    db.refresh(tb)
    return tb


@router.put("/time-blocks/{block_id}")
def update_time_block(block_id: str, tb_in: TimeBlockUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tb = db.query(TimeBlock).filter(TimeBlock.id == block_id, TimeBlock.user_id == current_user.id).first()
    if not tb:
        raise HTTPException(status_code=404, detail="Time block not found")
    for key, val in tb_in.model_dump(exclude_unset=True).items():
        setattr(tb, key, val)
    db.commit()
    db.refresh(tb)
    return tb


@router.delete("/time-blocks/{block_id}")
def delete_time_block(block_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    tb = db.query(TimeBlock).filter(TimeBlock.id == block_id, TimeBlock.user_id == current_user.id).first()
    if not tb:
        raise HTTPException(status_code=404, detail="Time block not found")
    db.delete(tb)
    db.commit()
    return {"status": "deleted", "id": block_id}


def _add_minutes(hhmm: str, minutes: int) -> str:
    t = datetime.strptime(hhmm, "%H:%M") + timedelta(minutes=minutes)
    return t.strftime("%H:%M")


@router.post("/auto-generate")
def auto_generate_plan(block_date: str = Query(..., description="YYYY-MM-DD"), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Drafts a day's TimeBlocks from what's actually pending elsewhere in the app: active client
    services, unscheduled skill practice, a finance-goal check-in, a knowledge item to review, a
    health-log reminder, and a career skill below its target. Skips anything whose title already
    exists that day, so re-running is safe."""
    existing_titles = {
        t.title for t in db.query(TimeBlock).filter(TimeBlock.block_date == block_date, TimeBlock.user_id == current_user.id).all()
    }

    candidates: list[str] = []

    for s in db.query(ClientService).filter(
        ClientService.status == "active", ClientService.is_deleted == False, ClientService.user_id == current_user.id
    ).order_by(ClientService.created_at.desc()).limit(3).all():
        client = db.query(Client).filter(Client.id == s.client_id, Client.user_id == current_user.id).first()
        candidates.append(f"Client: {s.service_name}" + (f" — {client.name}" if client else ""))

    for t in db.query(SkillMicroTask).filter(
        SkillMicroTask.is_completed == False, SkillMicroTask.scheduled_date == None,
        SkillMicroTask.is_deleted == False, SkillMicroTask.user_id == current_user.id,
    ).order_by(SkillMicroTask.created_at).limit(2).all():
        skill = db.query(Skill).filter(Skill.id == t.skill_id, Skill.user_id == current_user.id).first()
        candidates.append(f"Skill: {skill.name if skill else 'Practice'} — {t.title}")

    goal = db.query(FinancialGoal).filter(
        FinancialGoal.is_completed == False, FinancialGoal.is_deleted == False, FinancialGoal.user_id == current_user.id
    ).order_by(FinancialGoal.created_at.desc()).first()
    if goal:
        candidates.append(f"Finance: review progress on '{goal.title}'")

    knowledge_item = db.query(KnowledgeItem).filter(
        KnowledgeItem.is_deleted == False, KnowledgeItem.user_id == current_user.id
    ).order_by(KnowledgeItem.rating.asc(), KnowledgeItem.created_at.desc()).first()
    if knowledge_item:
        candidates.append(f"Knowledge: review '{knowledge_item.title}'")

    if not db.query(HealthMetric).filter(
        HealthMetric.log_date == block_date, HealthMetric.is_deleted == False, HealthMetric.user_id == current_user.id
    ).first():
        candidates.append("Health: log today's metrics")

    career_skill = db.query(CareerSkill).filter(
        CareerSkill.current_level < CareerSkill.target_level, CareerSkill.user_id == current_user.id
    ).order_by(CareerSkill.name).first()
    if career_skill:
        candidates.append(f"Career: practice {career_skill.name}")

    created = []
    cursor = "08:00"
    for title in candidates:
        if title in existing_titles:
            continue
        end = _add_minutes(cursor, 30)
        tb = TimeBlock(title=title, block_date=block_date, start_time=cursor, end_time=end, user_id=current_user.id)
        db.add(tb)
        created.append(tb)
        cursor = _add_minutes(end, 15)  # 15-minute buffer between blocks

    db.commit()
    for tb in created:
        db.refresh(tb)
    return created
