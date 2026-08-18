"""Pure computation over already-fetched market data: technical indicators, a heuristic
fundamental score, a news-headline sentiment score, and a composite buy/sell recommendation.
No network calls here — see stock_data.py for fetching. Every score is a transparent, documented
heuristic (not a trained model or professional equity research) and every recommendation carries
an explicit disclaimer."""

import json
import re
from app.services.ai_providers import get_configured_provider

POSITIVE_WORDS = [
    "surge", "soar", "rally", "beat", "beats", "upgrade", "upgraded", "record", "strong",
    "growth", "outperform", "bullish", "gain", "gains", "rise", "rises", "buy", "breakthrough",
    "profit", "robust", "expand", "expansion", "top pick", "raises guidance", "buyback",
]
NEGATIVE_WORDS = [
    "plunge", "plunges", "crash", "miss", "misses", "downgrade", "downgraded", "weak",
    "decline", "declines", "bearish", "loss", "losses", "fall", "falls", "sell", "lawsuit",
    "investigation", "cut", "cuts", "warning", "recall", "layoff", "layoffs", "fraud", "scandal",
    "probe", "slump",
]


def score_label(score: float) -> str:
    if score >= 50:
        return "Strong Buy"
    if score >= 20:
        return "Buy"
    if score > -20:
        return "Neutral"
    if score > -50:
        return "Sell"
    return "Strong Sell"


def _sma(closes: list[float], period: int) -> float | None:
    if len(closes) < period:
        return None
    return sum(closes[-period:]) / period


def _ema_series(values: list[float], period: int) -> list[float]:
    if len(values) < period:
        return []
    k = 2 / (period + 1)
    ema = [sum(values[:period]) / period]
    for v in values[period:]:
        ema.append(v * k + ema[-1] * (1 - k))
    return ema


def _rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [d if d > 0 else 0.0 for d in deltas]
    losses = [-d if d < 0 else 0.0 for d in deltas]
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _macd(closes: list[float]) -> dict | None:
    if len(closes) < 26 + 9:
        return None
    ema12, ema26 = _ema_series(closes, 12), _ema_series(closes, 26)
    offset = len(ema12) - len(ema26)
    macd_line = [ema12[offset + i] - ema26[i] for i in range(len(ema26))]
    signal_line = _ema_series(macd_line, 9)
    if not signal_line:
        return None
    hist_offset = len(macd_line) - len(signal_line)
    histogram = [macd_line[hist_offset + i] - signal_line[i] for i in range(len(signal_line))]
    return {
        "macd": round(macd_line[-1], 4),
        "signal": round(signal_line[-1], 4),
        "histogram": round(histogram[-1], 4),
        "prev_histogram": round(histogram[-2], 4) if len(histogram) > 1 else None,
    }


def _bollinger(closes: list[float], period: int = 20, num_std: float = 2.0) -> dict | None:
    if len(closes) < period:
        return None
    window = closes[-period:]
    mean = sum(window) / period
    variance = sum((x - mean) ** 2 for x in window) / period
    std = variance ** 0.5
    return {"middle": round(mean, 4), "upper": round(mean + num_std * std, 4), "lower": round(mean - num_std * std, 4)}


def compute_technical(closes: list[float], highs: list[float], lows: list[float]) -> dict:
    current = closes[-1]
    sma20, sma50, sma200 = _sma(closes, 20), _sma(closes, 50), _sma(closes, 200)
    rsi14 = _rsi(closes, 14)
    macd_data = _macd(closes)
    bb = _bollinger(closes, 20, 2)
    lookback = min(20, len(lows))
    support = min(lows[-lookback:])
    resistance = max(highs[-lookback:])

    score = 0.0
    signals: list[str] = []

    if sma50 is not None:
        if current > sma50:
            score += 15; signals.append("Price above 50-day SMA (uptrend)")
        else:
            score -= 15; signals.append("Price below 50-day SMA (downtrend)")
    if sma200 is not None:
        if current > sma200:
            score += 15; signals.append("Price above 200-day SMA (long-term uptrend)")
        else:
            score -= 15; signals.append("Price below 200-day SMA (long-term downtrend)")
    if sma50 is not None and sma200 is not None:
        if sma50 > sma200:
            score += 10; signals.append("Golden-cross structure (50-day SMA above 200-day SMA)")
        else:
            score -= 10; signals.append("Death-cross structure (50-day SMA below 200-day SMA)")
    if rsi14 is not None:
        if rsi14 < 30:
            score += 15; signals.append(f"RSI {rsi14:.0f} — oversold, potential bounce")
        elif rsi14 > 70:
            score -= 15; signals.append(f"RSI {rsi14:.0f} — overbought, potential pullback")
        else:
            signals.append(f"RSI {rsi14:.0f} — neutral zone")
    if macd_data is not None:
        if macd_data["histogram"] > 0:
            score += 10; signals.append("MACD histogram positive (bullish momentum)")
        else:
            score -= 10; signals.append("MACD histogram negative (bearish momentum)")
        prev = macd_data["prev_histogram"]
        if prev is not None:
            if prev <= 0 < macd_data["histogram"]:
                score += 10; signals.append("MACD bullish crossover")
            elif prev >= 0 > macd_data["histogram"]:
                score -= 10; signals.append("MACD bearish crossover")
    if bb is not None and bb["upper"] > bb["lower"]:
        position = (current - bb["lower"]) / (bb["upper"] - bb["lower"])
        if position < 0.15:
            score += 10; signals.append("Price near lower Bollinger Band")
        elif position > 0.85:
            score -= 10; signals.append("Price near upper Bollinger Band")

    score = max(-100.0, min(100.0, score))
    return {
        "score": round(score, 1),
        "label": score_label(score),
        "signals": signals,
        "sma20": round(sma20, 2) if sma20 else None,
        "sma50": round(sma50, 2) if sma50 else None,
        "sma200": round(sma200, 2) if sma200 else None,
        "rsi14": round(rsi14, 1) if rsi14 is not None else None,
        "macd": macd_data,
        "bollinger": bb,
        "support": round(support, 2),
        "resistance": round(resistance, 2),
    }


