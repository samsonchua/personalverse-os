from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import CareerSkill, CareerMilestone, User
from app.schemas.schemas import CareerSkillCreate, CareerMilestoneCreate

router = APIRouter(prefix="/career", tags=["Career Matrix"], dependencies=[Depends(get_current_user)])

@router.get("/summary")
def get_career_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skills = db.query(CareerSkill).filter(CareerSkill.user_id == current_user.id).all()
    milestones = db.query(CareerMilestone).filter(CareerMilestone.user_id == current_user.id).order_by(CareerMilestone.milestone_date.desc()).all()
    return {
        "skills": skills,
        "milestones": milestones
    }

@router.post("/skills")
def create_skill(skill_in: CareerSkillCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    skill = CareerSkill(**skill_in.model_dump(), user_id=current_user.id)
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return skill

@router.post("/milestones")
def create_milestone(milestone_in: CareerMilestoneCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    m = CareerMilestone(**milestone_in.model_dump(), user_id=current_user.id)
    db.add(m)
    db.commit()
    db.refresh(m)
    return m
