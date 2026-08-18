from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import (
    FinanceAccount, WorkTask, WorkProject, Habit, HealthMetric, JournalEntry, User
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"], dependencies=[Depends(get_current_user)])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    accounts = db.query(FinanceAccount).filter(
        FinanceAccount.is_deleted == False, FinanceAccount.user_id == current_user.id
    ).all()
    net_worth = sum(a.balance for a in accounts)

    pending_tasks = db.query(WorkTask).filter(
        WorkTask.status != "Completed", WorkTask.is_deleted == False, WorkTask.user_id == current_user.id
    ).all()
    active_projects = db.query(WorkProject).filter(
        WorkProject.status == "In Progress", WorkProject.is_deleted == False, WorkProject.user_id == current_user.id
    ).all()

    habits = db.query(Habit).filter(Habit.is_deleted == False, Habit.user_id == current_user.id).all()
    health_today = db.query(HealthMetric).filter(
        HealthMetric.user_id == current_user.id
    ).order_by(HealthMetric.log_date.desc()).first()
    recent_journals = db.query(JournalEntry).filter(
        JournalEntry.is_deleted == False, JournalEntry.user_id == current_user.id
    ).order_by(JournalEntry.created_at.desc()).limit(5).all()

    return {
        "net_worth": net_worth,
        "account_count": len(accounts),
        "pending_task_count": len(pending_tasks),
        "active_project_count": len(active_projects),
        "habit_count": len(habits),
        "health_today": {
            "weight_kg": health_today.weight_kg if health_today else 72.5,
            "sleep_hours": health_today.sleep_hours if health_today else 7.5,
            "calories_consumed": health_today.calories_consumed if health_today else 2400,
            "mood": health_today.mood if health_today else "Energized"
        },
        "recent_tasks": [
            {"id": t.id, "title": t.title, "priority": t.priority, "due_date": t.due_date, "status": t.status}
            for t in pending_tasks[:5]
        ],
        "active_projects": [
            {"id": p.id, "title": p.title, "progress_pct": p.progress_pct, "priority": p.priority}
            for p in active_projects[:4]
        ],
        "recent_journals": [
            {"id": j.id, "title": j.title, "entry_type": j.entry_type, "created_at": j.created_at}
            for j in recent_journals
        ]
    }
