from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user
from backend.api.schemas import WatchlistAdd, WatchlistItemResponse
from backend.db.models import User, WatchlistItem
from backend.db.session import get_db

router = APIRouter(prefix="/watchlist", tags=["watchlist"])


@router.get("", response_model=list[WatchlistItemResponse])
def list_watchlist(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id)
        .order_by(WatchlistItem.added_at.desc())
        .all()
    )


@router.post("", response_model=WatchlistItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_watchlist(
    payload: WatchlistAdd,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    ticker = payload.ticker.strip().upper()
    existing = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.user_id == user.id, WatchlistItem.ticker == ticker)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"{ticker} is already on your watchlist")

    item = WatchlistItem(user_id=user.id, ticker=ticker, notes=payload.notes)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_watchlist(
    item_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = (
        db.query(WatchlistItem)
        .filter(WatchlistItem.id == item_id, WatchlistItem.user_id == user.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist item not found")
    db.delete(item)
    db.commit()
