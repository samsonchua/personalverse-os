from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import StockWatchlistItem, User
from app.schemas.schemas import StockWatchlistItemCreate
from app.services import stock_data
from app.services.stock_analysis import compute_technical, score_fundamentals, score_sentiment, generate_recommendation

router = APIRouter(prefix="/stock-analysis", tags=["Stock Analysis"], dependencies=[Depends(get_current_user)])


@router.get("/search")
def search(q: str = Query(..., min_length=1), current_user: User = Depends(get_current_user)):
    return stock_data.search_symbol(q)


@router.get("/watchlist")
def list_watchlist(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(StockWatchlistItem)
        .filter(StockWatchlistItem.user_id == current_user.id, StockWatchlistItem.is_deleted == False)
        .order_by(StockWatchlistItem.created_at.desc())
        .all()
    )


@router.post("/watchlist")
def add_watchlist_item(item_in: StockWatchlistItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = StockWatchlistItem(**item_in.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/watchlist/{item_id}")
def remove_watchlist_item(item_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(StockWatchlistItem).filter(StockWatchlistItem.id == item_id, StockWatchlistItem.user_id == current_user.id, StockWatchlistItem.is_deleted == False).first()
    if not item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    item.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": item_id}


@router.get("/{symbol}")
def analyze(symbol: str, range: str = Query("6mo", pattern="^(1mo|3mo|6mo|1y|2y|5y)$"), current_user: User = Depends(get_current_user)):
    price_data = stock_data.fetch_price_history(symbol, range_=range)
    if not price_data or len(price_data["candles"]) < 5:
        raise HTTPException(status_code=502, detail=f"Could not fetch price data for '{symbol}'. Check the ticker is valid (e.g. AAPL, 1155.KL, BTC-USD).")

    candles = price_data["candles"]
    closes = [c["close"] for c in candles]
    highs = [c["high"] if c["high"] is not None else c["close"] for c in candles]
    lows = [c["low"] if c["low"] is not None else c["close"] for c in candles]

    technical = compute_technical(closes, highs, lows)

    fundamentals_raw = stock_data.fetch_fundamentals(symbol)
    fundamental = score_fundamentals(fundamentals_raw)

    news_query = fundamentals_raw.get("company_name") if fundamentals_raw and fundamentals_raw.get("company_name") else symbol
    headlines = stock_data.fetch_news_headlines(f"{news_query} stock", limit=10)
    sentiment = score_sentiment(headlines)

    recommendation = generate_recommendation(technical, fundamental, sentiment)

    return {
        "symbol": price_data["symbol"],
        "currency": price_data["currency"],
        "exchange": price_data["exchange"],
        "current_price": price_data["current_price"],
        "fifty_two_week_high": price_data["fifty_two_week_high"],
        "fifty_two_week_low": price_data["fifty_two_week_low"],
        "candles": [
            {**c, "date": datetime.fromtimestamp(c["date"], tz=timezone.utc).strftime("%Y-%m-%d")}
            for c in candles
        ],
        "technical": technical,
        "fundamentals": fundamentals_raw,
        "fundamental_score": fundamental,
        "sentiment": sentiment,
        "headlines": headlines,
        "recommendation": recommendation,
    }
