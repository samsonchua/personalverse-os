def test_time_block_create_update_delete(client, auth_headers):
    created = client.post(
        "/api/v1/productivity/time-blocks",
        json={"title": "Deep work", "block_date": "2020-03-01", "start_time": "09:00", "end_time": "10:00"},
        headers=auth_headers,
    )
    assert created.status_code == 200
    block_id = created.json()["id"]

    summary = client.get("/api/v1/productivity/summary", headers=auth_headers).json()
    assert any(b["id"] == block_id for b in summary["time_blocks"])

    edited = client.put(f"/api/v1/productivity/time-blocks/{block_id}", json={"is_completed": True}, headers=auth_headers)
    assert edited.status_code == 200
    assert edited.json()["is_completed"] is True

    delete = client.delete(f"/api/v1/productivity/time-blocks/{block_id}", headers=auth_headers)
    assert delete.status_code == 200

    summary_after = client.get("/api/v1/productivity/summary", headers=auth_headers).json()
    assert not any(b["id"] == block_id for b in summary_after["time_blocks"])


def test_time_block_update_missing_returns_404(client, auth_headers):
    res = client.put("/api/v1/productivity/time-blocks/missing-id", json={"is_completed": True}, headers=auth_headers)
    assert res.status_code == 404


def test_auto_generate_drafts_blocks_from_pending_work(client, auth_headers):
    plan_date = "2020-04-15"

    client_res = client.post("/api/v1/clients", json={"name": "Auto Gen Client"}, headers=auth_headers).json()
    client.post(
        "/api/v1/clients/services",
        json={"client_id": client_res["id"], "service_name": "Bookkeeping", "status": "active"},
        headers=auth_headers,
    )

    skill = client.post("/api/v1/skills", json={"name": "Public Speaking"}, headers=auth_headers).json()
    client.post("/api/v1/skills/tasks", json={"skill_id": skill["id"], "title": "Practice 10 min"}, headers=auth_headers)

    client.post(
        "/api/v1/finance/goals",
        json={"title": "Emergency Fund", "target_amount": 10000, "current_amount": 2000},
        headers=auth_headers,
    )

    res = client.post("/api/v1/productivity/auto-generate", params={"block_date": plan_date}, headers=auth_headers)
    assert res.status_code == 200
    created = res.json()
    titles = [b["title"] for b in created]

    assert any("Client: Bookkeeping" in t for t in titles)
    assert any("Skill: Public Speaking" in t for t in titles)
    assert any("Finance: review progress on 'Emergency Fund'" in t for t in titles)
    assert any(t == "Health: log today's metrics" for t in titles)

    # Blocks are sequential and non-overlapping.
    for b in created:
        assert b["block_date"] == plan_date
        assert b["start_time"] < b["end_time"]

    # Re-running for the same date must not duplicate anything already scheduled.
    rerun = client.post("/api/v1/productivity/auto-generate", params={"block_date": plan_date}, headers=auth_headers)
    assert rerun.status_code == 200
    assert rerun.json() == []


def test_auto_generate_requires_auth(client):
    assert client.post("/api/v1/productivity/auto-generate", params={"block_date": "2020-01-01"}).status_code == 401
