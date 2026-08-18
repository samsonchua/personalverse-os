import pytest


# BALANCE SHEET

def test_balance_sheet_empty_by_default(client, auth_headers):
    # `auth_headers` registers a brand-new user for this test. Since balance sheet queries are now
    # scoped by user_id, this is guaranteed zero regardless of what other tests/tenants have
    # inserted or what order tests run in — it's no longer relying on this being the first test in
    # the session to ever touch the table (see test_multi_tenancy.py for isolation coverage).
    res = client.get("/api/v1/finance/balance-sheet", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["totals"]["net_worth"] == 0


def test_balance_sheet_item_crud_and_totals(client, auth_headers):
    asset = client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "fixed_asset", "name": "House", "value": 500000, "nominee": "Spouse"},
        headers=auth_headers,
    )
    assert asset.status_code == 200
    asset_id = asset.json()["id"]

    liability = client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "fixed_liability", "name": "Mortgage", "value": 300000, "nominee": "Spouse"},
        headers=auth_headers,
    )
    assert liability.status_code == 200

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    assert sheet["totals"]["fixed_assets"] == 500000
    assert sheet["totals"]["fixed_liabilities"] == 300000
    assert sheet["totals"]["net_worth"] == 200000

    upd = client.put(f"/api/v1/finance/balance-sheet/items/{asset_id}", json={"value": 550000}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["value"] == 550000

    delete = client.delete(f"/api/v1/finance/balance-sheet/items/{asset_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_balance_sheet_item_rejects_invalid_category(client, auth_headers):
    res = client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "not_real", "name": "X", "value": 1},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_balance_sheet_requires_auth(client):
    assert client.get("/api/v1/finance/balance-sheet").status_code == 401


# INSURANCE

def test_insurance_policy_crud(client, auth_headers):
    create = client.post(
        "/api/v1/finance/insurance",
        json={"policy_type": "life", "provider": "AIA", "coverage_amount": 500000, "premium_amount": 1200, "nominee": "Spouse"},
        headers=auth_headers,
    )
    assert create.status_code == 200
    policy_id = create.json()["id"]

    listed = client.get("/api/v1/finance/insurance", headers=auth_headers).json()
    assert any(p["id"] == policy_id for p in listed)

    upd = client.put(f"/api/v1/finance/insurance/{policy_id}", json={"premium_amount": 1300}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["premium_amount"] == 1300

    delete = client.delete(f"/api/v1/finance/insurance/{policy_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_ncd_forecast_progresses_correctly(client, auth_headers):
    car_policy = client.post(
        "/api/v1/finance/insurance",
        json={"policy_type": "car", "provider": "Allianz", "coverage_amount": 60000, "premium_amount": 2000, "ncd_percent": 25.0},
        headers=auth_headers,
    ).json()

    res = client.get(f"/api/v1/finance/insurance/{car_policy['id']}/ncd-forecast", params={"years": 3}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["current_ncd_percent"] == 25.0
    ncds = [f["ncd_percent"] for f in body["forecast"]]
    assert ncds[0] == 25.0
    assert ncds[1] == 30.0
    assert ncds[2] == 38.33
    assert ncds[3] == 45.0


def test_ncd_forecast_rejects_non_car_policy(client, auth_headers):
    life_policy = client.post(
        "/api/v1/finance/insurance",
        json={"policy_type": "life", "provider": "AIA", "coverage_amount": 100000, "premium_amount": 500},
        headers=auth_headers,
    ).json()
    res = client.get(f"/api/v1/finance/insurance/{life_policy['id']}/ncd-forecast", headers=auth_headers)
    assert res.status_code == 400


# LOANS / INSTALMENTS

def test_loan_amortization_schedule_pays_off_exactly(client, auth_headers):
    loan = client.post(
        "/api/v1/finance/loans",
        json={"name": "Car Loan", "loan_type": "car_loan", "principal_amount": 60000, "annual_interest_rate": 3.5, "tenure_months": 60, "start_date": "2026-01-01"},
        headers=auth_headers,
    )
    assert loan.status_code == 200
    loan_id = loan.json()["id"]

    schedule = client.get(f"/api/v1/finance/loans/{loan_id}/schedule", headers=auth_headers)
    assert schedule.status_code == 200
    body = schedule.json()
    assert len(body["schedule"]) == 60
    assert body["schedule"][-1]["balance"] == 0.0
    assert body["monthly_payment"] > 0

    listed = client.get("/api/v1/finance/loans", headers=auth_headers).json()
    assert any(l["id"] == loan_id and l["monthly_payment"] == body["monthly_payment"] for l in listed)

    delete = client.delete(f"/api/v1/finance/loans/{loan_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_loan_zero_interest_divides_evenly(client, auth_headers):
    loan = client.post(
        "/api/v1/finance/loans",
        json={"name": "Interest Free Plan", "loan_type": "other", "principal_amount": 1200, "annual_interest_rate": 0, "tenure_months": 12, "start_date": "2026-01-01"},
        headers=auth_headers,
    ).json()
    schedule = client.get(f"/api/v1/finance/loans/{loan['id']}/schedule", headers=auth_headers).json()
    assert schedule["monthly_payment"] == 100.0
    assert schedule["total_interest"] == 0.0


# INVESTMENTS

def test_investment_gain_loss_calculation(client, auth_headers):
    create = client.post(
        "/api/v1/finance/investments",
        json={"name": "S&P 500 ETF", "investment_type": "etf", "units": 100, "avg_cost_per_unit": 10, "current_price_per_unit": 12},
        headers=auth_headers,
    )
    assert create.status_code == 200
    body = create.json()
    assert body["cost_basis"] == 1000
    assert body["current_value"] == 1200
    assert body["gain_loss"] == 200
    assert body["gain_loss_pct"] == 20.0

    summary = client.get("/api/v1/finance/investments/summary", headers=auth_headers).json()
    assert summary["total_current_value"] >= 1200
    assert "etf" in summary["allocation_by_type"]


def test_investment_update_and_delete(client, auth_headers):
    inv = client.post(
        "/api/v1/finance/investments",
        json={"name": "Gold", "investment_type": "other", "units": 5, "avg_cost_per_unit": 300, "current_price_per_unit": 320},
        headers=auth_headers,
    ).json()

    upd = client.put(f"/api/v1/finance/investments/{inv['id']}", json={"current_price_per_unit": 350}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["current_value"] == 1750

    delete = client.delete(f"/api/v1/finance/investments/{inv['id']}", headers=auth_headers)
    assert delete.status_code == 200


# EPF

def test_epf_profile_upsert_and_forecast(client, auth_headers):
    create = client.post(
        "/api/v1/finance/epf",
        json={"current_balance": 100000, "monthly_salary": 8000, "current_age": 30, "retirement_age": 32},
        headers=auth_headers,
    )
    assert create.status_code == 200

    update = client.post(
        "/api/v1/finance/epf",
        json={"current_balance": 120000, "monthly_salary": 9000, "current_age": 30, "retirement_age": 32},
        headers=auth_headers,
    )
    assert update.status_code == 200
    assert update.json()["current_balance"] == 120000

    forecast = client.get("/api/v1/finance/epf/forecast", headers=auth_headers)
    assert forecast.status_code == 200
    body = forecast.json()
    assert len(body["years"]) == 3  # age 30, 31, 32
    assert body["years"][0]["balance"] == 120000
    assert body["years"][-1]["balance"] > 120000


def test_epf_retirement_readiness_uses_withdrawal_rate_and_average_expense(client, auth_headers):
    client.post(
        "/api/v1/finance/epf",
        json={"current_balance": 1000000, "monthly_salary": 0, "current_age": 60, "retirement_age": 60, "safe_withdrawal_rate": 4.0},
        headers=auth_headers,
    )
    body = client.get("/api/v1/finance/epf/forecast", headers=auth_headers).json()
    assert body["projected_retirement_balance"] == 1000000
    # 4% of 1,000,000 per year = 40,000/year = 3,333.33/month
    assert body["projected_monthly_retirement_income"] == 3333.33
    assert "current_avg_monthly_expense" in body
    assert body["retirement_income_gap"] == round(body["projected_monthly_retirement_income"] - body["current_avg_monthly_expense"], 2)
    assert body["is_on_track"] == (body["retirement_income_gap"] >= 0)


def test_epf_profile_response_includes_safe_withdrawal_rate(client, auth_headers):
    client.post("/api/v1/finance/epf", json={"current_balance": 5000, "monthly_salary": 3000, "current_age": 25, "retirement_age": 55, "safe_withdrawal_rate": 3.5}, headers=auth_headers)
    profile = client.get("/api/v1/finance/epf", headers=auth_headers).json()
    assert profile["safe_withdrawal_rate"] == 3.5


def test_epf_balance_synced_from_flagged_accounts(client, auth_headers):
    client.post(
        "/api/v1/finance/epf",
        json={"current_balance": 999, "monthly_salary": 5000, "current_age": 30, "retirement_age": 31},
        headers=auth_headers,
    )
    acc1 = client.post("/api/v1/finance/accounts", json={"name": "EPF Acc 1", "account_type": "investment", "balance": 50000}, headers=auth_headers).json()
    acc2 = client.post("/api/v1/finance/accounts", json={"name": "EPF Acc 2", "account_type": "investment", "balance": 15000}, headers=auth_headers).json()
    client.put(f"/api/v1/finance/accounts/{acc1['id']}", json={"counts_toward_epf": True}, headers=auth_headers)
    client.put(f"/api/v1/finance/accounts/{acc2['id']}", json={"counts_toward_epf": True}, headers=auth_headers)

    profile = client.get("/api/v1/finance/epf", headers=auth_headers).json()
    assert profile["current_balance"] == 65000
    assert profile["is_balance_synced"] is True

    forecast = client.get("/api/v1/finance/epf/forecast", headers=auth_headers).json()
    assert forecast["years"][0]["balance"] == 65000


# TAX

def test_tax_calculation_progressive_brackets(client, auth_headers):
    res = client.post(
        "/api/v1/finance/tax/calculate",
        json={"annual_income": 80000, "reliefs": [{"name": "Individual relief", "amount": 9000}, {"name": "EPF", "amount": 4000}]},
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["chargeable_income"] == 67000
    assert body["total_tax"] > 0
    assert body["net_income"] == 80000 - body["total_tax"]
    assert body["marginal_rate_percent"] == 11.0


def test_tax_calculation_zero_income_has_no_tax(client, auth_headers):
    res = client.post("/api/v1/finance/tax/calculate", json={"annual_income": 0, "reliefs": []}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["total_tax"] == 0


def test_tax_suggested_reliefs_endpoint(client, auth_headers):
    res = client.get("/api/v1/finance/tax/suggested-reliefs", headers=auth_headers)
    assert res.status_code == 200
    assert len(res.json()) > 0


# CASHFLOW FORECAST

@pytest.mark.parametrize("granularity", ["monthly", "quarterly", "semi_yearly", "yearly"])
def test_cashflow_forecast_all_granularities(client, auth_headers, granularity):
    res = client.get("/api/v1/finance/cashflow-forecast", params={"granularity": granularity}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["granularity"] == granularity
    assert len(body["forecast"]) > 0
    assert "projected_balance" in body["forecast"][0]


def test_cashflow_forecast_rejects_invalid_granularity(client, auth_headers):
    res = client.get("/api/v1/finance/cashflow-forecast", params={"granularity": "fortnightly"}, headers=auth_headers)
    assert res.status_code == 422


# INCOME STATEMENT

def test_income_statement_groups_by_category_and_computes_net(client, auth_headers):
    account = client.post(
        "/api/v1/finance/accounts", json={"name": "Checking", "account_type": "bank", "balance": 0}, headers=auth_headers,
    ).json()

    for amount, category, date in [
        (5000, "Salary", "2026-06-05"),
        (500, "Freelance", "2026-06-10"),
        (1200, "Rent", "2026-06-01"),
        (300, "Groceries", "2026-06-15"),
        (4000, "Salary", "2026-05-05"),
        (2000, "Rent", "2026-05-01"),
    ]:
        tx_type = "income" if category in ("Salary", "Freelance") else "expense"
        client.post(
            "/api/v1/finance/transactions",
            json={"account_id": account["id"], "transaction_type": tx_type, "amount": amount, "category": category, "date": date},
            headers=auth_headers,
        )

    statement = client.get("/api/v1/finance/income-statement", params={"period": "2026-06"}, headers=auth_headers)
    assert statement.status_code == 200
    body = statement.json()
    assert body["income_by_category"]["Salary"] == 5000
    assert body["income_by_category"]["Freelance"] == 500
    assert body["expense_by_category"]["Rent"] == 1200
    assert body["total_income"] == 5500
    assert body["total_expense"] == 1500
    assert body["net_income"] == 4000
    assert body["prior_period"] == "2026-05"
    assert body["prior_total_income"] == 4000
    assert body["income_change_pct"] == 37.5
    assert body["savings_rate_pct"] == round(4000 / 5500 * 100, 1)


def test_income_statement_handles_year_boundary_and_empty_period(client, auth_headers):
    res = client.get("/api/v1/finance/income-statement", params={"period": "2026-01"}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["prior_period"] == "2025-12"
    assert body["total_income"] == 0
    assert body["income_change_pct"] is None
    assert body["savings_rate_pct"] == 0.0


def test_income_statement_requires_auth(client):
    assert client.get("/api/v1/finance/income-statement", params={"period": "2026-06"}).status_code == 401


def test_new_finance_endpoints_require_auth(client):
    assert client.get("/api/v1/finance/insurance").status_code == 401
    assert client.get("/api/v1/finance/loans").status_code == 401
    assert client.get("/api/v1/finance/investments").status_code == 401
    assert client.get("/api/v1/finance/epf").status_code == 401
    assert client.post("/api/v1/finance/tax/calculate", json={"annual_income": 1000}).status_code == 401
    assert client.get("/api/v1/finance/cashflow-forecast").status_code == 401


# ACCOUNT ICON

def test_account_icon_create_and_update(client, auth_headers):
    acc = client.post(
        "/api/v1/finance/accounts",
        json={"name": "Icon Test Account", "account_type": "bank", "icon": "landmark"},
        headers=auth_headers,
    )
    assert acc.status_code == 200
    assert acc.json()["icon"] == "landmark"

    upd = client.put(f"/api/v1/finance/accounts/{acc.json()['id']}", json={"icon": "piggy-bank"}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["icon"] == "piggy-bank"


# TRANSACTION CATEGORIES

def test_transaction_category_crud(client, auth_headers):
    created = client.post(
        "/api/v1/finance/categories",
        json={"name": "Side Hustle Income", "category_type": "income"},
        headers=auth_headers,
    )
    assert created.status_code == 200
    cat_id = created.json()["id"]

    listed = client.get("/api/v1/finance/categories", params={"category_type": "income"}, headers=auth_headers).json()
    assert any(c["id"] == cat_id for c in listed)
    assert all(c["category_type"] == "income" for c in listed)

    upd = client.put(f"/api/v1/finance/categories/{cat_id}", json={"name": "Freelance Income"}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["name"] == "Freelance Income"

    delete = client.delete(f"/api/v1/finance/categories/{cat_id}", headers=auth_headers)
    assert delete.status_code == 200

    listed_after = client.get("/api/v1/finance/categories", headers=auth_headers).json()
    assert not any(c["id"] == cat_id for c in listed_after)


def test_transaction_category_rejects_bad_type(client, auth_headers):
    res = client.post("/api/v1/finance/categories", json={"name": "X", "category_type": "bogus"}, headers=auth_headers)
    assert res.status_code == 400


# BALANCE SHEET HIERARCHY, SUBCATEGORY, VARIANCE

def test_balance_sheet_hierarchy_nests_sub_items_and_sums_total_value(client, auth_headers):
    parent = client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_asset", "name": "Investment Portfolio", "value": 1000},
        headers=auth_headers,
    ).json()
    child = client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_asset", "name": "Sub Fund A", "value": 500, "parent_id": parent["id"]},
        headers=auth_headers,
    ).json()

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    parent_node = next(i for i in sheet["current_assets"] if i["id"] == parent["id"])
    assert len(parent_node["sub_items"]) == 1
    assert parent_node["sub_items"][0]["id"] == child["id"]
    assert parent_node["value"] == 1000
    assert parent_node["total_value"] == 1500  # own value + sub-items

    # Deleting a parent orphans (not deletes) its children.
    client.delete(f"/api/v1/finance/balance-sheet/items/{parent['id']}", headers=auth_headers)
    sheet_after = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    orphan = next(i for i in sheet_after["current_assets"] if i["id"] == child["id"])
    assert orphan["parent_id"] is None


def test_balance_sheet_item_rejects_self_parenting(client, auth_headers):
    item = client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_asset", "name": "Self Parent Test", "value": 1},
        headers=auth_headers,
    ).json()
    res = client.put(f"/api/v1/finance/balance-sheet/items/{item['id']}", json={"parent_id": item["id"]}, headers=auth_headers)
    assert res.status_code == 400


def test_balance_sheet_subcategory_feeds_cash_and_credit_totals(client, auth_headers):
    cash_before = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()["totals"]["total_cash_balance"]
    credit_before = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()["totals"]["total_credit_balance"]

    client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_asset", "name": "Cash in Hand", "value": 300, "subcategory": "cash"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_liability", "name": "Visa Card", "value": 450, "subcategory": "credit_card", "min_payment": 50, "instalment_amount": 100},
        headers=auth_headers,
    )

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    assert sheet["totals"]["total_cash_balance"] == round(cash_before + 300, 2)
    assert sheet["totals"]["total_credit_balance"] == round(credit_before + 450, 2)
    liability = next(i for i in sheet["current_liabilities"] if i["name"] == "Visa Card")
    assert liability["min_payment"] == 50
    assert liability["instalment_amount"] == 100


def test_finance_summary_cash_and_credit_balance_is_accounts_only_not_double_counted(client, auth_headers):
    # Total Cash/Credit Balance must come from live accounts only. A balance sheet item tagged the
    # same subcategory (e.g. "Cash in Hand") represents the same money, not additional money, so it
    # must NOT also be added — otherwise a user who tracks both ends up with an inflated total.
    before = client.get("/api/v1/finance/summary", headers=auth_headers).json()

    client.post("/api/v1/finance/accounts", json={"name": "Delta Cash Account", "account_type": "cash", "balance": 200}, headers=auth_headers)
    client.post("/api/v1/finance/accounts", json={"name": "Delta Credit Account", "account_type": "credit_card", "balance": 75}, headers=auth_headers)
    client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "current_asset", "name": "Delta Cash In Hand", "value": 25, "subcategory": "cash"},
        headers=auth_headers,
    )

    after = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    assert round(after["total_cash_balance"] - before["total_cash_balance"], 2) == 200  # account only, BS item not added on top
    assert round(after["total_credit_balance"] - before["total_credit_balance"], 2) == 75


# FORECASTED INCOME STATEMENT + HOURLY INCOME

def test_hourly_income_calculation(client, auth_headers):
    account = client.post("/api/v1/finance/accounts", json={"name": "Hourly Test Account", "account_type": "bank", "balance": 0}, headers=auth_headers).json()
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": account["id"], "transaction_type": "income", "amount": 4000, "category": "Salary", "date": "2023-03-10"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": account["id"], "transaction_type": "expense", "amount": 1000, "category": "Rent", "date": "2023-03-11"},
        headers=auth_headers,
    )

    res = client.get("/api/v1/finance/income-statement", params={"period": "2023-03", "hours_worked": 100}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["hourly_gross_income"] == 40.0
    assert body["hourly_net_income"] == 30.0

    no_hours = client.get("/api/v1/finance/income-statement", params={"period": "2023-03"}, headers=auth_headers).json()
    assert no_hours["hourly_gross_income"] is None


def test_forecasted_income_statement_scales_by_period(client, auth_headers):
    res = client.get("/api/v1/finance/forecasted-income-statement", params={"granularity": "monthly", "lookback_days": 90}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["granularity"] == "monthly"
    assert body["net_income"] == round(body["total_income"] - body["total_expense"], 2)

    bad = client.get("/api/v1/finance/forecasted-income-statement", params={"granularity": "bogus"}, headers=auth_headers)
    assert bad.status_code == 400


def test_forecasted_income_statement_requires_auth(client):
    assert client.get("/api/v1/finance/forecasted-income-statement").status_code == 401


# LOAN LINKED ASSET DEPRECIATION

def test_loan_payment_depreciates_linked_asset(client, auth_headers):
    asset = client.post(
        "/api/v1/finance/balance-sheet/items",
        json={"category": "fixed_asset", "name": "Financed Car", "value": 80000},
        headers=auth_headers,
    ).json()
    account = client.post("/api/v1/finance/accounts", json={"name": "Loan Payment Account", "account_type": "bank", "balance": 5000}, headers=auth_headers).json()
    loan = client.post(
        "/api/v1/finance/loans",
        json={
            "name": "Car Loan", "loan_type": "car_loan", "principal_amount": 80000, "annual_interest_rate": 3.5,
            "tenure_months": 60, "start_date": "2023-01-01", "linked_asset_id": asset["id"],
        },
        headers=auth_headers,
    ).json()
    assert loan["linked_asset_id"] == asset["id"]

    payment = client.post(
        f"/api/v1/finance/loans/{loan['id']}/log-payment",
        json={"account_id": account["id"], "amount": 1500, "date": "2023-02-01"},
        headers=auth_headers,
    )
    assert payment.status_code == 200
    body = payment.json()
    assert body["transaction"]["amount"] == 1500
    assert body["transaction"]["category"] == "Loan Payment"
    assert body["depreciated_asset"]["value"] == 78500  # 80000 - 1500
    assert body["depreciation_amount"] == 1500

    sheet = client.get("/api/v1/finance/balance-sheet", headers=auth_headers).json()
    node = next(i for i in sheet["fixed_assets"] if i["id"] == asset["id"])
    assert node["value"] == 78500

    updated_account = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    acc = next(a for a in updated_account["accounts"] if a["id"] == account["id"])
    assert acc["balance"] == 3500  # 5000 - 1500


def test_cashflow_forecast_current_balance_matches_total_cash_balance(client, auth_headers):
    # Cash/bank accounts should count toward "current balance"; a credit card's negative balance
    # (debt, not spendable cash) should not silently offset it — current_balance must equal the
    # same total_cash_balance figure shown everywhere else in the app, not a raw sum of all accounts.
    client.post("/api/v1/finance/accounts", json={"name": "Forecast Bank", "account_type": "bank", "balance": 1000.0}, headers=auth_headers)
    client.post("/api/v1/finance/accounts", json={"name": "Forecast Credit", "account_type": "credit_card", "balance": -400.0}, headers=auth_headers)

    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    forecast = client.get("/api/v1/finance/cashflow-forecast", params={"granularity": "monthly"}, headers=auth_headers).json()
    assert forecast["current_balance"] == summary["total_cash_balance"]


def test_cashflow_forecast_uses_budget_not_average_and_deducts_actuals_so_far(client, auth_headers):
    import datetime as _dt
    today = _dt.date.today()

    # Compare before/after deltas rather than absolute totals — other tests in this shared-db
    # session log their own income around "today", which would otherwise contaminate the total.
    before = client.get("/api/v1/finance/cashflow-forecast", params={"granularity": "monthly", "periods": 1}, headers=auth_headers).json()

    acc = client.post("/api/v1/finance/accounts", json={"name": "Budget Forecast Acc", "account_type": "bank", "balance": 0.0}, headers=auth_headers).json()
    client.post("/api/v1/finance/categories", json={"name": "Budget Forecast Income", "category_type": "income"}, headers=auth_headers)

    # Set this month's budgeted income to 1000 via a manual forecast override.
    client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": today.year, "month": today.month, "line_type": "income", "category": "Budget Forecast Income", "amount": 1000.0},
        headers=auth_headers,
    )
    # 300 of it has already actually happened this month — dated the 1st rather than exactly
    # "today" to sidestep local-vs-UTC day-boundary ambiguity (the server computes "today" in UTC).
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": acc["id"], "transaction_type": "income", "amount": 300.0, "category": "Budget Forecast Income", "date": today.replace(day=1).isoformat()},
        headers=auth_headers,
    )

    after = client.get("/api/v1/finance/cashflow-forecast", params={"granularity": "monthly", "periods": 1}, headers=auth_headers).json()
    # Only the remaining 700 (1000 budget - 300 already happened) should be projected forward —
    # the 300 already landed in the account and is reflected in current_balance instead.
    delta = after["forecast"][0]["projected_income"] - before["forecast"][0]["projected_income"]
    assert delta == 700.0


def test_cashflow_forecast_include_standby_cash_adds_flagged_account_balances(client, auth_headers):
    client.post("/api/v1/finance/accounts", json={"name": "Standby Test Bank", "account_type": "bank", "balance": 500.0}, headers=auth_headers)
    standby = client.post("/api/v1/finance/accounts", json={"name": "Standby Test Asset", "account_type": "asset", "balance": 2000.0}, headers=auth_headers).json()

    without = client.get("/api/v1/finance/cashflow-forecast", params={"granularity": "monthly"}, headers=auth_headers).json()
    client.put(f"/api/v1/finance/accounts/{standby['id']}", json={"is_standby_cash": True}, headers=auth_headers)
    with_standby = client.get("/api/v1/finance/cashflow-forecast", params={"granularity": "monthly", "include_standby_cash": True}, headers=auth_headers).json()

    assert with_standby["current_balance"] - without["current_balance"] == 2000.0


# ANNUAL FORECASTED INCOME STATEMENT (editable Jan-Dec grid)

def test_annual_forecast_defaults_to_projection_and_has_all_twelve_months(client, auth_headers):
    account = client.post("/api/v1/finance/accounts", json={"name": "Annual FC Account", "account_type": "bank", "balance": 0.0}, headers=auth_headers).json()
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": account["id"], "transaction_type": "income", "amount": 3000, "category": "Annual FC Salary", "date": "2026-08-01"},
        headers=auth_headers,
    )

    res = client.get("/api/v1/finance/forecasted-income-statement/annual", params={"year": 2026}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["year"] == 2026
    assert len(body["period_labels"]) == 12
    assert body["editable"] is True

    # unclassified categories default to the "variable" bucket
    line = next(l for l in body["income"]["variable"]["lines"] if l["category"] == "Annual FC Salary")
    assert len(line["periods"]) == 12
    assert all(m == line["periods"][0] for m in line["periods"])  # unedited -> same default every month
    assert line["average"] == line["periods"][0]
    assert round(line["total"], 2) == round(sum(line["periods"]), 2)


def test_annual_forecast_cell_upsert_overrides_one_month_and_recomputes_average(client, auth_headers):
    upsert = client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": 2027, "month": 3, "line_type": "expense", "category": "Annual FC Rent", "amount": 1200.0},
        headers=auth_headers,
    )
    assert upsert.status_code == 200

    body = client.get("/api/v1/finance/forecasted-income-statement/annual", params={"year": 2027}, headers=auth_headers).json()
    line = next(l for l in body["expense"]["variable"]["lines"] if l["category"] == "Annual FC Rent")
    assert line["periods"][2] == 1200.0  # March is index 2
    assert line["periods"][0] == 0.0  # other months untouched, no expense history to default from
    assert line["average"] == round(1200.0 / 12, 2)
    assert line["total"] == 1200.0
    assert body["expense"]["variable"]["periods"][2] >= 1200.0

    # overriding again updates the same cell instead of duplicating it
    client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": 2027, "month": 3, "line_type": "expense", "category": "Annual FC Rent", "amount": 1500.0},
        headers=auth_headers,
    )
    body2 = client.get("/api/v1/finance/forecasted-income-statement/annual", params={"year": 2027}, headers=auth_headers).json()
    line2 = next(l for l in body2["expense"]["variable"]["lines"] if l["category"] == "Annual FC Rent")
    assert line2["periods"][2] == 1500.0


def test_annual_forecast_cell_reset_reverts_to_default(client, auth_headers):
    client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": 2028, "month": 6, "line_type": "income", "category": "Annual FC Bonus", "amount": 9999.0},
        headers=auth_headers,
    )
    before = client.get("/api/v1/finance/forecasted-income-statement/annual", params={"year": 2028}, headers=auth_headers).json()
    assert next(l for l in before["income"]["variable"]["lines"] if l["category"] == "Annual FC Bonus")["periods"][5] == 9999.0

    reset = client.delete(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        params={"year": 2028, "month": 6, "line_type": "income", "category": "Annual FC Bonus"},
        headers=auth_headers,
    )
    assert reset.status_code == 200

    after = client.get("/api/v1/finance/forecasted-income-statement/annual", params={"year": 2028}, headers=auth_headers).json()
    # category with no transaction history and no override defaults to 0 and may not even appear
    line = next((l for l in after["income"]["variable"]["lines"] if l["category"] == "Annual FC Bonus"), None)
    assert line is None or line["periods"][5] == 0.0


