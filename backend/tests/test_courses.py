def test_generate_course_creates_full_structure(client, auth_headers):
    res = client.post("/api/v1/courses/generate", json={"industry": "Aviation"}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["industry"] == "Aviation"
    assert body["source"] in ("ai_generated", "synthetic")

    listed = client.get("/api/v1/courses", headers=auth_headers).json()
    match = next(c for c in listed if c["id"] == body["id"])
    assert match["progress_pct"] == 0

    detail = client.get(f"/api/v1/courses/{body['id']}", headers=auth_headers).json()
    assert len(detail["modules"]) >= 1
    first_lesson = detail["modules"][0]["lessons"][0]
    assert first_lesson["content"]
    assert not first_lesson["is_completed"]


def test_get_course_detail_missing_returns_404(client, auth_headers):
    res = client.get("/api/v1/courses/missing-id", headers=auth_headers)
    assert res.status_code == 404


def test_complete_lesson_updates_progress(client, auth_headers):
    course = client.post("/api/v1/courses/generate", json={"industry": "Logistics"}, headers=auth_headers).json()
    detail = client.get(f"/api/v1/courses/{course['id']}", headers=auth_headers).json()
    lesson_id = detail["modules"][0]["lessons"][0]["id"]

    completed = client.post(f"/api/v1/courses/lessons/{lesson_id}/complete", headers=auth_headers)
    assert completed.status_code == 200
    assert completed.json()["is_completed"] is True

    refreshed = client.get(f"/api/v1/courses/{course['id']}", headers=auth_headers).json()
    assert refreshed["progress_pct"] > 0
    lesson = next(l for m in refreshed["modules"] for l in m["lessons"] if l["id"] == lesson_id)
    assert lesson["is_completed"] is True


def test_quiz_attempt_scores_and_completes_on_pass(client, auth_headers):
    course = client.post("/api/v1/courses/generate", json={"industry": "Renewable Energy"}, headers=auth_headers).json()
    detail = client.get(f"/api/v1/courses/{course['id']}", headers=auth_headers).json()
    lesson = detail["modules"][0]["lessons"][0]
    quiz = lesson["quiz"]
    assert len(quiz) >= 1

    # Submit all-zero answers first to get the actual correct answers via feedback, deterministically
    # by instead fetching correct answers isn't exposed pre-attempt — attempt with a guess and read results.
    guess = [0] * len(quiz)
    attempt = client.post(f"/api/v1/courses/lessons/{lesson['id']}/quiz-attempt", json={"answers": guess}, headers=auth_headers)
    assert attempt.status_code == 200
    body = attempt.json()
    assert body["total"] == len(quiz)
    assert 0 <= body["score_pct"] <= 100

    # Now answer using the correct_index revealed in the results to guarantee a perfect score.
    correct_answers = [r["correct_index"] for r in body["results"]]
    perfect = client.post(f"/api/v1/courses/lessons/{lesson['id']}/quiz-attempt", json={"answers": correct_answers}, headers=auth_headers)
    perfect_body = perfect.json()
    assert perfect_body["score_pct"] == 100.0
    assert perfect_body["lesson_completed"] is True


def test_quiz_attempt_on_missing_lesson_returns_404(client, auth_headers):
    res = client.post("/api/v1/courses/lessons/missing-lesson/quiz-attempt", json={"answers": [0]}, headers=auth_headers)
    assert res.status_code == 404


def test_delete_course_cascades(client, auth_headers):
    course = client.post("/api/v1/courses/generate", json={"industry": "Mining"}, headers=auth_headers).json()
    delete = client.delete(f"/api/v1/courses/{course['id']}", headers=auth_headers)
    assert delete.status_code == 200

    listed = client.get("/api/v1/courses", headers=auth_headers).json()
    assert not any(c["id"] == course["id"] for c in listed)

    detail = client.get(f"/api/v1/courses/{course['id']}", headers=auth_headers)
    assert detail.status_code == 404


def test_courses_require_auth(client):
    assert client.get("/api/v1/courses").status_code == 401
    assert client.post("/api/v1/courses/generate", json={"industry": "X"}).status_code == 401
