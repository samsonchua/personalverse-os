import app.api.web_reader as web_reader_api
from app.services.web_reader import UnsafeUrlError


def test_fetch_article_saves_and_lists(client, auth_headers, monkeypatch):
    monkeypatch.setattr(web_reader_api, "fetch_and_extract", lambda url: ("Example Title", "Some article body text. " * 20))
    monkeypatch.setattr(web_reader_api, "summarize", lambda title, text: "A short summary.")

    res = client.post("/api/v1/web-reader/fetch", json={"url": "https://example.com/article"}, headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["title"] == "Example Title"
    assert body["summary"] == "A short summary."
    assert body["word_count"] > 0
    assert body["reading_time_min"] >= 1

    listed = client.get("/api/v1/web-reader/articles", headers=auth_headers).json()
    assert any(a["id"] == body["id"] for a in listed)

    delete = client.delete(f"/api/v1/web-reader/articles/{body['id']}", headers=auth_headers)
    assert delete.status_code == 200


def test_fetch_article_rejects_private_url(client, auth_headers, monkeypatch):
    def _raise(url):
        raise UnsafeUrlError("Refusing to fetch a private/internal address.")

    monkeypatch.setattr(web_reader_api, "fetch_and_extract", _raise)

    res = client.post("/api/v1/web-reader/fetch", json={"url": "http://127.0.0.1/secret"}, headers=auth_headers)
    assert res.status_code == 400


def test_fetch_article_rejects_empty_text(client, auth_headers, monkeypatch):
    monkeypatch.setattr(web_reader_api, "fetch_and_extract", lambda url: ("Empty Page", ""))

    res = client.post("/api/v1/web-reader/fetch", json={"url": "https://example.com/blank"}, headers=auth_headers)
    assert res.status_code == 422


def test_web_reader_requires_auth(client):
    assert client.get("/api/v1/web-reader/articles").status_code == 401
