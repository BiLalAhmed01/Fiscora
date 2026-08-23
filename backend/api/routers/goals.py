"""Savings/debt goal tracking -- feeds the dashboard's debt payoff timeline
and savings progress views. Not in the original spec's endpoint list but
needed so the debt_reduction/savings_strategy agents have real data to read,
and so the frontend dashboard has something to chart.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.api.deps import get_current_user
from backend.api.schemas import GoalCreate, GoalResponse
from backend.db.models import Goal, User
from backend.db.session import get_db

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalResponse])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Goal).filter(Goal.user_id == user.id).order_by(Goal.created_at.desc()).all()


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
def create_goal(
    payload: GoalCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.goal_type not in ("savings", "debt"):
        raise HTTPException(status_code=422, detail="goal_type must be 'savings' or 'debt'")

    goal = Goal(user_id=user.id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if goal is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Goal not found")
    db.delete(goal)
    db.commit()
