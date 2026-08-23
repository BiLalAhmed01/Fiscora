from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user
from backend.api.schemas import ProfileResponse, ProfileUpdate
from backend.db.models import FinancialProfile, User
from backend.db.session import get_db

router = APIRouter(prefix="/profile", tags=["profile"])


def _get_or_create_profile(db: Session, user: User) -> FinancialProfile:
    if user.profile is not None:
        return user.profile
    profile = FinancialProfile(user_id=user.id, monthly_income=0.0, dependants=0)
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("", response_model=ProfileResponse)
def get_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _get_or_create_profile(db, user)


@router.put("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    profile = _get_or_create_profile(db, user)
    if payload.monthly_income is not None:
        profile.monthly_income = payload.monthly_income
    if payload.dependants is not None:
        profile.dependants = payload.dependants
    db.commit()
    db.refresh(profile)
    return profile
