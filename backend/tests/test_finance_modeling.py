def test_scenario_crud_and_projection(client, auth_headers):
    scenario = client.post(
        "/api/v1/finance-modeling/scenarios",
        json={
            "name": "Personal Baseline", "scope": "personal", "starting_balance": 10000,
            "monthly_income": 5000, "monthly_expense": 3000,
            "income_growth_rate_pct": 0, "expense_growth_rate_pct": 0, "projection_years": 3,
        },
        headers=auth_headers,
    )
    assert scenario.status_code == 200
    scenario_id = scenario.json()["id"]

    listed = client.get("/api/v1/finance-modeling/scenarios", headers=auth_headers).json()
    assert any(s["id"] == scenario_id for s in listed)

    proj = client.get(f"/api/v1/finance-modeling/scenarios/{scenario_id}/project", headers=auth_headers)
    assert proj.status_code == 200
    body = proj.json()
    assert len(body["years"]) == 3
    # No growth: net income is 2000/mo * 12 = 24000/yr, flat across years.
    assert body["years"][0]["net"] == 24000
    assert body["years"][0]["cumulative_balance"] == 34000
    assert body["years"][2]["cumulative_balance"] == 82000
    assert body["ending_balance"] == 82000

    upd = client.put(f"/api/v1/finance-modeling/scenarios/{scenario_id}", json={"monthly_expense": 4000}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["monthly_expense"] == 4000

    delete = client.delete(f"/api/v1/finance-modeling/scenarios/{scenario_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_scenario_projection_applies_growth_rates(client, auth_headers):
    scenario = client.post(
        "/api/v1/finance-modeling/scenarios",
        json={
            "name": "Business Growth", "scope": "business", "starting_balance": 0,
            "monthly_income": 10000, "monthly_expense": 8000,
            "income_growth_rate_pct": 10, "expense_growth_rate_pct": 0, "projection_years": 2,
        },
        headers=auth_headers,
    ).json()

    proj = client.get(f"/api/v1/finance-modeling/scenarios/{scenario['id']}/project", headers=auth_headers).json()
    assert proj["years"][0]["income"] == 120000
    assert proj["years"][1]["income"] == 132000  # +10% in year 2


def test_project_missing_scenario_returns_404(client, auth_headers):
    res = client.get("/api/v1/finance-modeling/scenarios/missing-id/project", headers=auth_headers)
    assert res.status_code == 404


def test_finance_modeling_requires_auth(client):
    assert client.get("/api/v1/finance-modeling/scenarios").status_code == 401
