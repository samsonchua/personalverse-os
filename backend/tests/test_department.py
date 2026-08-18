def _make_department(client, auth_headers, name="Engineering"):
    return client.post(
        "/api/v1/department/departments",
        json={"name": name, "description": "Builds the product", "head_name": "Alex Tan"},
        headers=auth_headers,
    ).json()


def test_department_crud(client, auth_headers):
    dept = _make_department(client, auth_headers)
    assert dept["name"] == "Engineering"

    listed = client.get("/api/v1/department/departments", headers=auth_headers).json()
    match = next(d for d in listed if d["id"] == dept["id"])
    assert match["staff_count"] == 0

    upd = client.put(f"/api/v1/department/departments/{dept['id']}", json={"head_name": "Sam Lee"}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["head_name"] == "Sam Lee"

    delete = client.delete(f"/api/v1/department/departments/{dept['id']}", headers=auth_headers)
    assert delete.status_code == 200


def test_job_role_crud_and_filter(client, auth_headers):
    dept = _make_department(client, auth_headers)
    other_dept = _make_department(client, auth_headers, name="Sales")

    role = client.post(
        "/api/v1/department/job-roles",
        json={"department_id": dept["id"], "title": "Backend Engineer", "level": "Senior", "job_scope": "Own the API layer", "requirements": "5+ years Python"},
        headers=auth_headers,
    )
    assert role.status_code == 200
    role_id = role.json()["id"]

    client.post("/api/v1/department/job-roles", json={"department_id": other_dept["id"], "title": "Sales Rep"}, headers=auth_headers)

    filtered = client.get("/api/v1/department/job-roles", params={"department_id": dept["id"]}, headers=auth_headers).json()
    assert len(filtered) == 1
    assert filtered[0]["title"] == "Backend Engineer"

    upd = client.put(f"/api/v1/department/job-roles/{role_id}", json={"level": "Lead"}, headers=auth_headers)
    assert upd.json()["level"] == "Lead"

    delete = client.delete(f"/api/v1/department/job-roles/{role_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_staff_crud_and_analysis(client, auth_headers):
    dept = _make_department(client, auth_headers)
    role = client.post("/api/v1/department/job-roles", json={"department_id": dept["id"], "title": "Engineer"}, headers=auth_headers).json()

    s1 = client.post(
        "/api/v1/department/staff",
        json={"department_id": dept["id"], "job_role_id": role["id"], "name": "Jamie", "employment_type": "full_time", "monthly_salary": 8000},
        headers=auth_headers,
    ).json()
    client.post(
        "/api/v1/department/staff",
        json={"department_id": dept["id"], "name": "Casey", "employment_type": "contract", "monthly_salary": 5000},
        headers=auth_headers,
    )

    listed = client.get("/api/v1/department/staff", params={"department_id": dept["id"]}, headers=auth_headers).json()
    assert len(listed) == 2

    analysis = client.get("/api/v1/department/staff/analysis", params={"department_id": dept["id"]}, headers=auth_headers).json()
    assert analysis["headcount"] == 2
    assert analysis["total_monthly_salary"] == 13000
    assert analysis["average_monthly_salary"] == 6500
    assert analysis["by_employment_type"]["full_time"] == 1
    assert analysis["by_employment_type"]["contract"] == 1
    assert analysis["by_role"]["Engineer"] == 1
    assert analysis["by_role"]["Unassigned"] == 1

    upd = client.put(f"/api/v1/department/staff/{s1['id']}", json={"status": "on_leave"}, headers=auth_headers)
    assert upd.json()["status"] == "on_leave"

    delete = client.delete(f"/api/v1/department/staff/{s1['id']}", headers=auth_headers)
    assert delete.status_code == 200


def test_sop_workflow_crud_with_steps(client, auth_headers):
    dept = _make_department(client, auth_headers)
    sop = client.post(
        "/api/v1/department/sops",
        json={
            "department_id": dept["id"], "title": "New Hire Onboarding", "category": "HR",
            "steps": [
                {"step_number": 1, "instruction": "Send offer letter", "responsible_role": "HR Manager"},
                {"step_number": 2, "instruction": "Set up equipment", "responsible_role": "IT"},
            ],
        },
        headers=auth_headers,
    )
    assert sop.status_code == 200
    body = sop.json()
    assert len(body["steps"]) == 2
    assert body["steps"][0]["instruction"] == "Send offer letter"

    upd = client.put(
        f"/api/v1/department/sops/{body['id']}",
        json={"steps": [{"step_number": 1, "instruction": "Updated step"}]},
        headers=auth_headers,
    )
    assert len(upd.json()["steps"]) == 1

    listed = client.get("/api/v1/department/sops", params={"department_id": dept["id"]}, headers=auth_headers).json()
    assert len(listed) == 1

    delete = client.delete(f"/api/v1/department/sops/{body['id']}", headers=auth_headers)
    assert delete.status_code == 200


def test_policy_crud(client, auth_headers):
    dept = _make_department(client, auth_headers)
    policy = client.post(
        "/api/v1/department/policies",
        json={"department_id": dept["id"], "title": "Code of Conduct", "category": "Conduct", "content": "Be respectful."},
        headers=auth_headers,
    )
    assert policy.status_code == 200
    policy_id = policy.json()["id"]

    upd = client.put(f"/api/v1/department/policies/{policy_id}", json={"content": "Be respectful and punctual."}, headers=auth_headers)
    assert "punctual" in upd.json()["content"]

    delete = client.delete(f"/api/v1/department/policies/{policy_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_costing_combines_staff_and_overhead(client, auth_headers):
    dept = _make_department(client, auth_headers)
    client.post("/api/v1/department/staff", json={"department_id": dept["id"], "name": "A", "monthly_salary": 6000, "status": "active"}, headers=auth_headers)
    client.post("/api/v1/department/staff", json={"department_id": dept["id"], "name": "B", "monthly_salary": 4000, "status": "inactive"}, headers=auth_headers)

    client.post("/api/v1/department/costs", json={"department_id": dept["id"], "name": "Office rent", "category": "Rent", "amount": 2400, "frequency": "monthly"}, headers=auth_headers)
    client.post("/api/v1/department/costs", json={"department_id": dept["id"], "name": "Annual software license", "category": "Software", "amount": 1200, "frequency": "yearly"}, headers=auth_headers)
    client.post("/api/v1/department/costs", json={"department_id": dept["id"], "name": "Laptop purchase", "category": "Equipment", "amount": 5000, "frequency": "one_time"}, headers=auth_headers)

    costing = client.get("/api/v1/department/costing", params={"department_id": dept["id"]}, headers=auth_headers).json()
    assert costing["headcount"] == 1  # only active staff counted
    assert costing["monthly_staff_cost"] == 6000  # inactive staff excluded
    assert costing["monthly_overhead_cost"] == 2500  # 2400 + (1200/12), one-time excluded
    assert costing["total_monthly_cost"] == 8500
    assert costing["annualized_cost"] == 102000


def test_department_endpoints_require_auth(client):
    assert client.get("/api/v1/department/departments").status_code == 401
    assert client.get("/api/v1/department/staff").status_code == 401
    assert client.get("/api/v1/department/sops").status_code == 401
    assert client.get("/api/v1/department/costing", params={"department_id": "x"}).status_code == 401
