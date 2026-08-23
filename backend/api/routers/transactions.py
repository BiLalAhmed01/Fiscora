"""GET /transactions -- feeds the dashboard's budget breakdown and
income-vs-expenses charts. Not in the original spec's endpoint list (which
only called out /upload-csv for writing transactions) but required to read
them back out for the frontend.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user
from backend.db.models import Transaction, User
from backend.db.session import get_db

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionResponse(BaseModel):
    id: int
    date: str
    category: str
    amount: float

    class Config:
        from_attributes = True


@router.get("", response_model=list[TransactionResponse])
def list_transactions(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id)
        .order_by(Transaction.date.desc())
        .all()
    )
