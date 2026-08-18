from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import FinanceTransaction, WorkTask, HealthMetric, KnowledgeItem, User

router = APIRouter(prefix="/analytics", tags=["Analytics Engine"], dependencies=[Depends(get_current_user)])

@router.get("/life-metrics")
def get_life_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.is_deleted == False, FinanceTransaction.user_id == current_user.id
    ).all()
    tasks = db.query(WorkTask).filter(
        WorkTask.is_deleted == False, WorkTask.user_id == current_user.id
    ).all()
    health = db.query(HealthMetric).filter(
        HealthMetric.user_id == current_user.id
    ).order_by(HealthMetric.log_date.asc()).all()
    knowledge_count = db.query(KnowledgeItem).filter(
        KnowledgeItem.is_deleted == False, KnowledgeItem.user_id == current_user.id
    ).count()

    completed_tasks = [t for t in tasks if t.status == "Completed"]
    task_completion_rate = (len(completed_tasks) / len(tasks) * 100) if tasks else 100.0

    expense_by_category: dict[str, float] = {}
    for t in txs:
        if t.transaction_type == "expense":
            expense_by_category[t.category] = expense_by_category.get(t.category, 0.0) + t.amount

    return {
        "task_completion_rate": round(task_completion_rate, 1),
        "total_tasks": len(tasks),
        "completed_tasks": len(completed_tasks),
        "total_knowledge_items": knowledge_count,
        "expense_by_category": expense_by_category,
        "health_trend": [
            {"date": h.log_date, "weight": h.weight_kg, "sleep": h.sleep_hours, "calories": h.calories_consumed}
            for h in health[-7:]
        ]
    }
