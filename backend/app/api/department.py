from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import Department, JobRole, Staff, SOPWorkflow, DepartmentPolicy, DepartmentCostItem, User
from app.schemas.schemas import (
    DepartmentCreate, DepartmentUpdate, JobRoleCreate, JobRoleUpdate,
    StaffCreate, StaffUpdate, SOPWorkflowCreate, SOPWorkflowUpdate,
    DepartmentPolicyCreate, DepartmentPolicyUpdate, DepartmentCostItemCreate,
)

router = APIRouter(prefix="/department", tags=["Department & HR"], dependencies=[Depends(get_current_user)])


# DEPARTMENTS

@router.get("/departments")
def list_departments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    departments = db.query(Department).filter(Department.user_id == current_user.id, Department.is_deleted == False).order_by(Department.created_at.desc()).all()
    result = []
    for d in departments:
        staff_count = db.query(Staff).filter(Staff.department_id == d.id, Staff.user_id == current_user.id, Staff.is_deleted == False).count()
        result.append({
            "id": d.id, "name": d.name, "description": d.description, "head_name": d.head_name,
            "created_at": d.created_at, "staff_count": staff_count,
        })
    return result


@router.post("/departments")
def create_department(dept_in: DepartmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dept = Department(**dept_in.model_dump(), user_id=current_user.id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/departments/{department_id}")
def update_department(department_id: str, dept_in: DepartmentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == department_id, Department.user_id == current_user.id, Department.is_deleted == False).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    for key, val in dept_in.model_dump(exclude_unset=True).items():
        setattr(dept, key, val)
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/departments/{department_id}")
def delete_department(department_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    dept = db.query(Department).filter(Department.id == department_id, Department.user_id == current_user.id, Department.is_deleted == False).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": department_id}


# JOB ROLES

@router.get("/job-roles")
def list_job_roles(department_id: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(JobRole).filter(JobRole.user_id == current_user.id, JobRole.is_deleted == False)
    if department_id:
        query = query.filter(JobRole.department_id == department_id)
    return query.order_by(JobRole.created_at.desc()).all()


@router.post("/job-roles")
def create_job_role(role_in: JobRoleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role = JobRole(**role_in.model_dump(), user_id=current_user.id)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.put("/job-roles/{role_id}")
def update_job_role(role_id: str, role_in: JobRoleUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role = db.query(JobRole).filter(JobRole.id == role_id, JobRole.user_id == current_user.id, JobRole.is_deleted == False).first()
    if not role:
        raise HTTPException(status_code=404, detail="Job role not found")
    for key, val in role_in.model_dump(exclude_unset=True).items():
        setattr(role, key, val)
    db.commit()
    db.refresh(role)
    return role


@router.delete("/job-roles/{role_id}")
def delete_job_role(role_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    role = db.query(JobRole).filter(JobRole.id == role_id, JobRole.user_id == current_user.id, JobRole.is_deleted == False).first()
    if not role:
        raise HTTPException(status_code=404, detail="Job role not found")
    role.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": role_id}


# STAFF

@router.get("/staff")
def list_staff(department_id: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Staff).filter(Staff.user_id == current_user.id, Staff.is_deleted == False)
    if department_id:
        query = query.filter(Staff.department_id == department_id)
    return query.order_by(Staff.created_at.desc()).all()


@router.post("/staff")
def create_staff(staff_in: StaffCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    staff = Staff(**staff_in.model_dump(), user_id=current_user.id)
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.put("/staff/{staff_id}")
def update_staff(staff_id: str, staff_in: StaffUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.user_id == current_user.id, Staff.is_deleted == False).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    for key, val in staff_in.model_dump(exclude_unset=True).items():
        setattr(staff, key, val)
    db.commit()
    db.refresh(staff)
    return staff


@router.delete("/staff/{staff_id}")
def delete_staff(staff_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    staff = db.query(Staff).filter(Staff.id == staff_id, Staff.user_id == current_user.id, Staff.is_deleted == False).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": staff_id}


@router.get("/staff/analysis")
def staff_analysis(department_id: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Staff).filter(Staff.user_id == current_user.id, Staff.is_deleted == False)
    if department_id:
        query = query.filter(Staff.department_id == department_id)
    staff = query.all()

    by_employment_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_role: dict[str, int] = {}
    total_salary = 0.0

    for s in staff:
        by_employment_type[s.employment_type] = by_employment_type.get(s.employment_type, 0) + 1
        by_status[s.status] = by_status.get(s.status, 0) + 1
        total_salary += s.monthly_salary
        if s.job_role_id:
            role = db.query(JobRole).filter(JobRole.id == s.job_role_id, JobRole.user_id == current_user.id).first()
            role_title = role.title if role else "Unassigned"
        else:
            role_title = "Unassigned"
        by_role[role_title] = by_role.get(role_title, 0) + 1

    headcount = len(staff)
    return {
        "headcount": headcount,
        "total_monthly_salary": round(total_salary, 2),
        "average_monthly_salary": round(total_salary / headcount, 2) if headcount else 0.0,
        "by_employment_type": by_employment_type,
        "by_status": by_status,
        "by_role": by_role,
    }


# SOP WORKFLOWS

@router.get("/sops")
def list_sops(department_id: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(SOPWorkflow).filter(SOPWorkflow.user_id == current_user.id, SOPWorkflow.is_deleted == False)
    if department_id:
        query = query.filter(SOPWorkflow.department_id == department_id)
    sops = query.order_by(SOPWorkflow.created_at.desc()).all()
    return [
        {
            "id": s.id, "department_id": s.department_id, "title": s.title, "category": s.category,
            "steps": s.steps_json or [], "version": s.version, "effective_date": s.effective_date,
            "created_at": s.created_at,
        }
        for s in sops
    ]


@router.post("/sops")
def create_sop(sop_in: SOPWorkflowCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    data = sop_in.model_dump()
    steps = data.pop("steps")
    sop = SOPWorkflow(steps_json=[s for s in steps], **data, user_id=current_user.id)
    db.add(sop)
    db.commit()
    db.refresh(sop)
    return {
        "id": sop.id, "department_id": sop.department_id, "title": sop.title, "category": sop.category,
        "steps": sop.steps_json or [], "version": sop.version, "effective_date": sop.effective_date,
        "created_at": sop.created_at,
    }


@router.put("/sops/{sop_id}")
def update_sop(sop_id: str, sop_in: SOPWorkflowUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sop = db.query(SOPWorkflow).filter(SOPWorkflow.id == sop_id, SOPWorkflow.user_id == current_user.id, SOPWorkflow.is_deleted == False).first()
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")
    data = sop_in.model_dump(exclude_unset=True)
    if "steps" in data:
        sop.steps_json = data.pop("steps")
    for key, val in data.items():
        setattr(sop, key, val)
    db.commit()
    db.refresh(sop)
    return {
        "id": sop.id, "department_id": sop.department_id, "title": sop.title, "category": sop.category,
        "steps": sop.steps_json or [], "version": sop.version, "effective_date": sop.effective_date,
        "created_at": sop.created_at,
    }


@router.delete("/sops/{sop_id}")
def delete_sop(sop_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sop = db.query(SOPWorkflow).filter(SOPWorkflow.id == sop_id, SOPWorkflow.user_id == current_user.id, SOPWorkflow.is_deleted == False).first()
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")
    sop.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": sop_id}


# POLICIES / RULES & REGULATIONS

@router.get("/policies")
def list_policies(department_id: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(DepartmentPolicy).filter(DepartmentPolicy.user_id == current_user.id, DepartmentPolicy.is_deleted == False)
    if department_id:
        query = query.filter(DepartmentPolicy.department_id == department_id)
    return query.order_by(DepartmentPolicy.created_at.desc()).all()


@router.post("/policies")
def create_policy(policy_in: DepartmentPolicyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = DepartmentPolicy(**policy_in.model_dump(), user_id=current_user.id)
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.put("/policies/{policy_id}")
def update_policy(policy_id: str, policy_in: DepartmentPolicyUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(DepartmentPolicy).filter(DepartmentPolicy.id == policy_id, DepartmentPolicy.user_id == current_user.id, DepartmentPolicy.is_deleted == False).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    for key, val in policy_in.model_dump(exclude_unset=True).items():
        setattr(policy, key, val)
    db.commit()
    db.refresh(policy)
    return policy


@router.delete("/policies/{policy_id}")
def delete_policy(policy_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    policy = db.query(DepartmentPolicy).filter(DepartmentPolicy.id == policy_id, DepartmentPolicy.user_id == current_user.id, DepartmentPolicy.is_deleted == False).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    policy.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": policy_id}


# COSTING

@router.get("/costs")
def list_cost_items(department_id: str | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(DepartmentCostItem).filter(DepartmentCostItem.user_id == current_user.id, DepartmentCostItem.is_deleted == False)
    if department_id:
        query = query.filter(DepartmentCostItem.department_id == department_id)
    return query.order_by(DepartmentCostItem.created_at.desc()).all()


@router.post("/costs")
def create_cost_item(cost_in: DepartmentCostItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cost = DepartmentCostItem(**cost_in.model_dump(), user_id=current_user.id)
    db.add(cost)
    db.commit()
    db.refresh(cost)
    return cost


@router.delete("/costs/{cost_id}")
def delete_cost_item(cost_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    cost = db.query(DepartmentCostItem).filter(DepartmentCostItem.id == cost_id, DepartmentCostItem.user_id == current_user.id, DepartmentCostItem.is_deleted == False).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Cost item not found")
    cost.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": cost_id}


def _monthly_equivalent(amount: float, frequency: str) -> float:
    if frequency == "yearly":
        return amount / 12
    if frequency == "one_time":
        return 0.0  # one-time costs don't recur monthly
    return amount


@router.get("/costing")
def get_costing(department_id: str = Query(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    staff = db.query(Staff).filter(Staff.department_id == department_id, Staff.user_id == current_user.id, Staff.is_deleted == False, Staff.status == "active").all()
    total_staff_cost = sum(s.monthly_salary for s in staff)

    costs = db.query(DepartmentCostItem).filter(DepartmentCostItem.department_id == department_id, DepartmentCostItem.user_id == current_user.id, DepartmentCostItem.is_deleted == False).all()
    overhead_by_category: dict[str, float] = {}
    total_overhead = 0.0
    for c in costs:
        monthly = _monthly_equivalent(c.amount, c.frequency)
        overhead_by_category[c.category] = overhead_by_category.get(c.category, 0.0) + monthly
        total_overhead += monthly

    return {
        "department_id": department_id,
        "monthly_staff_cost": round(total_staff_cost, 2),
        "monthly_overhead_cost": round(total_overhead, 2),
        "overhead_by_category": {k: round(v, 2) for k, v in overhead_by_category.items()},
        "total_monthly_cost": round(total_staff_cost + total_overhead, 2),
        "annualized_cost": round((total_staff_cost + total_overhead) * 12, 2),
        "headcount": len(staff),
    }
