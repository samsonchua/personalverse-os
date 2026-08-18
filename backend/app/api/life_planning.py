"""
Mandala Chart life planning — a 3-level "Open Window 64" structure. See the MandalaBoard/
MandalaCell model docstring in models.py for the full shape (life -> decade -> action).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import MandalaBoard, MandalaCell, User
from app.schemas.schemas import MandalaCellUpdate

router = APIRouter(prefix="/life-planning", tags=["Life Planning"], dependencies=[Depends(get_current_user)])

DECADE_LABELS = ["0–10", "10–20", "20–30", "30–40", "40–50", "50–60", "60–70", "70–80"]
CHILD_BOARD_TYPE = {"life": "decade", "decade": "action"}


def _serialize_cell(cell: MandalaCell) -> dict:
    return {
        "id": cell.id, "position": cell.position, "title": cell.title, "notes": cell.notes,
        "is_completed": cell.is_completed, "child_board_id": cell.child_board_id,
    }


def _serialize_board(db: Session, board: MandalaBoard) -> dict:
    cells = db.query(MandalaCell).filter(
        MandalaCell.board_id == board.id, MandalaCell.is_deleted == False
    ).order_by(MandalaCell.position).all()
    return {
        "id": board.id, "board_type": board.board_type, "title": board.title,
        "parent_cell_id": board.parent_cell_id,
        "cells": [_serialize_cell(c) for c in cells],
    }


def _create_board_with_cells(
    db: Session, user_id: str, board_type: str, title: str | None, parent_cell_id: str | None = None,
    seed_titles: list[str | None] | None = None,
) -> MandalaBoard:
    board = MandalaBoard(user_id=user_id, board_type=board_type, title=title, parent_cell_id=parent_cell_id)
    db.add(board)
    db.flush()  # populate board.id before the cells reference it
    for position in range(9):
        seed_title = seed_titles[position] if seed_titles else None
        db.add(MandalaCell(board_id=board.id, position=position, title=seed_title))
    db.flush()
    return board


def _owned_cell(db: Session, cell_id: str, user_id: str) -> MandalaCell | None:
    return db.query(MandalaCell).join(MandalaBoard, MandalaCell.board_id == MandalaBoard.id).filter(
        MandalaCell.id == cell_id, MandalaBoard.user_id == user_id,
        MandalaCell.is_deleted == False, MandalaBoard.is_deleted == False,
    ).first()


@router.get("/root")
def get_root_board(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """The user's single life-level board — auto-created on first visit, with the 8 decades
    pre-seeded as its surrounding cells (position 0, the center, starts blank for the user's own
    life vision)."""
    board = db.query(MandalaBoard).filter(
        MandalaBoard.user_id == current_user.id, MandalaBoard.board_type == "life", MandalaBoard.is_deleted == False
    ).order_by(MandalaBoard.created_at.asc()).first()
    if not board:
        seed_titles = [None] + DECADE_LABELS
        board = _create_board_with_cells(db, current_user.id, "life", "Life Vision", seed_titles=seed_titles)
        db.commit()
        db.refresh(board)
    return _serialize_board(db, board)


@router.get("/boards/{board_id}")
def get_board(board_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    board = db.query(MandalaBoard).filter(
        MandalaBoard.id == board_id, MandalaBoard.user_id == current_user.id, MandalaBoard.is_deleted == False
    ).first()
    if not board:
        raise HTTPException(status_code=404, detail="Board not found")
    return _serialize_board(db, board)


@router.put("/cells/{cell_id}")
def update_cell(
    cell_id: str, cell_in: MandalaCellUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    cell = _owned_cell(db, cell_id, current_user.id)
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    for key, val in cell_in.model_dump(exclude_unset=True).items():
        setattr(cell, key, val)
    db.commit()
    db.refresh(cell)
    return _serialize_cell(cell)


@router.post("/cells/{cell_id}/expand")
def expand_cell(cell_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Turns a surrounding cell (position 1-8) into its own 9-cell board — a decade cell expands
    into a decade board, a sub-goal cell expands into an action-steps board. Idempotent: calling
    this again on an already-expanded cell just returns the existing child board rather than
    creating a duplicate. The center cell (position 0) represents the board's own goal, not
    something with further children, so it can't be expanded — nor can an action board's cells,
    since action steps are the bottom of this 3-level structure."""
    cell = _owned_cell(db, cell_id, current_user.id)
    if not cell:
        raise HTTPException(status_code=404, detail="Cell not found")
    if cell.position == 0:
        raise HTTPException(status_code=400, detail="The center cell represents this board's own goal and can't be expanded")

    parent_board = db.query(MandalaBoard).filter(MandalaBoard.id == cell.board_id).first()
    child_type = CHILD_BOARD_TYPE.get(parent_board.board_type)
    if not child_type:
        raise HTTPException(status_code=400, detail="Action steps are the final level and can't be expanded further")

    if cell.child_board_id:
        board = db.query(MandalaBoard).filter(MandalaBoard.id == cell.child_board_id).first()
        return _serialize_board(db, board)

    seed_titles = [cell.title] + [None] * 8  # the new board's center mirrors the cell it expanded from
    board = _create_board_with_cells(db, current_user.id, child_type, cell.title, parent_cell_id=cell.id, seed_titles=seed_titles)
    cell.child_board_id = board.id
    db.commit()
    db.refresh(board)
    return _serialize_board(db, board)
