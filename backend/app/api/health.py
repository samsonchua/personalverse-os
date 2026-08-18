from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import HealthMetric, WorkoutLog, User
from app.schemas.schemas import (
    HealthMetricCreate, HealthMetricUpdate, HealthMetricBulkImport, WorkoutLogCreate, WorkoutLogUpdate,
)

router = APIRouter(prefix="/health", tags=["Health Tracking"], dependencies=[Depends(get_current_user)])


@router.get("/summary")
def get_health_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    metrics = (
        db.query(HealthMetric)
        .filter(HealthMetric.is_deleted == False, HealthMetric.user_id == current_user.id)
        .order_by(HealthMetric.log_date.desc())
        .limit(30)
        .all()
    )
    workouts = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.is_deleted == False, WorkoutLog.user_id == current_user.id)
        .order_by(WorkoutLog.log_date.desc())
        .limit(20)
        .all()
    )
    return {
        "metrics_history": metrics,
        "workouts_history": workouts,
        "latest_metric": metrics[0] if metrics else None,
    }


@router.post("/metrics")
def log_health_metric(metric_in: HealthMetricCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    existing = db.query(HealthMetric).filter(HealthMetric.log_date == metric_in.log_date, HealthMetric.is_deleted == False, HealthMetric.user_id == current_user.id).first()
    if existing:
        for key, val in metric_in.model_dump(exclude_unset=True).items():
            setattr(existing, key, val)
        db.commit()
        db.refresh(existing)
        return existing
    metric = HealthMetric(**metric_in.model_dump(), user_id=current_user.id)
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


@router.post("/metrics/bulk-import")
def bulk_import_metrics(payload: HealthMetricBulkImport, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Upserts each row by date — same semantics as POST /metrics, just batched for a CSV import
    (e.g. an export from the Mi Fit / Zepp app). Returns how many rows were created vs. updated."""
    created = 0
    updated = 0
    for row in payload.rows:
        existing = db.query(HealthMetric).filter(HealthMetric.log_date == row.log_date, HealthMetric.is_deleted == False, HealthMetric.user_id == current_user.id).first()
        data = row.model_dump(exclude_unset=True)
        if existing:
            for key, val in data.items():
                setattr(existing, key, val)
            updated += 1
        else:
            db.add(HealthMetric(**data, user_id=current_user.id))
            created += 1
    db.commit()
    return {"created": created, "updated": updated, "total": created + updated}


@router.put("/metrics/{metric_id}")
def update_health_metric(metric_id: str, metric_in: HealthMetricUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    metric = db.query(HealthMetric).filter(HealthMetric.id == metric_id, HealthMetric.is_deleted == False, HealthMetric.user_id == current_user.id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    for key, val in metric_in.model_dump(exclude_unset=True).items():
        setattr(metric, key, val)
    db.commit()
    db.refresh(metric)
    return metric


@router.delete("/metrics/{metric_id}")
def delete_health_metric(metric_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    metric = db.query(HealthMetric).filter(HealthMetric.id == metric_id, HealthMetric.is_deleted == False, HealthMetric.user_id == current_user.id).first()
    if not metric:
        raise HTTPException(status_code=404, detail="Metric not found")
    metric.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": metric_id}


@router.post("/workouts")
def log_workout(workout_in: WorkoutLogCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    w = WorkoutLog(**workout_in.model_dump(), user_id=current_user.id)
    db.add(w)
    db.commit()
    db.refresh(w)
    return w


@router.put("/workouts/{workout_id}")
def update_workout(workout_id: str, workout_in: WorkoutLogUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    w = db.query(WorkoutLog).filter(WorkoutLog.id == workout_id, WorkoutLog.is_deleted == False, WorkoutLog.user_id == current_user.id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found")
    for key, val in workout_in.model_dump(exclude_unset=True).items():
        setattr(w, key, val)
    db.commit()
    db.refresh(w)
    return w


@router.delete("/workouts/{workout_id}")
def delete_workout(workout_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    w = db.query(WorkoutLog).filter(WorkoutLog.id == workout_id, WorkoutLog.is_deleted == False, WorkoutLog.user_id == current_user.id).first()
    if not w:
        raise HTTPException(status_code=404, detail="Workout not found")
    w.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": workout_id}