def test_annual_forecast_rejects_bad_month_and_line_type(client, auth_headers):
    bad_month = client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": 2026, "month": 13, "line_type": "income", "category": "X", "amount": 1.0},
        headers=auth_headers,
    )
    assert bad_month.status_code == 400

    bad_type = client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": 2026, "month": 1, "line_type": "savings", "category": "X", "amount": 1.0},
        headers=auth_headers,
    )
    assert bad_type.status_code == 400


def test_annual_forecast_requires_auth(client):
    assert client.get("/api/v1/finance/forecasted-income-statement/annual", params={"year": 2026}).status_code == 401
    assert client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": 2026, "month": 1, "line_type": "income", "category": "X", "amount": 1.0},
    ).status_code == 401


def test_loan_payment_without_linked_asset_still_logs_transaction(client, auth_headers):
    account = client.post("/api/v1/finance/accounts", json={"name": "No Link Account", "account_type": "bank", "balance": 1000}, headers=auth_headers).json()
    loan = client.post(
        "/api/v1/finance/loans",
        json={"name": "Personal Loan", "loan_type": "other", "principal_amount": 5000, "annual_interest_rate": 5, "tenure_months": 12, "start_date": "2023-01-01"},
        headers=auth_headers,
    ).json()

    payment = client.post(
        f"/api/v1/finance/loans/{loan['id']}/log-payment",
        json={"account_id": account["id"], "date": "2023-02-01"},  # amount omitted -> defaults to computed monthly payment
        headers=auth_headers,
    )
    assert payment.status_code == 200
    body = payment.json()
    assert body["depreciated_asset"] is None
    assert body["depreciation_amount"] == 0.0
    assert body["transaction"]["amount"] > 0
