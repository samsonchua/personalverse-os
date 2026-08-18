def _make_account(client, auth_headers, name="Checking", balance=1000.0):
    return client.post(
        "/api/v1/finance/accounts",
        json={"name": name, "account_type": "bank", "balance": balance},
        headers=auth_headers,
    ).json()


def test_account_update_and_delete(client, auth_headers):
    acc = _make_account(client, auth_headers)

    upd = client.put(f"/api/v1/finance/accounts/{acc['id']}", json={"name": "Renamed"}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["name"] == "Renamed"

    delete = client.delete(f"/api/v1/finance/accounts/{acc['id']}", headers=auth_headers)
    assert delete.status_code == 200

    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    assert not any(a["id"] == acc["id"] for a in summary["accounts"])


def test_transaction_edit_recalculates_balance(client, auth_headers):
    acc = _make_account(client, auth_headers, balance=500.0)
    tx = client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "expense", "amount": 50.0, "category": "Food", "date": "2026-08-08"},
        headers=auth_headers,
    ).json()

    balance_after_create = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    acc_now = next(a for a in balance_after_create["accounts"] if a["id"] == acc["id"])
    assert acc_now["balance"] == 450.0

    client.put(f"/api/v1/finance/transactions/{tx['id']}", json={"amount": 100.0}, headers=auth_headers)
    balance_after_edit = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    acc_now2 = next(a for a in balance_after_edit["accounts"] if a["id"] == acc["id"])
    assert acc_now2["balance"] == 400.0  # 500 - 100

    client.delete(f"/api/v1/finance/transactions/{tx['id']}", headers=auth_headers)
    balance_after_delete = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    acc_now3 = next(a for a in balance_after_delete["accounts"] if a["id"] == acc["id"])
    assert acc_now3["balance"] == 500.0  # fully reversed


