def test_skill_and_micro_task_flow(client, auth_headers):
    skill = client.post(
        "/api/v1/skills",
        json={"name": "Public Speaking", "category": "Communication", "current_level": 3, "target_level": 8},
        headers=auth_headers,
    )
    assert skill.status_code == 200
    skill_id = skill.json()["id"]

    task1 = client.post("/api/v1/skills/tasks", json={"skill_id": skill_id, "title": "Practice 10 min"}, headers=auth_headers)
    assert task1.status_code == 200
    task_id = task1.json()["id"]
    client.post("/api/v1/skills/tasks", json={"skill_id": skill_id, "title": "Record a video"}, headers=auth_headers)

    summary = client.get("/api/v1/skills/summary", headers=auth_headers).json()
    match = next(s for s in summary if s["id"] == skill_id)
    assert len(match["tasks"]) == 2
    assert match["task_progress_pct"] == 0

    complete = client.put(f"/api/v1/skills/tasks/{task_id}", json={"is_completed": True}, headers=auth_headers)
    assert complete.status_code == 200
    assert complete.json()["is_completed"] is True

    summary_after = client.get("/api/v1/skills/summary", headers=auth_headers).json()
    match_after = next(s for s in summary_after if s["id"] == skill_id)
    assert match_after["task_progress_pct"] == 50

    delete_task = client.delete(f"/api/v1/skills/tasks/{task_id}", headers=auth_headers)
    assert delete_task.status_code == 200

    delete_skill = client.delete(f"/api/v1/skills/{skill_id}", headers=auth_headers)
    assert delete_skill.status_code == 200


def test_schedule_task_creates_time_block(client, auth_headers):
    skill = client.post("/api/v1/skills", json={"name": "Guitar"}, headers=auth_headers).json()
    task = client.post("/api/v1/skills/tasks", json={"skill_id": skill["id"], "title": "Scales practice"}, headers=auth_headers).json()

    res = client.post(
        f"/api/v1/skills/tasks/{task['id']}/schedule",
        json={"block_date": "2026-08-10", "start_time": "19:00", "end_time": "19:30"},
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["task"]["scheduled_date"] == "2026-08-10"
    assert "Guitar" in body["time_block"]["title"]

    blocks = client.get("/api/v1/productivity/summary", headers=auth_headers).json()
    assert any(b["block_date"] == "2026-08-10" for b in blocks["time_blocks"])


def test_skills_require_auth(client):
    assert client.get("/api/v1/skills/summary").status_code == 401
