import urllib.error
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import WebArticle, User
from app.schemas.schemas import WebArticleFetchRequest
from app.services.web_reader import fetch_and_extract, summarize, UnsafeUrlError

router = APIRouter(prefix="/web-reader", tags=["Web Reader"], dependencies=[Depends(get_current_user)])


@router.get("/articles")
def list_articles(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(WebArticle)
        .filter(WebArticle.is_deleted == False, WebArticle.user_id == current_user.id)
        .order_by(WebArticle.created_at.desc())
        .all()
    )


@router.post("/fetch")
def fetch_article(req: WebArticleFetchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        title, text = fetch_and_extract(req.url)
    except UnsafeUrlError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except urllib.error.URLError as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch URL: {e.reason}")
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Request to the URL timed out.")

    if not text:
        raise HTTPException(status_code=422, detail="No readable text found on that page.")

    summary = summarize(title, text)
    word_count = len(text.split())
    article = WebArticle(
        url=req.url,
        title=title,
        summary=summary,
        content_text=text[:20000],
        word_count=word_count,
        reading_time_min=max(1, round(word_count / 200)),
        user_id=current_user.id,
    )
    db.add(article)
    db.commit()
    db.refresh(article)
    return article


@router.delete("/articles/{article_id}")
def delete_article(article_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    article = db.query(WebArticle).filter(
        WebArticle.id == article_id, WebArticle.is_deleted == False, WebArticle.user_id == current_user.id
    ).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    article.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": article_id}
