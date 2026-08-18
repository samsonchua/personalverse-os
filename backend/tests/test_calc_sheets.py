def test_calc_sheet_crud(client, auth_headers):
    grid = [["10", "20"], ["=A1+B1", ""]]
    sheet = client.post("/api/v1/calc-sheets", json={"title": "Budget Sheet", "grid_json": grid}, headers=auth_headers)
    assert sheet.status_code == 200
    sheet_id = sheet.json()["id"]
    assert sheet.json()["grid_json"] == grid

    listed = client.get("/api/v1/calc-sheets", headers=auth_headers).json()
    assert any(s["id"] == sheet_id for s in listed)

    new_grid = [["5", "5"], ["=A1+B1", ""]]
    upd = client.put(f"/api/v1/calc-sheets/{sheet_id}", json={"grid_json": new_grid}, headers=auth_headers)
    assert upd.status_code == 200
    assert upd.json()["grid_json"] == new_grid

    delete = client.delete(f"/api/v1/calc-sheets/{sheet_id}", headers=auth_headers)
    assert delete.status_code == 200

    listed_after = client.get("/api/v1/calc-sheets", headers=auth_headers).json()
    assert not any(s["id"] == sheet_id for s in listed_after)


def test_calc_sheet_update_missing_returns_404(client, auth_headers):
    res = client.put("/api/v1/calc-sheets/missing-id", json={"title": "x"}, headers=auth_headers)
    assert res.status_code == 404


def test_calc_sheets_require_auth(client):
    assert client.get("/api/v1/calc-sheets").status_code == 401
