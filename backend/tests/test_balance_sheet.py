def _make_account(client, auth_headers, name="Checking", account_type="bank", balance=100.0):
    return client.post(
        "/api/v1/finance/accounts",
        json={"name": name, "account_type": account_type, "balance": balance},
        headers=auth_headers,
    ).json()


def _make_item(client, auth_headers, category="current_asset", subcategory="bank", name="Item", value=100.0):
    return client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": category, "subcategory": subcategory, "name": name, "value": value},
        headers=auth_headers,
    ).json()


def _find(sheet, section, item_id):
    for i in sheet[section]:
        if i["id"] == item_id:
            return i
    return None


def test_link_existing_account_reflects_live_balance(client, auth_headers):
    acc = _make_account(client, auth_headers, name="Savings", balance=500.0)
    item = _make_item(client, auth_headers, name="Savings BS Item", value=999.0)

    res = client.post(
        f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account",
        json={"account_id": acc["id"]},
        headers=auth_headers,
    )
    assert res.status_code == 200
    assert res.json()["linked_account_id"] == acc["id"]

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    linked = _find(sheet, "current_assets", item["id"])
    assert linked["value"] == 500.0
    assert linked["is_live"] is True

    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "income", "amount": 50.0, "category": "Salary", "date": "2026-08-10"},
        headers=auth_headers,
    )
    sheet2 = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    updated = _find(sheet2, "current_assets", item["id"])
    assert updated["value"] == 550.0


def test_link_liability_item_uses_absolute_value_of_negative_balance(client, auth_headers):
    acc = _make_account(client, auth_headers, name="Credit Line", account_type="credit_card", balance=-250.0)
    item = _make_item(client, auth_headers, category="current_liability", subcategory="credit_card", name="Card Debt", value=999.0)

    client.post(
        f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account",
        json={"account_id": acc["id"]},
        headers=auth_headers,
    )
    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    linked = _find(sheet, "current_liabilities", item["id"])
    assert linked["value"] == 250.0


def test_create_and_link_account_seeds_opening_balance_from_item_value(client, auth_headers):
    item = _make_item(client, auth_headers, category="current_liability", subcategory="loan", name="New Loan", value=777.0)

    res = client.post(
        f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account",
        json={"create_account": {"name": "New Loan Account", "account_type": "loan"}},
        headers=auth_headers,
    )
    assert res.status_code == 200
    linked_account_id = res.json()["linked_account_id"]

    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    created = next(a for a in summary["accounts"] if a["id"] == linked_account_id)
    assert created["balance"] == -777.0

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    linked = _find(sheet, "current_liabilities", item["id"])
    assert linked["value"] == 777.0


def test_link_account_requires_exactly_one_option(client, auth_headers):
    item = _make_item(client, auth_headers)
    res = client.post(f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account", json={}, headers=auth_headers)
    assert res.status_code == 400

    acc = _make_account(client, auth_headers)
    res2 = client.post(
        f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account",
        json={"account_id": acc["id"], "create_account": {"name": "X", "account_type": "bank"}},
        headers=auth_headers,
    )
    assert res2.status_code == 400


def test_unlink_account_freezes_value_and_stops_tracking(client, auth_headers):
    acc = _make_account(client, auth_headers, name="Wallet", balance=80.0)
    item = _make_item(client, auth_headers, name="Wallet Item", value=1.0)
    client.post(f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account", json={"account_id": acc["id"]}, headers=auth_headers)

    unlinked = client.post(f"/api/v1/finance/balance-sheet/items/{item['id']}/unlink-account", headers=auth_headers).json()
    assert unlinked["linked_account_id"] is None
    assert unlinked["value"] == 80.0

    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "expense", "amount": 30.0, "category": "Food", "date": "2026-08-10"},
        headers=auth_headers,
    )
    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    frozen = _find(sheet, "current_assets", item["id"])
    assert frozen["value"] == 80.0  # unchanged — no longer tracking the account