def score_fundamentals(fund: dict | None) -> dict | None:
    if not fund:
        return None
    score = 0.0
    signals: list[str] = []

    pe = fund.get("trailing_pe")
    if pe is not None and pe > 0:
        if pe < 15:
            score += 20; signals.append(f"P/E {pe:.1f} — attractively valued")
        elif pe < 25:
            score += 10; signals.append(f"P/E {pe:.1f} — fair valuation")
        elif pe < 40:
            signals.append(f"P/E {pe:.1f} — richly valued")
        else:
            score -= 15; signals.append(f"P/E {pe:.1f} — expensive")

    pm = fund.get("profit_margin")
    if pm is not None:
        if pm > 0.20:
            score += 20; signals.append(f"Profit margin {pm * 100:.1f}% — highly profitable")
        elif pm > 0.10:
            score += 10; signals.append(f"Profit margin {pm * 100:.1f}% — healthy")
        elif pm > 0:
            signals.append(f"Profit margin {pm * 100:.1f}% — thin")
        else:
            score -= 20; signals.append("Negative profit margin")

    rg = fund.get("revenue_growth")
    if rg is not None:
        if rg > 0.15:
            score += 15; signals.append(f"Revenue growth {rg * 100:.1f}% — strong")
        elif rg > 0.05:
            score += 8; signals.append(f"Revenue growth {rg * 100:.1f}% — moderate")
        elif rg >= 0:
            signals.append(f"Revenue growth {rg * 100:.1f}% — flat")
        else:
            score -= 15; signals.append(f"Revenue declining {rg * 100:.1f}%")

    de = fund.get("debt_to_equity")
    if de is not None:
        if de < 50:
            score += 10; signals.append(f"Debt/Equity {de:.0f} — low leverage")
        elif de < 150:
            signals.append(f"Debt/Equity {de:.0f} — moderate leverage")
        else:
            score -= 10; signals.append(f"Debt/Equity {de:.0f} — high leverage")

    roe = fund.get("return_on_equity")
    if roe is not None:
        if roe > 0.15:
            score += 10; signals.append(f"ROE {roe * 100:.1f}% — strong returns")
        elif roe > 0:
            signals.append(f"ROE {roe * 100:.1f}%")
        else:
            score -= 10; signals.append("Negative ROE")

    score = max(-100.0, min(100.0, score))
    return {"score": round(score, 1), "label": score_label(score), "signals": signals}


def _lexicon_sentiment(headlines: list[dict]) -> dict:
    if not headlines:
        return {"score": 0, "label": "Neutral", "signals": ["No recent news found"], "source": "keyword"}
    pos = neg = 0
    for h in headlines:
        text = h["title"].lower()
        pos += sum(1 for w in POSITIVE_WORDS if w in text)
        neg += sum(1 for w in NEGATIVE_WORDS if w in text)
    net = pos - neg
    score = max(-100.0, min(100.0, net * 20))
    return {
        "score": round(score, 1), "label": score_label(score),
        "signals": [f"{pos} positive / {neg} negative keyword hits across {len(headlines)} headlines"],
        "source": "keyword",
    }


def _ai_sentiment(headlines: list[dict], provider) -> dict | None:
    joined = "\n".join(f"- {h['title']}" for h in headlines[:10])
    prompt = (
        "Rate overall market sentiment implied by these recent news headlines on a scale of "
        "-100 (very bearish) to 100 (very bullish). Respond with ONLY a JSON object of the form "
        '{"score": <int>, "reasoning": "<one sentence>"}.\n\nHeadlines:\n' + joined
    )
    try:
        raw = provider.complete("You are a financial news sentiment analyzer. Respond with strict JSON only, no markdown.", prompt)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return None
        data = json.loads(match.group(0))
        score = max(-100.0, min(100.0, float(data.get("score", 0))))
        return {
            "score": round(score, 1), "label": score_label(score),
            "signals": [data.get("reasoning", "")], "source": "ai",
        }
    except Exception:
        return None


def score_sentiment(headlines: list[dict]) -> dict:
    provider = get_configured_provider()
    if provider and headlines:
        result = _ai_sentiment(headlines, provider)
        if result:
            return result
    return _lexicon_sentiment(headlines)


def generate_recommendation(technical: dict, fundamental: dict | None, sentiment: dict) -> dict:
    if fundamental:
        composite = 0.40 * technical["score"] + 0.35 * fundamental["score"] + 0.25 * sentiment["score"]
    else:
        composite = 0.60 * technical["score"] + 0.40 * sentiment["score"]
    composite = round(composite, 1)

    support, resistance = technical["support"], technical["resistance"]
    return {
        "composite_score": composite,
        "label": score_label(composite),
        "suggested_buy_zone": [round(support, 2), round(support * 1.02, 2)],
        "suggested_sell_zone": [round(resistance * 0.98, 2), round(resistance, 2)],
        "suggested_stop_loss": round(support * 0.97, 2),
        "disclaimer": (
            "Automated heuristic analysis for research purposes only — not financial advice. "
            "Data may be delayed or incomplete; verify independently and consider your own risk "
            "tolerance before trading."
        ),
    }