def test_transfer_moves_money_between_accounts(client, auth_headers):
    src = _make_account(client, auth_headers, name="Source", balance=300.0)
    dst = _make_account(client, auth_headers, name="Dest", balance=0.0)

    res = client.post(
        "/api/v1/finance/transactions",
        json={
            "account_id": src["id"], "to_account_id": dst["id"],
            "transaction_type": "transfer", "amount": 120.0, "category": "Transfer", "date": "2026-08-08",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200

    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    src_now = next(a for a in summary["accounts"] if a["id"] == src["id"])
    dst_now = next(a for a in summary["accounts"] if a["id"] == dst["id"])
    assert src_now["balance"] == 180.0
    assert dst_now["balance"] == 120.0


def test_transfer_requires_destination_account(client, auth_headers):
    src = _make_account(client, auth_headers)
    res = client.post(
        "/api/v1/finance/transactions",
        json={"account_id": src["id"], "transaction_type": "transfer", "amount": 50.0, "category": "Transfer", "date": "2026-08-08"},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_transfer_appears_in_both_source_and_destination_account_ledgers(client, auth_headers):
    src = _make_account(client, auth_headers, name="Transfer Src")
    dst = _make_account(client, auth_headers, name="Transfer Dst")
    tx = client.post(
        "/api/v1/finance/transactions",
        json={
            "account_id": src["id"], "to_account_id": dst["id"],
            "transaction_type": "transfer", "amount": 75.0, "category": "Transfer", "date": "2026-08-08",
        },
        headers=auth_headers,
    ).json()

    src_ledger = client.get("/api/v1/finance/transactions", params={"account_id": src["id"]}, headers=auth_headers).json()
    dst_ledger = client.get("/api/v1/finance/transactions", params={"account_id": dst["id"]}, headers=auth_headers).json()
    assert any(t["id"] == tx["id"] for t in src_ledger["items"])
    assert any(t["id"] == tx["id"] for t in dst_ledger["items"])


def test_editing_transfer_can_reassign_destination_account(client, auth_headers):
    src = _make_account(client, auth_headers, name="Edit Transfer Src", balance=500.0)
    dst1 = _make_account(client, auth_headers, name="Edit Transfer Dst1", balance=0.0)
    dst2 = _make_account(client, auth_headers, name="Edit Transfer Dst2", balance=0.0)
    tx = client.post(
        "/api/v1/finance/transactions",
        json={
            "account_id": src["id"], "to_account_id": dst1["id"],
            "transaction_type": "transfer", "amount": 100.0, "category": "Transfer", "date": "2026-08-08",
        },
        headers=auth_headers,
    ).json()

    res = client.put(
        f"/api/v1/finance/transactions/{tx['id']}",
        json={"to_account_id": dst2["id"], "amount": 100.0},
        headers=auth_headers,
    )
    assert res.status_code == 200

    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    accounts_by_id = {a["id"]: a for a in summary["accounts"]}
    assert accounts_by_id[src["id"]]["balance"] == 400.0
    assert accounts_by_id[dst1["id"]]["balance"] == 0.0  # reversed off the old destination
    assert accounts_by_id[dst2["id"]]["balance"] == 100.0  # applied to the new destination


def test_transactions_ledger_filters_by_account(client, auth_headers):
    acc1 = _make_account(client, auth_headers, name="A1")
    acc2 = _make_account(client, auth_headers, name="A2")
    client.post("/api/v1/finance/transactions", json={"account_id": acc1["id"], "transaction_type": "expense", "amount": 10, "category": "X", "date": "2026-08-01"}, headers=auth_headers)
    client.post("/api/v1/finance/transactions", json={"account_id": acc2["id"], "transaction_type": "expense", "amount": 20, "category": "Y", "date": "2026-08-02"}, headers=auth_headers)

    res = client.get("/api/v1/finance/transactions", params={"account_id": acc1["id"]}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total"] == 1
    assert body["items"][0]["account_id"] == acc1["id"]


def test_budget_create_and_spent_calculation(client, auth_headers):
    acc = _make_account(client, auth_headers)
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "expense", "amount": 75.0, "category": "Dining", "date": "2026-08-05"},
        headers=auth_headers,
    )

    budget = client.post("/api/v1/finance/budgets", json={"category": "Dining", "monthly_limit": 200.0, "period": "2026-08"}, headers=auth_headers)
    assert budget.status_code == 200

    listed = client.get("/api/v1/finance/budgets", params={"period": "2026-08"}, headers=auth_headers).json()
    dining = next(b for b in listed if b["category"] == "Dining")
    assert dining["monthly_limit"] == 200.0
    assert dining["spent"] == 75.0


def test_budget_upsert_updates_existing_instead_of_duplicating(client, auth_headers):
    client.post("/api/v1/finance/budgets", json={"category": "Groceries", "monthly_limit": 300.0, "period": "2026-09"}, headers=auth_headers)
    client.post("/api/v1/finance/budgets", json={"category": "Groceries", "monthly_limit": 350.0, "period": "2026-09"}, headers=auth_headers)

    listed = client.get("/api/v1/finance/budgets", params={"period": "2026-09"}, headers=auth_headers).json()
    matches = [b for b in listed if b["category"] == "Groceries"]
    assert len(matches) == 1
    assert matches[0]["monthly_limit"] == 350.0


def test_budget_delete(client, auth_headers):
    budget = client.post("/api/v1/finance/budgets", json={"category": "Travel", "monthly_limit": 500.0, "period": "2026-10"}, headers=auth_headers).json()
    res = client.delete(f"/api/v1/finance/budgets/{budget['id']}", headers=auth_headers)
    assert res.status_code == 200
    listed = client.get("/api/v1/finance/budgets", params={"period": "2026-10"}, headers=auth_headers).json()
    assert not any(b["id"] == budget["id"] for b in listed)


def test_finance_reports_returns_monthly_trend_and_category_breakdown(client, auth_headers):
    res = client.get("/api/v1/finance/reports", params={"months": 3}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert len(body["monthly_trend"]) == 3
    assert "current_month_expense_by_category" in body


def test_finance_endpoints_require_auth(client):
    assert client.get("/api/v1/finance/transactions").status_code == 401
    assert client.get("/api/v1/finance/budgets", params={"period": "2026-08"}).status_code == 401
    assert client.get("/api/v1/finance/reports").status_code == 401
