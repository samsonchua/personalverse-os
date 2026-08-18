from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import Client, ClientService, ClientMeeting, FinanceTransaction, User
from app.schemas.schemas import (
    ClientCreate, ClientUpdate, ClientServiceCreate, ClientServiceUpdate,
    ClientMeetingCreate, ClientMeetingUpdate,
)

router = APIRouter(prefix="/clients", tags=["Client Management"], dependencies=[Depends(get_current_user)])


def _income_total(db: Session, client_id: str, user_id: str) -> float:
    txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.client_id == client_id,
        FinanceTransaction.user_id == user_id,
        FinanceTransaction.transaction_type == "income",
        FinanceTransaction.is_deleted == False,
    ).all()
    return round(sum(t.amount for t in txs), 2)


@router.get("/summary")
def list_clients(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    clients = db.query(Client).filter(Client.user_id == current_user.id, Client.is_deleted == False).order_by(Client.created_at.desc()).all()
    result = []
    for c in clients:
        service_count = db.query(ClientService).filter(ClientService.client_id == c.id, ClientService.user_id == current_user.id, ClientService.is_deleted == False).count()
        meeting_count = db.query(ClientMeeting).filter(ClientMeeting.client_id == c.id, ClientMeeting.user_id == current_user.id, ClientMeeting.is_deleted == False).count()
        result.append({
            "id": c.id, "name": c.name, "business_nature": c.business_nature, "status": c.status,
            "contact_person": c.contact_person, "contact_email": c.contact_email, "contact_phone": c.contact_phone,
            "address": c.address, "notes": c.notes, "created_at": c.created_at,
            "service_count": service_count, "meeting_count": meeting_count,
            "total_income": _income_total(db, c.id, current_user.id),
        })
    return result


@router.get("/{client_id}")
def get_client_detail(client_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    services = db.query(ClientService).filter(ClientService.client_id == client_id, ClientService.user_id == current_user.id, ClientService.is_deleted == False).order_by(ClientService.created_at.desc()).all()
    meetings = db.query(ClientMeeting).filter(ClientMeeting.client_id == client_id, ClientMeeting.user_id == current_user.id, ClientMeeting.is_deleted == False).order_by(ClientMeeting.meeting_date.desc()).all()
    income_txs = db.query(FinanceTransaction).filter(
        FinanceTransaction.client_id == client_id, FinanceTransaction.user_id == current_user.id, FinanceTransaction.is_deleted == False,
    ).order_by(FinanceTransaction.date.desc()).all()

    return {
        "id": client.id, "name": client.name, "business_nature": client.business_nature, "status": client.status,
        "contact_person": client.contact_person, "contact_email": client.contact_email, "contact_phone": client.contact_phone,
        "address": client.address, "notes": client.notes, "created_at": client.created_at,
        "services": services,
        "meetings": meetings,
        "transactions": income_txs,
        "total_income": _income_total(db, client_id, current_user.id),
    }


@router.post("")
def create_client(client_in: ClientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = Client(**client_in.model_dump(), user_id=current_user.id)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.put("/{client_id}")
def update_client(client_id: str, client_in: ClientUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for key, val in client_in.model_dump(exclude_unset=True).items():
        setattr(client, key, val)
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}")
def delete_client(client_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == client_id, Client.user_id == current_user.id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    client.is_deleted = True
    db.query(ClientService).filter(ClientService.client_id == client_id, ClientService.user_id == current_user.id).update({"is_deleted": True})
    db.query(ClientMeeting).filter(ClientMeeting.client_id == client_id, ClientMeeting.user_id == current_user.id).update({"is_deleted": True})
    db.commit()
    return {"status": "deleted", "id": client_id}


# SERVICES

@router.post("/services")
def create_service(service_in: ClientServiceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == service_in.client_id, Client.user_id == current_user.id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    service = ClientService(**service_in.model_dump(), user_id=current_user.id)
    db.add(service)
    db.commit()
    db.refresh(service)
    return service


@router.put("/services/{service_id}")
def update_service(service_id: str, service_in: ClientServiceUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = db.query(ClientService).filter(ClientService.id == service_id, ClientService.user_id == current_user.id, ClientService.is_deleted == False).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    for key, val in service_in.model_dump(exclude_unset=True).items():
        setattr(service, key, val)
    db.commit()
    db.refresh(service)
    return service


@router.delete("/services/{service_id}")
def delete_service(service_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = db.query(ClientService).filter(ClientService.id == service_id, ClientService.user_id == current_user.id, ClientService.is_deleted == False).first()
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    service.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": service_id}


# MEETINGS

@router.post("/meetings")
def create_meeting(meeting_in: ClientMeetingCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    client = db.query(Client).filter(Client.id == meeting_in.client_id, Client.user_id == current_user.id, Client.is_deleted == False).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    meeting = ClientMeeting(**meeting_in.model_dump(), user_id=current_user.id)
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.put("/meetings/{meeting_id}")
def update_meeting(meeting_id: str, meeting_in: ClientMeetingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(ClientMeeting).filter(ClientMeeting.id == meeting_id, ClientMeeting.user_id == current_user.id, ClientMeeting.is_deleted == False).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    for key, val in meeting_in.model_dump(exclude_unset=True).items():
        setattr(meeting, key, val)
    db.commit()
    db.refresh(meeting)
    return meeting


@router.delete("/meetings/{meeting_id}")
def delete_meeting(meeting_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    meeting = db.query(ClientMeeting).filter(ClientMeeting.id == meeting_id, ClientMeeting.user_id == current_user.id, ClientMeeting.is_deleted == False).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    meeting.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": meeting_id}
