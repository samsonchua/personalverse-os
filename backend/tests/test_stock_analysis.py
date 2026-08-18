import app.services.stock_data as stock_data
from app.services.stock_analysis import (
    compute_technical, score_fundamentals, score_sentiment, generate_recommendation, score_label,
)


def _synthetic_uptrend(n=260, start=100.0, step=0.3):
    closes = [start + i * step for i in range(n)]
    highs = [c + 1 for c in closes]
    lows = [c - 1 for c in closes]
    return closes, highs, lows


# PURE COMPUTATION (no network)

def test_score_label_buckets():
    assert score_label(80) == "Strong Buy"
    assert score_label(30) == "Buy"
    assert score_label(0) == "Neutral"
    assert score_label(-30) == "Sell"
    assert score_label(-80) == "Strong Sell"


def test_compute_technical_on_uptrend_is_bullish():
    closes, highs, lows = _synthetic_uptrend()
    tech = compute_technical(closes, highs, lows)
    assert tech["score"] > 0
    assert tech["sma20"] is not None and tech["sma50"] is not None and tech["sma200"] is not None
    assert tech["support"] < closes[-1] < tech["resistance"] or tech["resistance"] >= closes[-1]
    assert "uptrend" in " ".join(tech["signals"]).lower()


def test_compute_technical_on_downtrend_is_bearish():
    closes, highs, lows = _synthetic_uptrend(step=-0.3, start=300.0)
    tech = compute_technical(closes, highs, lows)
    assert tech["score"] < 0


def test_compute_technical_handles_short_history_gracefully():
    closes, highs, lows = _synthetic_uptrend(n=10)
    tech = compute_technical(closes, highs, lows)
    assert tech["sma20"] is None
    assert tech["sma50"] is None
    assert tech["rsi14"] is None
    assert tech["macd"] is None
    assert tech["label"] in {"Strong Buy", "Buy", "Neutral", "Sell", "Strong Sell"}


def test_score_fundamentals_none_when_no_data():
    assert score_fundamentals(None) is None


def test_score_fundamentals_rewards_cheap_profitable_growing_stock():
    good = score_fundamentals({
        "trailing_pe": 10, "profit_margin": 0.25, "revenue_growth": 0.20,
        "debt_to_equity": 20, "return_on_equity": 0.20,
    })
    bad = score_fundamentals({
        "trailing_pe": 60, "profit_margin": -0.05, "revenue_growth": -0.10,
        "debt_to_equity": 300, "return_on_equity": -0.05,
    })
    assert good["score"] > bad["score"]
    assert good["label"] in {"Buy", "Strong Buy"}
    assert bad["label"] in {"Sell", "Strong Sell"}


def test_score_sentiment_keyword_fallback_with_no_ai_provider():
    headlines = [
        {"title": "Company beats earnings, stock surges on record profit"},
        {"title": "Analysts upgrade stock after strong growth"},
        {"title": "Minor lawsuit filed against company"},
    ]
    result = score_sentiment(headlines)
    assert result["source"] == "keyword"
    assert result["score"] > 0


def test_score_sentiment_empty_headlines_is_neutral():
    result = score_sentiment([])
    assert result["score"] == 0
    assert result["label"] == "Neutral"


def test_generate_recommendation_blends_all_three_scores():
    tech = {"score": 40, "support": 90.0, "resistance": 110.0}
    fund = {"score": 20}
    sent = {"score": 10}
    rec = generate_recommendation(tech, fund, sent)
    expected = round(0.40 * 40 + 0.35 * 20 + 0.25 * 10, 1)
    assert rec["composite_score"] == expected
    assert rec["suggested_buy_zone"][0] == 90.0
    assert rec["suggested_sell_zone"][1] == 110.0
    assert rec["suggested_stop_loss"] < 90.0
    assert "not financial advice" in rec["disclaimer"]


def test_generate_recommendation_reweights_without_fundamentals():
    tech = {"score": 50, "support": 90.0, "resistance": 110.0}
    sent = {"score": -10}
    rec = generate_recommendation(tech, None, sent)
    expected = round(0.60 * 50 + 0.40 * -10, 1)
    assert rec["composite_score"] == expected


# ROUTER (network calls mocked)

