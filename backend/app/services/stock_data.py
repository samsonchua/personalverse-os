"""Fetches public, unauthenticated market data from Yahoo Finance's chart/search endpoints and
news headlines from Google News RSS. No API key required, but Yahoo's fundamentals endpoint
(quoteSummary) needs a short-lived "crumb" token paired with a cookie — both undocumented and
liable to change; every network call degrades gracefully (returns None/[] on failure) rather
than raising, since this feeds a best-effort research tool, not a system of record."""

import json
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from http.cookiejar import CookieJar
from urllib.parse import quote

_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

_cookie_jar = CookieJar()
_opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(_cookie_jar))
_crumb_cache: dict[str, str] = {}


def _get(url: str, timeout: int = 12) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": _USER_AGENT})
    with _opener.open(req, timeout=timeout) as resp:
        return resp.read()


def _get_crumb() -> str | None:
    if "crumb" in _crumb_cache:
        return _crumb_cache["crumb"]
    try:
        try:
            _get("https://fc.yahoo.com")  # 404s, but its Set-Cookie is what getcrumb requires
        except urllib.error.HTTPError:
            pass
        crumb = _get("https://query2.finance.yahoo.com/v1/test/getcrumb").decode("utf-8").strip()
        if crumb and "Unauthorized" not in crumb:
            _crumb_cache["crumb"] = crumb
            return crumb
    except (urllib.error.URLError, TimeoutError, OSError):
        pass
    return None


def fetch_price_history(symbol: str, range_: str = "6mo", interval: str = "1d") -> dict | None:
    """Returns {currency, exchange, current_price, fifty_two_week_high/low, candles: [{date, open, high, low, close, volume}]}."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{quote(symbol)}?range={range_}&interval={interval}"
    try:
        raw = _get(url)
    except (urllib.error.URLError, TimeoutError, OSError):
        return None

    try:
        data = json.loads(raw)
        result = data["chart"]["result"][0]
    except (KeyError, IndexError, json.JSONDecodeError, TypeError):
        return None

    meta = result.get("meta", {})
    timestamps = result.get("timestamp", [])
    quote_data = result.get("indicators", {}).get("quote", [{}])[0]
    opens, highs, lows, closes, volumes = (
        quote_data.get("open", []), quote_data.get("high", []),
        quote_data.get("low", []), quote_data.get("close", []), quote_data.get("volume", []),
    )

    candles = []
    for i, ts in enumerate(timestamps):
        if i >= len(closes) or closes[i] is None:
            continue
        candles.append({
            "date": ts,
            "open": opens[i] if i < len(opens) else None,
            "high": highs[i] if i < len(highs) else None,
            "low": lows[i] if i < len(lows) else None,
            "close": closes[i],
            "volume": volumes[i] if i < len(volumes) else None,
        })

    if not candles:
        return None

    return {
        "symbol": meta.get("symbol", symbol),
        "currency": meta.get("currency"),
        "exchange": meta.get("fullExchangeName"),
        "current_price": meta.get("regularMarketPrice"),
        "fifty_two_week_high": meta.get("fiftyTwoWeekHigh"),
        "fifty_two_week_low": meta.get("fiftyTwoWeekLow"),
        "candles": candles,
    }


def fetch_fundamentals(symbol: str) -> dict | None:
    crumb = _get_crumb()
    if not crumb:
        return None
    modules = "defaultKeyStatistics,financialData,summaryDetail,price,assetProfile"
    url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{quote(symbol)}?modules={modules}&crumb={quote(crumb)}"
    try:
        raw = _get(url)
    except (urllib.error.URLError, TimeoutError, OSError):
        return None

    try:
        data = json.loads(raw)
        result = data["quoteSummary"]["result"][0]
    except (KeyError, IndexError, json.JSONDecodeError, TypeError):
        return None

    def raw_val(module: str, field: str):
        return result.get(module, {}).get(field, {}).get("raw")

    return {
        "company_name": result.get("price", {}).get("longName") or result.get("price", {}).get("shortName"),
        "sector": result.get("assetProfile", {}).get("sector"),
        "industry": result.get("assetProfile", {}).get("industry"),
        "market_cap": raw_val("price", "marketCap"),
        "trailing_pe": raw_val("summaryDetail", "trailingPE"),
        "forward_pe": raw_val("summaryDetail", "forwardPE"),
        "eps_trailing": raw_val("defaultKeyStatistics", "trailingEps"),
        "eps_forward": raw_val("defaultKeyStatistics", "forwardEps"),
        "dividend_yield": raw_val("summaryDetail", "dividendYield"),
        "profit_margin": raw_val("financialData", "profitMargins"),
        "revenue_growth": raw_val("financialData", "revenueGrowth"),
        "earnings_growth": raw_val("financialData", "earningsGrowth"),
        "debt_to_equity": raw_val("financialData", "debtToEquity"),
        "return_on_equity": raw_val("financialData", "returnOnEquity"),
        "beta": raw_val("summaryDetail", "beta"),
        "target_mean_price": raw_val("financialData", "targetMeanPrice"),
        "recommendation_key": result.get("financialData", {}).get("recommendationKey"),
        "fifty_two_week_high": raw_val("summaryDetail", "fiftyTwoWeekHigh"),
        "fifty_two_week_low": raw_val("summaryDetail", "fiftyTwoWeekLow"),
    }


def search_symbol(query_str: str, limit: int = 8) -> list[dict]:
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={quote(query_str)}&quotesCount={limit}&newsCount=0"
    try:
        raw = _get(url)
        data = json.loads(raw)
        return [
            {
                "symbol": q.get("symbol"),
                "name": q.get("longname") or q.get("shortname"),
                "exchange": q.get("exchDisp"),
                "type": q.get("typeDisp"),
            }
            for q in data.get("quotes", []) if q.get("symbol")
        ]
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError, KeyError):
        return []


_TAG_RE = re.compile(r"<[^>]+>")


def fetch_news_headlines(query_str: str, limit: int = 10) -> list[dict]:
    url = f"https://news.google.com/rss/search?q={quote(query_str)}&hl=en-US&gl=US&ceid=US:en"
    try:
        raw = _get(url)
        root = ET.fromstring(raw)
    except (urllib.error.URLError, TimeoutError, OSError, ET.ParseError):
        return []

    headlines = []
    for item in root.findall(".//item")[:limit]:
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub_date = (item.findtext("pubDate") or "").strip()
        source_el = item.find("source")
        source = source_el.text.strip() if source_el is not None and source_el.text else None
        if title:
            headlines.append({"title": _TAG_RE.sub("", title), "link": link, "pub_date": pub_date, "source": source})
    return headlines
