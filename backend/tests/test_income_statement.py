"""Tests for the standard Income Statement format: fixed/variable classification, deduction
nesting, credit-card exclusion, granularity rollups, emergency fund, and analysis."""


def _make_category(client, auth_headers, **kwargs):
    payload = {"name": "Cat", "category_type": "income", "sort_order": 0}
    payload.update(kwargs)
    res = client.post("/api/v1/finance/categories", json=payload, headers=auth_headers)
    assert res.status_code == 200, res.text
    return res.json()


def _log_tx(client, auth_headers, account_id, transaction_type, amount, category, date):
    res = client.post(
        "/api/v1/finance/transactions",
        json={"account_id": account_id, "transaction_type": transaction_type, "amount": amount, "category": category, "date": date},
        headers=auth_headers,
    )
    assert res.status_code == 200, res.text
    return res.json()


def _account(client, auth_headers, name="IS Test Account"):
    return client.post("/api/v1/finance/accounts", json={"name": name, "account_type": "bank", "balance": 0.0}, headers=auth_headers).json()


# CATEGORY VALIDATION

def test_category_usage_reports_transaction_count_and_total(client, auth_headers):
    account = _account(client, auth_headers)
    cat = _make_category(client, auth_headers, name="Usage Cat", category_type="expense")
    _log_tx(client, auth_headers, account["id"], "expense", 40.0, "Usage Cat", "2026-03-01")
    _log_tx(client, auth_headers, account["id"], "expense", 60.0, "Usage Cat", "2026-03-05")

    res = client.get(f"/api/v1/finance/categories/{cat['id']}/usage", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["transaction_count"] == 2
    assert body["total_amount"] == 100.0


def test_category_usage_zero_for_unused_category(client, auth_headers):
    cat = _make_category(client, auth_headers, name="Unused Cat", category_type="expense")
    res = client.get(f"/api/v1/finance/categories/{cat['id']}/usage", headers=auth_headers)
    assert res.json() == {"transaction_count": 0, "total_amount": 0.0}

def test_category_classification_rejects_invalid_value_for_type(client, auth_headers):
    res = client.post(
        "/api/v1/finance/categories",
        json={"name": "Bad Income 2", "category_type": "income", "classification": "yearly"},
        headers=auth_headers,
    )
    assert res.status_code == 400

    ok = client.post(
        "/api/v1/finance/categories",
        json={"name": "Good Expense", "category_type": "expense", "classification": "yearly"},
        headers=auth_headers,
    )
    assert ok.status_code == 200


def test_category_parent_must_be_same_type_and_not_self(client, auth_headers):
    income_cat = _make_category(client, auth_headers, name="Gross Income A", category_type="income")
    expense_cat = _make_category(client, auth_headers, name="Some Expense", category_type="expense")

    mismatched = client.post(
        "/api/v1/finance/categories",
        json={"name": "Bad Deduction", "category_type": "income", "parent_category_id": expense_cat["id"], "is_deduction": True},
        headers=auth_headers,
    )
    assert mismatched.status_code == 400

    self_parent = client.put(
        f"/api/v1/finance/categories/{income_cat['id']}",
        json={"parent_category_id": income_cat["id"]},
        headers=auth_headers,
    )
    assert self_parent.status_code == 400


# GRID MATH

def test_income_statement_deduction_nets_against_fixed_bucket(client, auth_headers):
    account = _account(client, auth_headers)
    gross = _make_category(client, auth_headers, name="Gross Salary IS", category_type="income", classification="fixed")
    epf = _make_category(
        client, auth_headers, name="EPF Deduction IS", category_type="income", classification="fixed",
        parent_category_id=gross["id"], is_deduction=True,
    )
    _log_tx(client, auth_headers, account["id"], "income", 5000.0, "Gross Salary IS", "2026-03-05")
    _log_tx(client, auth_headers, account["id"], "income", 500.0, "EPF Deduction IS", "2026-03-05")

    res = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    fixed = body["income"]["fixed"]
    gross_line = next(l for l in fixed["lines"] if l["category"] == "Gross Salary IS")
    epf_line = next(l for l in fixed["lines"] if l["category"] == "EPF Deduction IS")
    assert gross_line["periods"][2] == 5000.0  # March = index 2
    assert epf_line["periods"][2] == -500.0  # deduction is sign-flipped
    assert epf_line["is_deduction"] is True
    assert epf_line["parent_category"] == "Gross Salary IS"
    assert fixed["periods"][2] == 4500.0
    assert body["income"]["gross_disposable_income"]["periods"][2] == 4500.0


def test_income_statement_credit_card_excluded_from_total_income_excl_cc(client, auth_headers):
    account = _account(client, auth_headers)
    _make_category(client, auth_headers, name="Salary CC Test", category_type="income", classification="fixed")
    _make_category(client, auth_headers, name="Loan from Credit Card", category_type="income", classification="variable", is_credit_card=True)
    _log_tx(client, auth_headers, account["id"], "income", 3000.0, "Salary CC Test", "2026-04-10")
    _log_tx(client, auth_headers, account["id"], "income", 800.0, "Loan from Credit Card", "2026-04-10")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers).json()
    total = body["income"]["total_income"]["periods"][3]  # April = index 3
    total_excl = body["income"]["total_income_excl_credit_card"]["periods"][3]
    assert total - total_excl == 800.0


