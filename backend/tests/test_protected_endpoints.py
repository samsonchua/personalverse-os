import pytest

# Every one of these must reject anonymous requests and accept authenticated ones.
PROTECTED_GET_ENDPOINTS = [
    "/api/v1/dashboard/summary",
    "/api/v1/finance/summary",
    "/api/v1/work/summary",
    "/api/v1/knowledge/items",
    "/api/v1/productivity/summary",
    "/api/v1/health/summary",
    "/api/v1/career/summary",
    "/api/v1/second-brain/entries",
    "/api/v1/ai/agents",
    "/api/v1/analytics/life-metrics",
    "/api/v1/self-analysis/summary",
    "/api/v1/workflows",
    "/api/v1/web-reader/articles",
    "/api/v1/skills/summary",
    "/api/v1/calc-sheets",
    "/api/v1/finance-modeling/scenarios",
    "/api/v1/clients/summary",
    "/api/v1/stock-analysis/watchlist",
    "/api/v1/courses",
    "/api/v1/startup-playbooks",
]


@pytest.mark.parametrize("path", PROTECTED_GET_ENDPOINTS)
def test_endpoint_rejects_anonymous_requests(client, path):
    res = client.get(path)
    assert res.status_code == 401, f"{path} should require authentication"


@pytest.mark.parametrize("path", PROTECTED_GET_ENDPOINTS)
def test_endpoint_allows_authenticated_requests(client, auth_headers, path):
    res = client.get(path, headers=auth_headers)
    assert res.status_code == 200, f"{path} failed for an authenticated user: {res.text}"


def test_universal_search_requires_auth(client):
    res = client.get("/api/v1/search/universal", params={"q": "test"})
    assert res.status_code == 401


def test_universal_search_works_when_authenticated(client, auth_headers):
    res = client.get("/api/v1/search/universal", params={"q": "test"}, headers=auth_headers)
    assert res.status_code == 200


def test_habit_log_returns_the_created_log_entry(client, auth_headers):
    habit = client.post(
        "/api/v1/productivity/habits",
        json={"title": "Morning walk", "category": "Health"},
        headers=auth_headers,
    ).json()

    log_res = client.post(
        "/api/v1/productivity/habits/log",
        json={"habit_id": habit["id"], "log_date": "2026-08-08", "status": True},
        headers=auth_headers,
    )
    assert log_res.status_code == 200
    body = log_res.json()
    assert body["habit_id"] == habit["id"]
    assert body["log_date"] == "2026-08-08"
    assert body["status"] is True


def test_finance_transaction_flow_updates_account_balance(client, auth_headers):
    account = client.post(
        "/api/v1/finance/accounts",
        json={"name": "Test Checking", "account_type": "bank", "balance": 100.0},
        headers=auth_headers,
    ).json()
    assert account["balance"] == 100.0

    client.post(
        "/api/v1/finance/transactions",
        json={
            "account_id": account["id"],
            "transaction_type": "expense",
            "amount": 40.0,
            "category": "Groceries",
            "date": "2026-08-08",
        },
        headers=auth_headers,
    )

    summary = client.get("/api/v1/finance/summary", headers=auth_headers).json()
    updated = next(a for a in summary["accounts"] if a["id"] == account["id"])
    assert updated["balance"] == 60.0
