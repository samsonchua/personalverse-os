"""
Confirms the multi-tenant retrofit actually isolates data between accounts: user A's rows must
never be visible, editable, or deletable by user B, across a representative cross-section of
modules (not exhaustive of every one of the ~30 routers — that's what the uniform per-file
pattern applied elsewhere is for; this spot-checks that the pattern actually took effect).
"""
import uuid


def _register(client):
    email = f"tenant-{uuid.uuid4().hex[:12]}@personalverse.ai"
    res = client.post("/api/v1/auth/register", json={"email": email, "password": "testpass123", "full_name": "Tenant"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_finance_accounts_and_transactions_are_isolated(client):
    a_headers = _register(client)
    b_headers = _register(client)

    account = client.post(
        "/api/v1/finance/accounts",
        json={"name": "A's Secret Account", "account_type": "bank", "balance": 500.0},
        headers=a_headers,
    ).json()

    # B's summary must not show A's account
    b_summary = client.get("/api/v1/finance/summary", headers=b_headers).json()
    assert all(acc["id"] != account["id"] for acc in b_summary["accounts"])

    # B can't fetch/edit/delete A's account by guessing its id
    upd = client.put(f"/api/v1/finance/accounts/{account['id']}", json={"name": "Hijacked"}, headers=b_headers)
    assert upd.status_code == 404
    delete = client.delete(f"/api/v1/finance/accounts/{account['id']}", headers=b_headers)
    assert delete.status_code == 404

    # A still sees their own account, untouched
    a_summary = client.get("/api/v1/finance/summary", headers=a_headers).json()
    assert any(acc["id"] == account["id"] and acc["name"] == "A's Secret Account" for acc in a_summary["accounts"])


def test_health_metrics_are_isolated(client):
    a_headers = _register(client)
    b_headers = _register(client)

    client.post(
        "/api/v1/health/metrics",
        json={"log_date": "2026-08-11", "weight_kg": 70.0, "mood": "Calm"},
        headers=a_headers,
    )

    b_summary = client.get("/api/v1/health/summary", headers=b_headers).json()
    assert not any(m["log_date"] == "2026-08-11" for m in b_summary["metrics_history"])

    a_summary = client.get("/api/v1/health/summary", headers=a_headers).json()
    assert any(m["log_date"] == "2026-08-11" for m in a_summary["metrics_history"])


def test_clients_are_isolated(client):
    a_headers = _register(client)
    b_headers = _register(client)

    created = client.post("/api/v1/clients", json={"name": "A's Client Co."}, headers=a_headers).json()

    b_list = client.get("/api/v1/clients/summary", headers=b_headers).json()
    assert all(c["id"] != created["id"] for c in b_list)

    b_get = client.get(f"/api/v1/clients/{created['id']}", headers=b_headers)
    assert b_get.status_code == 404


def test_department_child_lists_are_isolated_even_without_department_id_filter(client):
    a_headers = _register(client)
    b_headers = _register(client)

    dept = client.post("/api/v1/department/departments", json={"name": "A's Department"}, headers=a_headers).json()
    client.post(
        "/api/v1/department/job-roles",
        json={"department_id": dept["id"], "title": "A's Secret Role"},
        headers=a_headers,
    )

    # B's unfiltered (no department_id) job-role list must not include A's role
    b_roles = client.get("/api/v1/department/job-roles", headers=b_headers).json()
    assert not any(r["title"] == "A's Secret Role" for r in b_roles)


def test_courses_lesson_and_quiz_endpoints_reject_cross_tenant_access(client):
    a_headers = _register(client)
    b_headers = _register(client)

    course = client.post("/api/v1/courses/generate", json={"industry": "Tenant Isolation Testing"}, headers=a_headers).json()
    detail = client.get(f"/api/v1/courses/{course['id']}", headers=a_headers).json()
    lesson_id = detail["modules"][0]["lessons"][0]["id"]

    # B can't see the course at all
    b_get = client.get(f"/api/v1/courses/{course['id']}", headers=b_headers)
    assert b_get.status_code == 404

    # B can't complete or quiz-attempt A's lesson by id, even without going through the course
    b_complete = client.post(f"/api/v1/courses/lessons/{lesson_id}/complete", headers=b_headers)
    assert b_complete.status_code == 404
    b_quiz = client.post(f"/api/v1/courses/lessons/{lesson_id}/quiz-attempt", json={"answers": [0]}, headers=b_headers)
    assert b_quiz.status_code == 404


def test_universal_search_is_isolated(client):
    a_headers = _register(client)
    b_headers = _register(client)

    client.post(
        "/api/v1/knowledge/items",
        json={"title": "TenantIsolationUniqueSearchTerm", "item_type": "article"},
        headers=a_headers,
    )

    b_results = client.get("/api/v1/search/universal", params={"q": "TenantIsolationUniqueSearchTerm"}, headers=b_headers).json()
    assert b_results == []

    a_results = client.get("/api/v1/search/universal", params={"q": "TenantIsolationUniqueSearchTerm"}, headers=a_headers).json()
    assert any(r["title"] == "TenantIsolationUniqueSearchTerm" for r in a_results)
