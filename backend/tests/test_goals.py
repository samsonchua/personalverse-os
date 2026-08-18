def test_savings_goal_current_amount_is_manual(client, auth_headers):
    res = client.post(
        "/api/v1/finance/goals",
        json={"title": "Emergency Fund", "target_amount": 10000, "current_amount": 2500},
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["goal_type"] == "savings"
    assert body["current_amount"] == 2500
    assert body["is_synced"] is False


def test_net_worth_goal_syncs_current_amount_from_balance_sheet(client, auth_headers):
    # Give the account a known net worth: one asset, no liabilities.
    client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_asset", "subcategory": "investment", "name": "Net Worth Goal Asset", "value": 500000},
        headers=auth_headers,
    )

    goal = client.post(
        "/api/v1/finance/goals",
        json={"title": "Accumulate RM 2.2M Net Worth", "target_amount": 2200000, "goal_type": "net_worth"},
        headers=auth_headers,
    ).json()
    assert goal["is_synced"] is True
    assert goal["current_amount"] == 500000.0

    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    synced = next(g for g in summary["goals"] if g["id"] == goal["id"])
    assert synced["current_amount"] == 500000.0

    # Add more assets — the goal's progress should move without anyone touching the goal itself.
    client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_asset", "subcategory": "investment", "name": "Net Worth Goal Asset 2", "value": 100000},
        headers=auth_headers,
    )
    summary2 = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    synced2 = next(g for g in summary2["goals"] if g["id"] == goal["id"])
    assert synced2["current_amount"] == 600000.0


def test_passive_income_goal_current_amount_is_manual_and_updatable(client, auth_headers):
    goal = client.post(
        "/api/v1/finance/goals",
        json={"title": "RM 10K Monthly Passive Income", "target_amount": 10000, "goal_type": "passive_income"},
        headers=auth_headers,
    ).json()
    assert goal["current_amount"] == 0.0
    assert goal["is_synced"] is False

    updated = client.put(f"/api/v1/finance/goals/{goal['id']}", json={"current_amount": 1500}, headers=auth_headers).json()
    assert updated["current_amount"] == 1500.0


def test_goal_delete(client, auth_headers):
    goal = client.post("/api/v1/finance/goals", json={"title": "Deletable Goal", "target_amount": 1000}, headers=auth_headers).json()
    res = client.delete(f"/api/v1/finance/goals/{goal['id']}", headers=auth_headers)
    assert res.status_code == 200
    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    assert not any(g["id"] == goal["id"] for g in summary["goals"])
