import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.models import Document, User
from app.schemas.schemas import DocumentOut

router = APIRouter(prefix="/documents", tags=["Document Management"], dependencies=[Depends(get_current_user)])

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Extensions accepted for V1 (mandate: PDF, Excel, Word, PowerPoint, Images, Text, Markdown)
_ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".txt", ".md", ".csv",
}


@router.get("", response_model=list[DocumentOut])
def list_documents(
    entity_type: str | None = None,
    entity_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(Document.is_deleted == False, Document.user_id == current_user.id)
    if entity_type:
        query = query.filter(Document.entity_type == entity_type)
    if entity_id:
        query = query.filter(Document.entity_id == entity_id)
    return query.order_by(Document.created_at.desc()).all()


@router.post("/upload", response_model=DocumentOut)
async def upload_document(
    file: UploadFile = File(...),
    description: str | None = Form(None),
    tags: str | None = Form(None),
    entity_type: str | None = Form(None),
    entity_id: str | None = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    original_name = file.filename or "upload"
    ext = os.path.splitext(original_name)[1].lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type '{ext}' is not supported")

    storage_name = f"{uuid.uuid4().hex}{ext}"
    storage_path = os.path.join(settings.UPLOAD_DIR, storage_name)

    size_bytes = 0
    with open(storage_path, "wb") as out_file:
        while chunk := await file.read(1024 * 1024):
            size_bytes += len(chunk)
            if size_bytes > settings.MAX_UPLOAD_BYTES:
                out_file.close()
                os.remove(storage_path)
                raise HTTPException(status_code=413, detail="File exceeds the maximum upload size")
            out_file.write(chunk)

    doc = Document(
        filename=original_name,
        storage_name=storage_name,
        content_type=file.content_type,
        size_bytes=size_bytes,
        description=description,
        tags=tags,
        entity_type=entity_type,
        entity_id=entity_id,
        user_id=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.get("/{document_id}/download")
def download_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(
        Document.id == document_id, Document.is_deleted == False, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = os.path.join(settings.UPLOAD_DIR, doc.storage_name)
    if not os.path.exists(storage_path):
        raise HTTPException(status_code=404, detail="File is missing from storage")

    return FileResponse(storage_path, filename=doc.filename, media_type=doc.content_type)


@router.get("/{document_id}/view")
def view_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Same file as /download, but with an inline Content-Disposition so browsers that can render
    the type (PDF, images, text) preview it instead of forcing a save-to-disk prompt."""
    doc = db.query(Document).filter(
        Document.id == document_id, Document.is_deleted == False, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    storage_path = os.path.join(settings.UPLOAD_DIR, doc.storage_name)
    if not os.path.exists(storage_path):
        raise HTTPException(status_code=404, detail="File is missing from storage")

    return FileResponse(storage_path, filename=doc.filename, media_type=doc.content_type, content_disposition_type="inline")


@router.delete("/{document_id}")
def delete_document(document_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = db.query(Document).filter(
        Document.id == document_id, Document.is_deleted == False, Document.user_id == current_user.id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_deleted = True
    db.commit()
    return {"status": "deleted", "id": document_id}
