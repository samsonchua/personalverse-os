from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import SelfAnalysisCategory, SelfAnalysisCriterion, User
from app.schemas.schemas import (
    SelfAnalysisCategoryCreate, SelfAnalysisCategoryUpdate,
    SelfAnalysisCriterionCreate, SelfAnalysisCriterionUpdate,
)

router = APIRouter(prefix="/self-analysis", tags=["Self-Analysis"], dependencies=[Depends(get_current_user)])


@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    categories = (
        db.query(SelfAnalysisCategory)
        .filter(SelfAnalysisCategory.is_deleted == False, SelfAnalysisCategory.user_id == current_user.id)
        .order_by(SelfAnalysisCategory.sort_order, SelfAnalysisCategory.created_at)
        .all()
    )
    result = []
    for cat in categories:
        criteria = (
            db.query(SelfAnalysisCriterion)
            .filter(SelfAnalysisCriterion.category_id == cat.id, SelfAnalysisCriterion.is_deleted == False, SelfAnalysisCriterion.user_id == current_user.id)
            .order_by(SelfAnalysisCriterion.sort_order, SelfAnalysisCriterion.created_at)
            .all()
        )
        avg = round(sum(c.rating for c in criteria) / len(criteria), 2) if criteria else 0.0
        result.append({
            "id": cat.id, "name": cat.name, "description": cat.description, "color": cat.color,
            "sort_order": cat.sort_order, "average_rating": avg, "criteria": criteria,
        })
    return result


@router.post("/categories")
def create_category(cat_in: SelfAnalysisCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = SelfAnalysisCategory(**cat_in.model_dump(), user_id=current_user.id)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.put("/categories/{category_id}")
def update_category(category_id: str, cat_in: SelfAnalysisCategoryUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(SelfAnalysisCategory).filter(SelfAnalysisCategory.id == category_id, SelfAnalysisCategory.is_deleted == False, SelfAnalysisCategory.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    for key, val in cat_in.model_dump(exclude_unset=True).items():
        setattr(cat, key, val)
    db.commit()
    db.refresh(cat)
    return cat


@router.delete("/categories/{category_id}")
def delete_category(category_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(SelfAnalysisCategory).filter(SelfAnalysisCategory.id == category_id, SelfAnalysisCategory.is_deleted == False, SelfAnalysisCategory.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    cat.is_deleted = True
    db.query(SelfAnalysisCriterion).filter(SelfAnalysisCriterion.category_id == category_id, SelfAnalysisCriterion.user_id == current_user.id).update({"is_deleted": True})
    db.commit()
    return {"status": "deleted", "id": category_id}


@router.post("/criteria")
def create_criterion(crit_in: SelfAnalysisCriterionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cat = db.query(SelfAnalysisCategory).filter(SelfAnalysisCategory.id == crit_in.category_id, SelfAnalysisCategory.is_deleted == False, SelfAnalysisCategory.user_id == current_user.id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    crit = SelfAnalysisCriterion(**crit_in.model_dump(), user_id=current_user.id)
    db.add(crit)
    db.commit()
    db.refresh(crit)
    return crit


@router.put("/criteria/{criterion_id}")
def update_criterion(criterion_id: str, crit_in: SelfAnalysisCriterionUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    crit = db.query(SelfAnalysisCriterion).filter(SelfAnalysisCriterion.id == criterion_id, SelfAnalysisCriterion.is_deleted == False, SelfAnalysisCriterion.user_id == current_user.id).first()
    if not crit:
        raise HTTPException(status_code=404, detail="Criterion not found")
    for key, val in crit_in.model_dump(exclude_unset=True).items():
        setattr(crit, key, val)
    db.commit()
    db.refresh(crit)
    return crit


@router.delete("/criteria/{criterion_id}")
def delete_criterion(criterion_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    crit = db.query(SelfAnalysisCriterion).filter(SelfAnalysisCriterion.id == criterion_id, SelfAnalysisCriterion.is_deleted == False, SelfAnalysisCriterion.user_id == current_user.id).first()
    if not crit:
        raise HTTPException(status_code=404, detail="Criterion not found")
    crit.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": criterion_id}
