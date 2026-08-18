from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import User
from app.services.life_graph import life_graph_service

router = APIRouter(prefix="/search", tags=["Universal Search"], dependencies=[Depends(get_current_user)])

@router.get("/universal")
def universal_search(
    q: str = Query(..., description="Search query string"),
    domain: str = Query("all", description="Domain filter (finance, work, knowledge, health, career, journal, all)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return life_graph_service.universal_search(db=db, user_id=current_user.id, query=q, domain=domain)
