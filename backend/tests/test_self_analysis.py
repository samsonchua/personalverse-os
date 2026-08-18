def test_self_analysis_category_and_criterion_flow(client, auth_headers):
    cat = client.post(
        "/api/v1/self-analysis/categories",
        json={"name": "Founder Mindset", "description": "Core traits", "color": "#3987e5"},
        headers=auth_headers,
    )
    assert cat.status_code == 200
    cat_id = cat.json()["id"]

    crit1 = client.post(
        "/api/v1/self-analysis/criteria",
        json={"category_id": cat_id, "name": "Discipline", "rating": 4.0},
        headers=auth_headers,
    )
    assert crit1.status_code == 200
    crit_id = crit1.json()["id"]

    client.post(
        "/api/v1/self-analysis/criteria",
        json={"category_id": cat_id, "name": "Focus", "rating": 2.0},
        headers=auth_headers,
    )

    summary = client.get("/api/v1/self-analysis/summary", headers=auth_headers).json()
    match = next(c for c in summary if c["id"] == cat_id)
    assert len(match["criteria"]) == 2
    assert match["average_rating"] == 3.0

    upd = client.put(f"/api/v1/self-analysis/criteria/{crit_id}", json={"rating": 5.0}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["rating"] == 5.0

    delete_crit = client.delete(f"/api/v1/self-analysis/criteria/{crit_id}", headers=auth_headers)
    assert delete_crit.status_code == 200

    delete_cat = client.delete(f"/api/v1/self-analysis/categories/{cat_id}", headers=auth_headers)
    assert delete_cat.status_code == 200

    summary_after = client.get("/api/v1/self-analysis/summary", headers=auth_headers).json()
    assert not any(c["id"] == cat_id for c in summary_after)


def test_self_analysis_criterion_requires_existing_category(client, auth_headers):
    res = client.post(
        "/api/v1/self-analysis/criteria",
        json={"category_id": "missing-id", "name": "Discipline"},
        headers=auth_headers,
    )
    assert res.status_code == 404


def test_self_analysis_endpoints_require_auth(client):
    assert client.get("/api/v1/self-analysis/summary").status_code == 401