def test_income_statement_expense_classification_buckets(client, auth_headers):
    account = _account(client, auth_headers)
    for name, cls in [("Rent IS", "fixed"), ("Dining IS", "variable"), ("Car Insurance IS", "yearly"), ("Client Reimbursement IS", "disbursement")]:
        _make_category(client, auth_headers, name=name, category_type="expense", classification=cls)
    _log_tx(client, auth_headers, account["id"], "expense", 100.0, "Rent IS", "2026-05-01")
    _log_tx(client, auth_headers, account["id"], "expense", 50.0, "Dining IS", "2026-05-02")
    _log_tx(client, auth_headers, account["id"], "expense", 300.0, "Car Insurance IS", "2026-05-03")
    _log_tx(client, auth_headers, account["id"], "expense", 20.0, "Client Reimbursement IS", "2026-05-04")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers).json()
    exp = body["expense"]
    idx = 4  # May
    assert exp["fixed"]["periods"][idx] == 100.0
    assert exp["variable"]["periods"][idx] == 50.0
    assert exp["yearly"]["periods"][idx] == 300.0
    assert exp["disbursement"]["periods"][idx] == 20.0
    assert exp["total_expense"]["periods"][idx] == 470.0


def test_transfer_to_debt_investment_asset_account_shows_as_disbursement_expense(client, auth_headers):
    src = _account(client, auth_headers, name="Transfer IS Src")
    loan_acc = client.post("/api/v1/finance/accounts", json={"name": "Transfer IS Loan", "account_type": "loan", "balance": -500.0}, headers=auth_headers).json()
    invest_acc = client.post("/api/v1/finance/accounts", json={"name": "Transfer IS Invest", "account_type": "investment", "balance": 0.0}, headers=auth_headers).json()
    bank_acc = client.post("/api/v1/finance/accounts", json={"name": "Transfer IS Bank", "account_type": "bank", "balance": 0.0}, headers=auth_headers).json()

    def transfer(to_id, amount):
        res = client.post(
            "/api/v1/finance/transactions",
            json={"account_id": src["id"], "to_account_id": to_id, "transaction_type": "transfer", "amount": amount, "category": "Transfer", "date": "2026-06-10"},
            headers=auth_headers,
        )
        assert res.status_code == 200

    transfer(loan_acc["id"], 200.0)     # debt payment -> should appear
    transfer(invest_acc["id"], 150.0)   # investment top-up -> should appear
    transfer(bank_acc["id"], 75.0)      # pure internal transfer -> should NOT appear

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers).json()
    disbursement_lines = {l["category"]: l for l in body["expense"]["disbursement"]["lines"]}
    assert "Transfer to Transfer IS Loan" in disbursement_lines
    assert "Transfer to Transfer IS Invest" in disbursement_lines
    assert not any("Transfer IS Bank" in name for name in disbursement_lines)

    idx = 5  # June
    assert disbursement_lines["Transfer to Transfer IS Loan"]["periods"][idx] == 200.0
    assert disbursement_lines["Transfer to Transfer IS Invest"]["periods"][idx] == 150.0
    assert body["expense"]["disbursement"]["periods"][idx] == 350.0


def test_disbursement_income_category_has_its_own_bucket(client, auth_headers):
    acc = _account(client, auth_headers, name="Disbursement Income Acc")
    cat = _make_category(client, auth_headers, name="Disbursement Income", classification="disbursement")
    _log_tx(client, auth_headers, acc["id"], "income", 250.0, "Disbursement Income", "2026-04-10")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers).json()
    disbursement_lines = {l["category"]: l for l in body["income"]["disbursement"]["lines"]}
    assert "Disbursement Income" in disbursement_lines
    assert disbursement_lines["Disbursement Income"]["periods"][3] == 250.0  # April
    assert body["income"]["disbursement"]["total"] == 250.0
    # Doesn't leak into the fixed/variable buckets or the wrong category's total.
    assert "Disbursement Income" not in {l["category"] for l in body["income"]["variable"]["lines"]}
    assert cat["classification"] == "disbursement"


def test_child_category_with_different_classification_than_parent_still_appears(client, auth_headers):
    account = _account(client, auth_headers, name="Mixed Classification Acc")
    parent = _make_category(client, auth_headers, name="Car Expenses Parent", category_type="expense", classification="fixed")
    child = _make_category(
        client, auth_headers, name="Car Repair Child", category_type="expense", classification="variable",
        parent_category_id=parent["id"],
    )
    _log_tx(client, auth_headers, account["id"], "expense", 80.0, "Car Repair Child", "2026-05-12")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers).json()
    variable_names = {l["category"] for l in body["expense"]["variable"]["lines"]}
    fixed_names = {l["category"] for l in body["expense"]["fixed"]["lines"]}
    assert "Car Repair Child" in variable_names
    assert "Car Repair Child" not in fixed_names
    variable_lines = {l["category"]: l for l in body["expense"]["variable"]["lines"]}
    assert variable_lines["Car Repair Child"]["periods"][4] == 80.0  # May
    assert child["classification"] == "variable"


