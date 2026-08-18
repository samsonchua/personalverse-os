def test_workflow_crud(client, auth_headers):
    wf = client.post(
        "/api/v1/workflows",
        json={"title": "Onboarding Flow", "mermaid_source": "flowchart TD\n  A --> B"},
        headers=auth_headers,
    )
    assert wf.status_code == 200
    wf_id = wf.json()["id"]
    assert wf.json()["diagram_type"] == "flowchart"

    listed = client.get("/api/v1/workflows", headers=auth_headers).json()
    assert any(w["id"] == wf_id for w in listed)

    upd = client.put(f"/api/v1/workflows/{wf_id}", json={"mermaid_source": "flowchart TD\n  A --> C"}, headers=auth_headers)
    assert upd.status_code == 200
    assert "A --> C" in upd.json()["mermaid_source"]

    delete = client.delete(f"/api/v1/workflows/{wf_id}", headers=auth_headers)
    assert delete.status_code == 200

    listed_after = client.get("/api/v1/workflows", headers=auth_headers).json()
    assert not any(w["id"] == wf_id for w in listed_after)


def test_workflow_entity_scoping_filters_list(client, auth_headers):
    general = client.post(
        "/api/v1/workflows", json={"title": "General Plan", "mermaid_source": "flowchart TD\n  A --> B"}, headers=auth_headers,
    ).json()
    scoped = client.post(
        "/api/v1/workflows",
        json={"title": "Client Plan", "mermaid_source": "flowchart TD\n  A --> B", "entity_type": "client", "entity_id": "client-123"},
        headers=auth_headers,
    ).json()
    assert scoped["entity_type"] == "client"
    assert scoped["entity_id"] == "client-123"

    all_workflows = client.get("/api/v1/workflows", headers=auth_headers).json()
    assert any(w["id"] == general["id"] for w in all_workflows)
    assert any(w["id"] == scoped["id"] for w in all_workflows)

    scoped_only = client.get("/api/v1/workflows", params={"entity_type": "client", "entity_id": "client-123"}, headers=auth_headers).json()
    assert len(scoped_only) == 1
    assert scoped_only[0]["id"] == scoped["id"]

    other_client_scope = client.get("/api/v1/workflows", params={"entity_type": "client", "entity_id": "someone-else"}, headers=auth_headers).json()
    assert other_client_scope == []


def test_workflow_update_missing_returns_404(client, auth_headers):
    res = client.put("/api/v1/workflows/missing-id", json={"title": "x"}, headers=auth_headers)
    assert res.status_code == 404


def test_workflows_require_auth(client):
    assert client.get("/api/v1/workflows").status_code == 401
