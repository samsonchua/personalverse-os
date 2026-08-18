def test_generate_playbook_creates_entry(client, auth_headers):
    res = client.post("/api/v1/startup-playbooks/generate", json={"name": "Airbnb"}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["name"] == "Airbnb"
    assert body["source"] in ("ai_generated", "manual")

    listed = client.get("/api/v1/startup-playbooks", headers=auth_headers).json()
    assert any(p["id"] == body["id"] for p in listed)


def test_manual_playbook_crud(client, auth_headers):
    created = client.post(
        "/api/v1/startup-playbooks",
        json={
            "name": "Local Coffee Roastery", "industry": "F&B", "initial_cost_estimate": 50000,
            "business_plan_summary": "Direct-trade beans, subscription model.", "tags": "coffee, subscription, local",
        },
        headers=auth_headers,
    )
    assert created.status_code == 200
    body = created.json()
    assert body["source"] == "manual"
    playbook_id = body["id"]

    upd = client.put(f"/api/v1/startup-playbooks/{playbook_id}", json={"roi_notes": "Break-even projected at 18 months."}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["roi_notes"] == "Break-even projected at 18 months."

    delete = client.delete(f"/api/v1/startup-playbooks/{playbook_id}", headers=auth_headers)
    assert delete.status_code == 200

    listed_after = client.get("/api/v1/startup-playbooks", headers=auth_headers).json()
    assert not any(p["id"] == playbook_id for p in listed_after)


def test_update_missing_playbook_returns_404(client, auth_headers):
    res = client.put("/api/v1/startup-playbooks/missing-id", json={"name": "x"}, headers=auth_headers)
    assert res.status_code == 404


def test_startup_playbooks_require_auth(client):
    assert client.get("/api/v1/startup-playbooks").status_code == 401
    assert client.post("/api/v1/startup-playbooks/generate", json={"name": "X"}).status_code == 401