def test_tagged_cash_and_credit_totals_reflect_live_linked_values(client, auth_headers):
    cash_acc = _make_account(client, auth_headers, name="Cash Acc", account_type="cash", balance=200.0)
    cash_item = _make_item(client, auth_headers, category="current_asset", subcategory="cash", name="Cash Item", value=1.0)
    client.post(f"/api/v1/finance/balance-sheet/items/{cash_item['id']}/link-account", json={"account_id": cash_acc["id"]}, headers=auth_headers)

    credit_acc = _make_account(client, auth_headers, name="CC Acc", account_type="credit_card", balance=-40.0)
    credit_item = _make_item(client, auth_headers, category="current_liability", subcategory="credit_card", name="CC Item", value=1.0)
    client.post(f"/api/v1/finance/balance-sheet/items/{credit_item['id']}/link-account", json={"account_id": credit_acc["id"]}, headers=auth_headers)

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    assert sheet["totals"]["total_cash_balance"] == 200.0
    assert sheet["totals"]["total_credit_balance"] == 40.0


def test_since_beginning_reflects_change_from_opening_balance(client, auth_headers):
    acc = _make_account(client, auth_headers, name="Growth Acc", balance=300.0)
    item = _make_item(client, auth_headers, name="Growth Item", value=1.0)
    client.post(f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account", json={"account_id": acc["id"]}, headers=auth_headers)

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    linked = _find(sheet, "current_assets", item["id"])
    assert linked["opening_value"] == 300.0
    assert linked["since_beginning"] == 0.0

    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "income", "amount": 45.0, "category": "Salary", "date": "2026-08-10"},
        headers=auth_headers,
    )
    sheet2 = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    updated = _find(sheet2, "current_assets", item["id"])
    assert updated["value"] == 345.0
    assert updated["opening_value"] == 300.0
    assert updated["since_beginning"] == 45.0


def test_unlinked_item_has_no_opening_value_or_since_beginning(client, auth_headers):
    item = _make_item(client, auth_headers, name="Manual Item", value=50.0)
    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    unlinked = _find(sheet, "current_assets", item["id"])
    assert unlinked["opening_value"] is None
    assert unlinked["since_beginning"] is None


def test_compare_to_date_replays_transactions_to_compute_historical_balance(client, auth_headers):
    acc = _make_account(client, auth_headers, name="Compare Acc", balance=500.0)
    item = _make_item(client, auth_headers, name="Compare Item", value=1.0)
    client.post(f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account", json={"account_id": acc["id"]}, headers=auth_headers)

    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "income", "amount": 100.0, "category": "Salary", "date": "2026-08-05"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "expense", "amount": 50.0, "category": "Food", "date": "2026-08-12"},
        headers=auth_headers,
    )
    # current balance: 500 + 100 - 50 = 550

    sheet = client.get("/api/v1/finance/balance-sheet", params={"compare_to": "2026-08-10"}, headers=auth_headers).json()
    linked = _find(sheet, "current_assets", item["id"])
    assert linked["value"] == 550.0
    # as of Aug 10, the Aug-5 income already happened but the Aug-12 expense hadn't yet: 500+100=600
    assert linked["compare_value"] == 600.0
    assert linked["compare_variance"] == -50.0
    assert sheet["totals"]["compare_to"] == "2026-08-10"
    assert sheet["totals"]["total_assets_change"] == -50.0


def test_compare_to_omitted_leaves_compare_fields_null(client, auth_headers):
    acc = _make_account(client, auth_headers, name="No Compare Acc", balance=200.0)
    item = _make_item(client, auth_headers, name="No Compare Item", value=1.0)
    client.post(f"/api/v1/finance/balance-sheet/items/{item['id']}/link-account", json={"account_id": acc["id"]}, headers=auth_headers)

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    linked = _find(sheet, "current_assets", item["id"])
    assert linked["compare_value"] is None
    assert linked["compare_variance"] is None
    assert "compare_to" not in sheet["totals"]