def test_beginning_balance_replays_backward_from_current_cash_balance(client, auth_headers):
    account = _account(client, auth_headers, name="Beginning Balance Acc")
    _make_category(client, auth_headers, name="Beginning Balance Income", category_type="income", classification="fixed")
    _make_category(client, auth_headers, name="Beginning Balance Expense", category_type="expense", classification="fixed")

    # Mar: +500 income, Apr: -200 expense -> net +500, then -200. Account ends at 300.
    _log_tx(client, auth_headers, account["id"], "income", 500.0, "Beginning Balance Income", "2026-03-10")
    _log_tx(client, auth_headers, account["id"], "expense", 200.0, "Beginning Balance Expense", "2026-04-10")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers).json()
    bb = body["beginning_balance"]["periods"]
    # April ends at the account's actual current balance (300): beginning + net_income(-200) = 300 -> beginning = 500.
    assert bb[3] == 500.0  # April (index 3)
    # March: beginning + net_income(+500) = April's beginning (500) -> beginning = 0.
    assert bb[2] == 0.0  # March (index 2)
    assert body["beginning_balance"]["total"] == 300.0  # today's actual current cash balance


def test_income_statement_quarterly_rollup_sums_months_and_is_read_only(client, auth_headers):
    account = _account(client, auth_headers)
    _make_category(client, auth_headers, name="Quarterly Rollup Income", category_type="income", classification="fixed")
    _log_tx(client, auth_headers, account["id"], "income", 100.0, "Quarterly Rollup Income", "2026-01-15")
    _log_tx(client, auth_headers, account["id"], "income", 200.0, "Quarterly Rollup Income", "2026-02-15")
    _log_tx(client, auth_headers, account["id"], "income", 300.0, "Quarterly Rollup Income", "2026-03-15")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "quarterly"}, headers=auth_headers).json()
    assert body["editable"] is False
    assert body["period_labels"][0] == "Q1"
    line = next(l for l in body["income"]["fixed"]["lines"] if l["category"] == "Quarterly Rollup Income")
    assert line["periods"][0] == 600.0  # Jan+Feb+Mar


def test_income_statement_yearly_granularity_spans_five_years(client, auth_headers):
    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "yearly"}, headers=auth_headers).json()
    assert body["years"] == [2022, 2023, 2024, 2025, 2026]
    assert body["period_labels"] == ["2022", "2023", "2024", "2025", "2026"]
    assert body["editable"] is False


def test_income_statement_rejects_bad_granularity(client, auth_headers):
    res = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "bogus"}, headers=auth_headers)
    assert res.status_code == 400


def test_emergency_fund_and_cash_surplus(client, auth_headers):
    account = _account(client, auth_headers)
    _make_category(client, auth_headers, name="EF Expense Cat", category_type="expense", classification="variable")
    # Within the trailing 90-day lookback used for the projection default.
    _log_tx(client, auth_headers, account["id"], "expense", 900.0, "EF Expense Cat", "2026-08-01")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "monthly"}, headers=auth_headers).json()
    assert body["emergency_fund_3mo"] >= 0
    net = body["net_income"]["periods"]
    surplus = body["cash_surplus"]["periods"]
    for i in range(12):
        assert round(net[i] - body["emergency_fund_3mo"], 2) == surplus[i]

    # Total/average must subtract the emergency fund constant ONCE from the annual net income
    # total, not once per period — summing 12 already-adjusted periods would subtract it 12 times.
    assert body["cash_surplus"]["total"] == round(body["net_income"]["total"] - body["emergency_fund_3mo"], 2)
    assert body["cash_surplus"]["average"] == round(body["cash_surplus"]["total"] / 12, 2)


def test_analysis_fixed_and_variable_comparison(client, auth_headers):
    account = _account(client, auth_headers)
    _make_category(client, auth_headers, name="Analysis Fixed Income", category_type="income", classification="fixed")
    _make_category(client, auth_headers, name="Analysis Fixed Expense", category_type="expense", classification="fixed")
    _log_tx(client, auth_headers, account["id"], "income", 1000.0, "Analysis Fixed Income", "2026-06-01")
    _log_tx(client, auth_headers, account["id"], "expense", 400.0, "Analysis Fixed Expense", "2026-06-01")

    body = client.get("/api/v1/finance/income-statement/grid", params={"year": 2026, "granularity": "yearly"}, headers=auth_headers).json()
    fixed_analysis = body["analysis"]["fixed"]
    assert fixed_analysis["income"] - fixed_analysis["expense"] == fixed_analysis["diff"]


def test_income_statement_grid_requires_auth(client):
    assert client.get("/api/v1/finance/income-statement/grid", params={"year": 2026}).status_code == 401