def test_analyze_endpoint_combines_all_sources(client, auth_headers, monkeypatch):
    closes, highs, lows = _synthetic_uptrend(n=260)
    candles = [{"date": 1700000000 + i * 86400, "open": c, "high": h, "low": l, "close": c, "volume": 1000} for i, (c, h, l) in enumerate(zip(closes, highs, lows))]

    monkeypatch.setattr(stock_data, "fetch_price_history", lambda symbol, range_="6mo", interval="1d": {
        "symbol": symbol, "currency": "USD", "exchange": "NASDAQ", "current_price": closes[-1],
        "fifty_two_week_high": max(highs), "fifty_two_week_low": min(lows), "candles": candles,
    })
    monkeypatch.setattr(stock_data, "fetch_fundamentals", lambda symbol: {
        "company_name": "Test Corp", "sector": "Technology", "industry": "Software",
        "trailing_pe": 18, "profit_margin": 0.22, "revenue_growth": 0.12, "debt_to_equity": 40, "return_on_equity": 0.18,
    })
    monkeypatch.setattr(stock_data, "fetch_news_headlines", lambda query, limit=10: [
        {"title": "Test Corp beats earnings, stock surges", "link": "https://example.com/1", "pub_date": "", "source": "Test News"},
    ])

    res = client.get("/api/v1/stock-analysis/TEST", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["symbol"] == "TEST"
    assert len(body["candles"]) == len(candles)
    assert body["technical"]["score"] > 0
    assert body["fundamentals"]["company_name"] == "Test Corp"
    assert body["recommendation"]["label"] in {"Buy", "Strong Buy", "Neutral", "Sell", "Strong Sell"}
    assert "disclaimer" in body["recommendation"]


def test_analyze_endpoint_502s_when_price_data_unavailable(client, auth_headers, monkeypatch):
    monkeypatch.setattr(stock_data, "fetch_price_history", lambda symbol, range_="6mo", interval="1d": None)
    res = client.get("/api/v1/stock-analysis/NOTREAL", headers=auth_headers)
    assert res.status_code == 502


def test_analyze_endpoint_degrades_gracefully_without_fundamentals(client, auth_headers, monkeypatch):
    closes, highs, lows = _synthetic_uptrend(n=30)
    candles = [{"date": 1700000000 + i * 86400, "open": c, "high": h, "low": l, "close": c, "volume": 1000} for i, (c, h, l) in enumerate(zip(closes, highs, lows))]
    monkeypatch.setattr(stock_data, "fetch_price_history", lambda symbol, range_="6mo", interval="1d": {
        "symbol": symbol, "currency": "USD", "exchange": "NASDAQ", "current_price": closes[-1],
        "fifty_two_week_high": max(highs), "fifty_two_week_low": min(lows), "candles": candles,
    })
    monkeypatch.setattr(stock_data, "fetch_fundamentals", lambda symbol: None)
    monkeypatch.setattr(stock_data, "fetch_news_headlines", lambda query, limit=10: [])

    res = client.get("/api/v1/stock-analysis/TEST2", headers=auth_headers)
    assert res.status_code == 200
    body = res.json()
    assert body["fundamentals"] is None
    assert body["fundamental_score"] is None
    assert body["recommendation"]["label"] in {"Buy", "Strong Buy", "Neutral", "Sell", "Strong Sell"}


def test_search_endpoint_passes_through(client, auth_headers, monkeypatch):
    monkeypatch.setattr(stock_data, "search_symbol", lambda q, limit=8: [{"symbol": "AAPL", "name": "Apple Inc.", "exchange": "NASDAQ", "type": "Equity"}])
    res = client.get("/api/v1/stock-analysis/search", params={"q": "Apple"}, headers=auth_headers)
    assert res.status_code == 200
    assert res.json()[0]["symbol"] == "AAPL"


# WATCHLIST

def test_watchlist_crud(client, auth_headers):
    added = client.post("/api/v1/stock-analysis/watchlist", json={"symbol": "AAPL", "label": "Apple Inc."}, headers=auth_headers)
    assert added.status_code == 200
    item_id = added.json()["id"]

    listed = client.get("/api/v1/stock-analysis/watchlist", headers=auth_headers).json()
    assert any(w["id"] == item_id for w in listed)

    delete = client.delete(f"/api/v1/stock-analysis/watchlist/{item_id}", headers=auth_headers)
    assert delete.status_code == 200

    listed_after = client.get("/api/v1/stock-analysis/watchlist", headers=auth_headers).json()
    assert not any(w["id"] == item_id for w in listed_after)


def test_stock_analysis_requires_auth(client):
    assert client.get("/api/v1/stock-analysis/watchlist").status_code == 401
    assert client.get("/api/v1/stock-analysis/search", params={"q": "AAPL"}).status_code == 401
