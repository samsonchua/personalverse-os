from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import FinanceScenario, User
from app.schemas.schemas import FinanceScenarioCreate, FinanceScenarioUpdate

router = APIRouter(prefix="/finance-modeling", tags=["Finance Modeling"], dependencies=[Depends(get_current_user)])


@router.get("/scenarios")
def list_scenarios(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(FinanceScenario)
        .filter(FinanceScenario.user_id == current_user.id, FinanceScenario.is_deleted == False)
        .order_by(FinanceScenario.updated_at.desc())
        .all()
    )


@router.post("/scenarios")
def create_scenario(scenario_in: FinanceScenarioCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scenario = FinanceScenario(**scenario_in.model_dump(), user_id=current_user.id)
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.put("/scenarios/{scenario_id}")
def update_scenario(scenario_id: str, scenario_in: FinanceScenarioUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scenario = db.query(FinanceScenario).filter(FinanceScenario.id == scenario_id, FinanceScenario.user_id == current_user.id, FinanceScenario.is_deleted == False).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    for key, val in scenario_in.model_dump(exclude_unset=True).items():
        setattr(scenario, key, val)
    db.commit()
    db.refresh(scenario)
    return scenario


@router.delete("/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scenario = db.query(FinanceScenario).filter(FinanceScenario.id == scenario_id, FinanceScenario.user_id == current_user.id, FinanceScenario.is_deleted == False).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenario.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": scenario_id}


@router.get("/scenarios/{scenario_id}/project")
def project_scenario(scenario_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    scenario = db.query(FinanceScenario).filter(FinanceScenario.id == scenario_id, FinanceScenario.user_id == current_user.id, FinanceScenario.is_deleted == False).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    income_growth = scenario.income_growth_rate_pct / 100
    expense_growth = scenario.expense_growth_rate_pct / 100
    balance = scenario.starting_balance
    annual_income_base = scenario.monthly_income * 12
    annual_expense_base = scenario.monthly_expense * 12

    years = []
    for year in range(1, scenario.projection_years + 1):
        income = annual_income_base * ((1 + income_growth) ** (year - 1))
        expense = annual_expense_base * ((1 + expense_growth) ** (year - 1))
        net = income - expense
        balance += net
        years.append({
            "year": year,
            "income": round(income, 2),
            "expense": round(expense, 2),
            "net": round(net, 2),
            "cumulative_balance": round(balance, 2),
        })

    return {
        "scenario_id": scenario_id,
        "starting_balance": scenario.starting_balance,
        "years": years,
        "ending_balance": round(balance, 2),
    }
