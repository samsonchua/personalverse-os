def _make_account(client, auth_headers, name="Stocks", account_type="investment", balance=0.0):
    return client.post(
        "/api/v1/finance/accounts",
        json={"name": name, "account_type": account_type, "balance": balance},
        headers=auth_headers,
    ).json()


def _account_balance(client, auth_headers, account_id):
    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    return next(a for a in summary["accounts"] if a["id"] == account_id)["balance"]


def test_account_synced_from_portfolio_tracks_total_current_value(client, auth_headers):
    acc = _make_account(client, auth_headers)
    client.put(f"/api/v1/finance/accounts/{acc['id']}", json={"tracks_investment_portfolio": True}, headers=auth_headers)

    client.post(
        "/api/v1/finance/investments",
        json={"name": "VWRA", "investment_type": "etf", "units": 10, "avg_cost_per_unit": 100, "current_price_per_unit": 120},
        headers=auth_headers,
    )
    assert _account_balance(client, auth_headers, acc["id"]) == 1200.0

    inv2 = client.post(
        "/api/v1/finance/investments",
        json={"name": "Bitcoin", "investment_type": "crypto", "units": 0.5, "avg_cost_per_unit": 50000, "current_price_per_unit": 60000},
        headers=auth_headers,
    ).json()
    assert _account_balance(client, auth_headers, acc["id"]) == 31200.0  # 1200 + 30000

    client.put(f"/api/v1/finance/investments/{inv2['id']}", json={"current_price_per_unit": 70000}, headers=auth_headers)
    assert _account_balance(client, auth_headers, acc["id"]) == 36200.0  # 1200 + 35000

    client.delete(f"/api/v1/finance/investments/{inv2['id']}", headers=auth_headers)
    assert _account_balance(client, auth_headers, acc["id"]) == 1200.0


def test_account_not_flagged_is_unaffected_by_investment_changes(client, auth_headers):
    acc = _make_account(client, auth_headers, name="Untouched", balance=500.0)
    client.post(
        "/api/v1/finance/investments",
        json={"name": "VWRA", "investment_type": "etf", "units": 10, "avg_cost_per_unit": 100, "current_price_per_unit": 120},
        headers=auth_headers,
    )
    assert _account_balance(client, auth_headers, acc["id"]) == 500.0


def test_refresh_investment_updates_price_and_dividend_fields(client, auth_headers, monkeypatch):
    from app.api import investments as investments_api

    monkeypatch.setattr(investments_api.price_feed, "fetch_latest_price", lambda symbol: 10.60)
    monkeypatch.setattr(
        investments_api.price_feed, "fetch_dividend_info",
        lambda symbol, price: {"dividend_yield_pct": 5.94, "last_dividend_amount": 0.33, "last_dividend_date": "2026-03-12"},
    )

    inv = client.post(
        "/api/v1/finance/investments",
        json={"name": "Maybank", "investment_type": "stock", "units": 700, "avg_cost_per_unit": 8.5, "current_price_per_unit": 9.0, "symbol": "1155.KLSE"},
        headers=auth_headers,
    ).json()

    res = client.post(f"/api/v1/finance/investments/{inv['id']}/refresh", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["current_price_per_unit"] == 10.60
    assert body["dividend_yield_pct"] == 5.94
    assert body["last_dividend_amount"] == 0.33
    assert body["last_dividend_date"] == "2026-03-12"
    assert body["price_updated_at"] is not None


def test_refresh_investment_without_symbol_returns_error(client, auth_headers):
    inv = client.post(
        "/api/v1/finance/investments",
        json={"name": "LBS-PA", "investment_type": "stock", "units": 500, "avg_cost_per_unit": 0.8, "current_price_per_unit": 0.885},
        headers=auth_headers,
    ).json()
    res = client.post(f"/api/v1/finance/investments/{inv['id']}/refresh", headers=auth_headers)
    assert res.status_code == 502


def test_refresh_all_reports_per_holding_results_and_skips_bad_symbol(client, auth_headers, monkeypatch):
    from app.api import investments as investments_api

    def fake_price(symbol):
        if symbol == "BAD.KLSE":
            return None
        return 10.60

    monkeypatch.setattr(investments_api.price_feed, "fetch_latest_price", fake_price)
    monkeypatch.setattr(
        investments_api.price_feed, "fetch_dividend_info",
        lambda symbol, price: {"dividend_yield_pct": 5.94, "last_dividend_amount": 0.33, "last_dividend_date": "2026-03-12"},
    )

    client.post(
        "/api/v1/finance/investments",
        json={"name": "Maybank", "investment_type": "stock", "units": 700, "avg_cost_per_unit": 8.5, "current_price_per_unit": 9.0, "symbol": "1155.KLSE"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/finance/investments",
        json={"name": "Unknown Counter", "investment_type": "stock", "units": 100, "avg_cost_per_unit": 1.0, "current_price_per_unit": 1.0, "symbol": "BAD.KLSE"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/finance/investments",
        json={"name": "LBS-PA", "investment_type": "stock", "units": 500, "avg_cost_per_unit": 0.8, "current_price_per_unit": 0.885},
        headers=auth_headers,
    )

    res = client.post("/api/v1/finance/investments/refresh-all", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["refreshed"] == 1
    errors = {r["name"]: r["error"] for r in body["results"]}
    assert errors["Maybank"] is None
    assert errors["Unknown Counter"] is not None
    assert errors["LBS-PA"] == "No symbol set for this holding"
