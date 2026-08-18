def test_health_metric_create_edit_delete_and_history(client, auth_headers):
    created = client.post(
        "/api/v1/health/metrics",
        json={"log_date": "2020-01-05", "weight_kg": 72.5, "sleep_hours": 7.5, "mood": "Calm"},
        headers=auth_headers,
    )
    assert created.status_code == 200
    metric_id = created.json()["id"]
    assert created.json()["weight_kg"] == 72.5

    # Re-posting the same date upserts instead of duplicating.
    upsert = client.post(
        "/api/v1/health/metrics",
        json={"log_date": "2020-01-05", "weight_kg": 73.0},
        headers=auth_headers,
    )
    assert upsert.status_code == 200
    assert upsert.json()["id"] == metric_id
    assert upsert.json()["weight_kg"] == 73.0
    assert upsert.json()["sleep_hours"] == 7.5  # untouched fields preserved

    edited = client.put(f"/api/v1/health/metrics/{metric_id}", json={"weight_kg": 74.2, "steps": 8000}, headers=auth_headers)
    assert edited.status_code == 200
    assert edited.json()["weight_kg"] == 74.2
    assert edited.json()["steps"] == 8000

    summary = client.get("/api/v1/health/summary", headers=auth_headers).json()
    assert any(m["id"] == metric_id for m in summary["metrics_history"])

    delete = client.delete(f"/api/v1/health/metrics/{metric_id}", headers=auth_headers)
    assert delete.status_code == 200

    summary_after = client.get("/api/v1/health/summary", headers=auth_headers).json()
    assert not any(m["id"] == metric_id for m in summary_after["metrics_history"])


def test_health_metric_update_missing_returns_404(client, auth_headers):
    res = client.put("/api/v1/health/metrics/missing-id", json={"weight_kg": 70}, headers=auth_headers)
    assert res.status_code == 404


def test_workout_create_edit_delete(client, auth_headers):
    created = client.post(
        "/api/v1/health/workouts",
        json={"log_date": "2020-01-05", "exercise_name": "Squats", "sets": 4, "reps": 8, "weight_kg": 60},
        headers=auth_headers,
    )
    assert created.status_code == 200
    workout_id = created.json()["id"]

    edited = client.put(f"/api/v1/health/workouts/{workout_id}", json={"sets": 5}, headers=auth_headers)
    assert edited.status_code == 200
    assert edited.json()["sets"] == 5

    delete = client.delete(f"/api/v1/health/workouts/{workout_id}", headers=auth_headers)
    assert delete.status_code == 200

    summary = client.get("/api/v1/health/summary", headers=auth_headers).json()
    assert not any(w["id"] == workout_id for w in summary["workouts_history"])


def test_bulk_import_creates_and_updates(client, auth_headers):
    # Seed one existing row for 2020-02-01 so the bulk import has to update it, not just create.
    client.post("/api/v1/health/metrics", json={"log_date": "2020-02-01", "weight_kg": 80.0}, headers=auth_headers)

    res = client.post(
        "/api/v1/health/metrics/bulk-import",
        json={"rows": [
            {"log_date": "2020-02-01", "weight_kg": 79.0, "steps": 9000, "source": "mi_health_import"},
            {"log_date": "2020-02-02", "weight_kg": 78.8, "steps": 9500, "source": "mi_health_import"},
        ]},
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["created"] == 1
    assert body["updated"] == 1
    assert body["total"] == 2

    summary = client.get("/api/v1/health/summary", headers=auth_headers).json()
    feb1 = next(m for m in summary["metrics_history"] if m["log_date"] == "2020-02-01")
    assert feb1["weight_kg"] == 79.0
    assert feb1["steps"] == 9000
    feb2 = next(m for m in summary["metrics_history"] if m["log_date"] == "2020-02-02")
    assert feb2["source"] == "mi_health_import"


def test_health_requires_auth(client):
    assert client.get("/api/v1/health/summary").status_code == 401
