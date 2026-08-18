from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import InsurancePolicy, User
from app.schemas.schemas import InsurancePolicyCreate, InsurancePolicyUpdate

router = APIRouter(prefix="/finance/insurance", tags=["Insurance"], dependencies=[Depends(get_current_user)])

# Standard Malaysia motor insurance No-Claim-Discount scale: each claim-free
# renewal steps up one tier, capped at 55%. A claim resets the tier to 0%.
NCD_SCALE = [0.0, 25.0, 30.0, 38.33, 45.0, 55.0]


@router.get("")
def list_policies(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(InsurancePolicy).filter(InsurancePolicy.user_id == current_user.id, InsurancePolicy.is_deleted == False).order_by(InsurancePolicy.created_at.desc()).all()


@router.post("")
def create_policy(policy_in: InsurancePolicyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = InsurancePolicy(**policy_in.model_dump(), user_id=current_user.id)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.put("/{policy_id}")
def update_policy(policy_id: str, policy_in: InsurancePolicyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id, InsurancePolicy.user_id == current_user.id, InsurancePolicy.is_deleted == False).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    for key, val in policy_in.model_dump(exclude_unset=True).items():
        setattr(policy, key, val)
    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/{policy_id}")
def delete_policy(policy_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id, InsurancePolicy.user_id == current_user.id, InsurancePolicy.is_deleted == False).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    policy.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": policy_id}


@router.get("/{policy_id}/ncd-forecast")
def ncd_forecast(policy_id: str, years: int = 5, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == policy_id, InsurancePolicy.user_id == current_user.id, InsurancePolicy.is_deleted == False).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.policy_type != "car":
        raise HTTPException(status_code=400, detail="NCD forecast only applies to car insurance policies")

    current_ncd = policy.ncd_percent if policy.ncd_percent is not None else 0.0
    # Find where we are on the scale (nearest tier at or below current NCD)
    tier = 0
    for i, step in enumerate(NCD_SCALE):
        if current_ncd >= step:
            tier = i

    forecast = []
    for year in range(years + 1):
        step_idx = min(tier + year, len(NCD_SCALE) - 1)
        ncd_pct = NCD_SCALE[step_idx]
        projected_premium = round(policy.premium_amount * (1 - ncd_pct / 100), 2)
        forecast.append({
            "year_offset": year,
            "ncd_percent": ncd_pct,
            "projected_premium": projected_premium,
            "savings_vs_current": round(policy.premium_amount - projected_premium, 2),
        })

    return {"policy_id": policy_id, "current_ncd_percent": current_ncd, "forecast": forecast}
