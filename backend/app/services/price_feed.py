"""
Live price + dividend lookups via EOD Historical Data (eodhd.com).

Uses the /eod (end-of-day) endpoint rather than /real-time — the free/basic EODHD plan doesn't
populate real-time quotes for KLSE-listed symbols (every field comes back "NA"), but EOD data is
fully available and is what "refresh when I open the page" actually needs anyway; nothing here
claims to be a live tick.

Dividend data has no forward-looking declaration dates for KLSE stocks on this plan (confirmed by
inspection — declarationDate is always null), so `next_dividend_amount`/`next_dividend_date` are
left None rather than guessed at. Only trailing-twelve-month yield and the most recent historical
payout are computed.
"""
import urllib.request
import urllib.error
import json
from datetime import date, timedelta
from app.core.config import settings

BASE_URL = "https://eodhd.com/api"


class PriceFeedError(Exception):
    pass


def _get(path: str, params: dict) -> object:
    if not settings.EODHD_API_KEY:
        raise PriceFeedError("EODHD_API_KEY is not configured")
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{BASE_URL}{path}?api_token={settings.EODHD_API_KEY}&fmt=json&{query}"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise PriceFeedError(f"HTTP {e.code} from EODHD") from e
    except urllib.error.URLError as e:
        raise PriceFeedError(f"Could not reach EODHD: {e.reason}") from e


def fetch_latest_price(symbol: str) -> float | None:
    """Most recent close for `symbol` (e.g. "1155.KLSE"), or None if unavailable."""
    rows = _get(f"/eod/{symbol}", {"order": "d", "limit": 5})
    if not isinstance(rows, list) or not rows:
        return None
    latest = max(rows, key=lambda r: r["date"])
    return latest.get("close")


def fetch_dividend_info(symbol: str, current_price: float | None) -> dict:
    """TTM dividend yield + most recent payout for `symbol`. Every field is None if the symbol has
    no dividend history or the lookup fails — callers should treat that as "unknown", not "zero"."""
    since = (date.today() - timedelta(days=400)).isoformat()  # a bit over a year, to not miss a boundary payout
    rows = _get(f"/div/{symbol}", {"from": since})
    if not isinstance(rows, list) or not rows:
        return {"dividend_yield_pct": None, "last_dividend_amount": None, "last_dividend_date": None}

    rows.sort(key=lambda r: r["date"], reverse=True)
    cutoff = (date.today() - timedelta(days=365)).isoformat()
    ttm_total = sum(r["unadjustedValue"] for r in rows if r["date"] >= cutoff)
    latest = rows[0]

    yield_pct = round(ttm_total / current_price * 100, 2) if current_price else None
    return {
        "dividend_yield_pct": yield_pct,
        "last_dividend_amount": latest.get("unadjustedValue"),
        "last_dividend_date": latest.get("date"),
    }
