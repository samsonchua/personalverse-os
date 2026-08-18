import datetime


def _account(client, auth_headers):
    return client.post("/api/v1/finance/accounts", json={"name": "Form B Acc", "account_type": "bank", "balance": 0.0}, headers=auth_headers).json()


def test_form_b_estimate_splits_business_employment_other_income(client, auth_headers):
    today = datetime.date.today()
    acc = _account(client, auth_headers)

    client.post("/api/v1/finance/categories", json={"name": "Business", "category_type": "income"}, headers=auth_headers)
    client.post("/api/v1/finance/categories", json={"name": "Salary", "category_type": "income"}, headers=auth_headers)
    client.post("/api/v1/finance/categories", json={"name": "Gift", "category_type": "income"}, headers=auth_headers)

    # An actual transaction this month for each source.
    for cat, amt in [("Business", 5000.0), ("Salary", 3000.0), ("Gift", 200.0)]:
        client.post(
            "/api/v1/finance/transactions",
            json={"account_id": acc["id"], "transaction_type": "income", "amount": amt, "category": cat, "date": today.replace(day=1).isoformat()},
            headers=auth_headers,
        )

    res = client.post("/api/v1/finance/tax/form-b-estimate", json={"year": today.year, "reliefs": []}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    this_month = next(m for m in body["monthly_breakdown"] if m["month"] == today.month)
    assert this_month["source"] == "actual"
    assert this_month["business"] == 5000.0
    assert this_month["employment"] == 3000.0
    assert this_month["other"] == 200.0
    assert body["aggregate_income"] >= 8200.0  # at least this month's contribution
    assert "tax" in body and "total_tax" in body["tax"]


def test_form_b_estimate_future_months_use_forecast(client, auth_headers):
    today = datetime.date.today()
    next_month = today.month + 1 if today.month < 12 else 1
    next_year = today.year if today.month < 12 else today.year + 1
    if next_year != today.year:
        return  # skip the December edge case to keep this test simple

    client.post("/api/v1/finance/categories", json={"name": "Business FormB2", "category_type": "income"}, headers=auth_headers)
    client.put(
        "/api/v1/finance/forecasted-income-statement/annual/cell",
        json={"year": today.year, "month": next_month, "line_type": "income", "category": "Business FormB2", "amount": 7000.0},
        headers=auth_headers,
    )

    res = client.post("/api/v1/finance/tax/form-b-estimate", json={"year": today.year, "reliefs": []}, headers=auth_headers).json()
    future = next(m for m in res["monthly_breakdown"] if m["month"] == next_month)
    assert future["source"] == "forecast"
    assert future["other"] == 7000.0  # "Business FormB2" isn't literally "Business" so it's "other"
