"""Tests for the Mandala Chart life-planning feature: life -> decade -> action, 3 levels deep."""
import uuid


def _register(client):
    email = f"mandala-{uuid.uuid4().hex[:12]}@personalverse.ai"
    res = client.post("/api/v1/auth/register", json={"email": email, "password": "testpass123", "full_name": "Tenant"})
    assert res.status_code == 200, res.text
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_root_board_is_auto_created_with_seeded_decades(client, auth_headers):
    res = client.get("/api/v1/life-planning/root", headers=auth_headers)
    assert res.status_code == 200
    board = res.json()
    assert board["board_type"] == "life"
    assert len(board["cells"]) == 9
    center = next(c for c in board["cells"] if c["position"] == 0)
    assert center["title"] is None  # blank until the user sets their own life vision
    decade_titles = [c["title"] for c in board["cells"] if c["position"] != 0]
    assert decade_titles == ["0–10", "10–20", "20–30", "30–40", "40–50", "50–60", "60–70", "70–80"]

    # Calling again returns the SAME board, not a second one.
    res2 = client.get("/api/v1/life-planning/root", headers=auth_headers)
    assert res2.json()["id"] == board["id"]


def test_update_cell_sets_title_notes_and_completion(client, auth_headers):
    board = client.get("/api/v1/life-planning/root", headers=auth_headers).json()
    center = next(c for c in board["cells"] if c["position"] == 0)

    res = client.put(
        f"/api/v1/life-planning/cells/{center['id']}",
        json={"title": "Live with purpose and freedom", "notes": "Overarching life vision", "is_completed": True},
        headers=auth_headers,
    )
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Live with purpose and freedom"
    assert body["notes"] == "Overarching life vision"
    assert body["is_completed"] is True


def test_expanding_a_decade_cell_creates_a_decade_board(client, auth_headers):
    board = client.get("/api/v1/life-planning/root", headers=auth_headers).json()
    decade_cell = next(c for c in board["cells"] if c["title"] == "30–40")

    res = client.post(f"/api/v1/life-planning/cells/{decade_cell['id']}/expand", headers=auth_headers)
    assert res.status_code == 200
    decade_board = res.json()
    assert decade_board["board_type"] == "decade"
    assert decade_board["parent_cell_id"] == decade_cell["id"]
    assert len(decade_board["cells"]) == 9
    assert decade_board["cells"][0]["title"] == "30–40"  # center mirrors the cell it expanded from

    # Expanding again is idempotent -- same board, not a duplicate.
    res2 = client.post(f"/api/v1/life-planning/cells/{decade_cell['id']}/expand", headers=auth_headers)
    assert res2.json()["id"] == decade_board["id"]

    # The root board's cell now links to it.
    refreshed_root = client.get("/api/v1/life-planning/root", headers=auth_headers).json()
    refreshed_cell = next(c for c in refreshed_root["cells"] if c["id"] == decade_cell["id"])
    assert refreshed_cell["child_board_id"] == decade_board["id"]


def test_expanding_a_subgoal_creates_an_action_board_three_levels_deep(client, auth_headers):
    root = client.get("/api/v1/life-planning/root", headers=auth_headers).json()
    decade_cell = next(c for c in root["cells"] if c["title"] == "40–50")
    decade_board = client.post(f"/api/v1/life-planning/cells/{decade_cell['id']}/expand", headers=auth_headers).json()

    subgoal_cell = next(c for c in decade_board["cells"] if c["position"] == 3)
    client.put(f"/api/v1/life-planning/cells/{subgoal_cell['id']}", json={"title": "Financial independence"}, headers=auth_headers)

    res = client.post(f"/api/v1/life-planning/cells/{subgoal_cell['id']}/expand", headers=auth_headers)
    assert res.status_code == 200
    action_board = res.json()
    assert action_board["board_type"] == "action"
    assert len(action_board["cells"]) == 9

    action_cell = next(c for c in action_board["cells"] if c["position"] == 1)
    client.put(f"/api/v1/life-planning/cells/{action_cell['id']}", json={"title": "Build a 6-month emergency fund", "is_completed": False}, headers=auth_headers)

    # Action boards are the bottom of the structure -- can't expand further.
    res_bottom = client.post(f"/api/v1/life-planning/cells/{action_cell['id']}/expand", headers=auth_headers)
    assert res_bottom.status_code == 400


def test_cannot_expand_center_cell(client, auth_headers):
    root = client.get("/api/v1/life-planning/root", headers=auth_headers).json()
    center = next(c for c in root["cells"] if c["position"] == 0)
    res = client.post(f"/api/v1/life-planning/cells/{center['id']}/expand", headers=auth_headers)
    assert res.status_code == 400


def test_board_and_cells_are_tenant_isolated(client, auth_headers):
    b_headers = _register(client)
    root_a = client.get("/api/v1/life-planning/root", headers=auth_headers).json()
    root_b = client.get("/api/v1/life-planning/root", headers=b_headers).json()
    assert root_a["id"] != root_b["id"]

    # B cannot read or edit A's board/cells by id.
    res_get = client.get(f"/api/v1/life-planning/boards/{root_a['id']}", headers=b_headers)
    assert res_get.status_code == 404
    cell_a = root_a["cells"][0]
    res_put = client.put(f"/api/v1/life-planning/cells/{cell_a['id']}", json={"title": "hijacked"}, headers=b_headers)
    assert res_put.status_code == 404
