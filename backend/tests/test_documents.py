import io


def test_upload_requires_auth(client):
    res = client.post("/api/v1/documents/upload", files={"file": ("note.txt", b"hello", "text/plain")})
    assert res.status_code == 401


def test_list_documents_requires_auth(client):
    res = client.get("/api/v1/documents")
    assert res.status_code == 401


def test_upload_rejects_unsupported_extension(client, auth_headers):
    res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("script.exe", b"binary", "application/octet-stream")},
        headers=auth_headers,
    )
    assert res.status_code == 400


def test_upload_list_download_delete_flow(client, auth_headers):
    content = b"# Notes\nThis is a test markdown document."
    upload_res = client.post(
        "/api/v1/documents/upload",
        files={"file": ("notes.md", io.BytesIO(content), "text/markdown")},
        data={"description": "Test notes", "tags": "test,notes", "entity_type": "project", "entity_id": "p1"},
        headers=auth_headers,
    )
    assert upload_res.status_code == 200, upload_res.text
    doc = upload_res.json()
    assert doc["filename"] == "notes.md"
    assert doc["size_bytes"] == len(content)
    assert doc["entity_type"] == "project"

    list_res = client.get("/api/v1/documents", headers=auth_headers)
    assert list_res.status_code == 200
    assert any(d["id"] == doc["id"] for d in list_res.json())

    filtered_res = client.get(
        "/api/v1/documents", params={"entity_type": "project", "entity_id": "p1"}, headers=auth_headers
    )
    assert any(d["id"] == doc["id"] for d in filtered_res.json())

    download_res = client.get(f"/api/v1/documents/{doc['id']}/download", headers=auth_headers)
    assert download_res.status_code == 200
    assert download_res.content == content

    delete_res = client.delete(f"/api/v1/documents/{doc['id']}", headers=auth_headers)
    assert delete_res.status_code == 200

    list_after_delete = client.get("/api/v1/documents", headers=auth_headers)
    assert not any(d["id"] == doc["id"] for d in list_after_delete.json())
