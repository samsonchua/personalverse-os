def _make_client(client, auth_headers, name="Acme Retail"):
    return client.post(
        "/api/v1/clients",
        json={"name": name, "business_nature": "F&B retailer", "contact_person": "Jamie Lee", "contact_email": "jamie@acme.test"},
        headers=auth_headers,
    ).json()


def test_client_crud(client, auth_headers):
    c = _make_client(client, auth_headers)
    assert c["name"] == "Acme Retail"
    assert c["status"] == "active"

    summary = client.get("/api/v1/clients/summary", headers=auth_headers).json()
    match = next(x for x in summary if x["id"] == c["id"])
    assert match["service_count"] == 0
    assert match["meeting_count"] == 0
    assert match["total_income"] == 0

    upd = client.put(f"/api/v1/clients/{c['id']}", json={"status": "paused", "notes": "On hold this quarter"}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["status"] == "paused"

    detail = client.get(f"/api/v1/clients/{c['id']}", headers=auth_headers).json()
    assert detail["notes"] == "On hold this quarter"
    assert detail["services"] == []
    assert detail["meetings"] == []

    delete = client.delete(f"/api/v1/clients/{c['id']}", headers=auth_headers)
    assert delete.status_code == 200

    summary_after = client.get("/api/v1/clients/summary", headers=auth_headers).json()
    assert not any(x["id"] == c["id"] for x in summary_after)


def test_client_service_crud(client, auth_headers):
    c = _make_client(client, auth_headers)
    service = client.post(
        "/api/v1/clients/services",
        json={"client_id": c["id"], "service_name": "Monthly bookkeeping", "fee_amount": 1500, "fee_frequency": "monthly"},
        headers=auth_headers,
    )
    assert service.status_code == 200
    service_id = service.json()["id"]

    detail = client.get(f"/api/v1/clients/{c['id']}", headers=auth_headers).json()
    assert len(detail["services"]) == 1
    assert detail["services"][0]["service_name"] == "Monthly bookkeeping"

    upd = client.put(f"/api/v1/clients/services/{service_id}", json={"status": "completed"}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["status"] == "completed"

    delete = client.delete(f"/api/v1/clients/services/{service_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_client_service_requires_existing_client(client, auth_headers):
    res = client.post("/api/v1/clients/services", json={"client_id": "missing-id", "service_name": "x"}, headers=auth_headers)
    assert res.status_code == 404


def test_client_meeting_crud(client, auth_headers):
    c = _make_client(client, auth_headers)
    meeting = client.post(
        "/api/v1/clients/meetings",
        json={
            "client_id": c["id"], "title": "Kickoff call", "meeting_date": "2026-08-10",
            "attendees": "Jamie, Samson", "summary": "Discussed scope.",
            "action_items_json": ["Send proposal", "Schedule follow-up"],
        },
        headers=auth_headers,
    )
    assert meeting.status_code == 200
    body = meeting.json()
    assert len(body["action_items_json"]) == 2
    meeting_id = body["id"]

    detail = client.get(f"/api/v1/clients/{c['id']}", headers=auth_headers).json()
    assert len(detail["meetings"]) == 1

    upd = client.put(f"/api/v1/clients/meetings/{meeting_id}", json={"summary": "Updated summary"}, headers=auth_headers)
    assert upd.json()["summary"] == "Updated summary"

    delete = client.delete(f"/api/v1/clients/meetings/{meeting_id}", headers=auth_headers)
    assert delete.status_code == 200


def test_client_income_tracked_via_finance_transactions(client, auth_headers):
    c = _make_client(client, auth_headers)
    account = client.post(
        "/api/v1/finance/accounts", json={"name": "Business Checking", "account_type": "bank", "balance": 0}, headers=auth_headers,
    ).json()

    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": account["id"], "client_id": c["id"], "transaction_type": "income", "amount": 2500, "category": "Consulting", "date": "2026-08-01"},
        headers=auth_headers,
    )
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": account["id"], "client_id": c["id"], "transaction_type": "income", "amount": 500, "category": "Consulting", "date": "2026-08-05"},
        headers=auth_headers,
    )
    # An expense not tied to this client shouldn't count toward its income.
    client.post(
        "/api/v1/finance/transactions",
        json={"account_id": account["id"], "transaction_type": "expense", "amount": 100, "category": "Office", "date": "2026-08-06"},
        headers=auth_headers,
    )

    summary = client.get("/api/v1/clients/summary", headers=auth_headers).json()
    match = next(x for x in summary if x["id"] == c["id"])
    assert match["total_income"] == 3000

    detail = client.get(f"/api/v1/clients/{c['id']}", headers=auth_headers).json()
    assert detail["total_income"] == 3000
    assert len(detail["transactions"]) == 2

    filtered = client.get("/api/v1/finance/transactions", params={"client_id": c["id"]}, headers=auth_headers).json()
    assert filtered["total"] == 2


def test_client_delete_cascades_services_and_meetings(client, auth_headers):
    c = _make_client(client, auth_headers)
    service = client.post("/api/v1/clients/services", json={"client_id": c["id"], "service_name": "Audit"}, headers=auth_headers).json()
    meeting = client.post("/api/v1/clients/meetings", json={"client_id": c["id"], "title": "Review", "meeting_date": "2026-08-01"}, headers=auth_headers).json()

    client.delete(f"/api/v1/clients/{c['id']}", headers=auth_headers)

    assert client.put(f"/api/v1/clients/services/{service['id']}", json={"status": "completed"}, headers=auth_headers).status_code == 404
    assert client.put(f"/api/v1/clients/meetings/{meeting['id']}", json={"summary": "x"}, headers=auth_headers).status_code == 404


def test_clients_require_auth(client):
    assert client.get("/api/v1/clients/summary").status_code == 401
    assert client.get("/api/v1/clients/some-id").status_code == 401
