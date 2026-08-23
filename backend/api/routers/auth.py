import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from backend import config
from backend.api.schemas import LoginRequest, LogoutRequest, RefreshRequest, SignupRequest, TokenResponse
from backend.api.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from backend.db.models import RefreshToken, User
from backend.db.session import get_db
from backend.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

# 5/minute per client IP on the credential-handling endpoints -- brute-force
# / credential-stuffing protection. slowapi's decorator requires the
# decorated endpoint to accept a `request: Request` parameter (it reads the
# client IP off it via the limiter's key_func).
AUTH_RATE_LIMIT = "5/minute"


def _issue_token_pair(db: Session, user: User, family_id: str | None = None) -> TokenResponse:
    """Issues a fresh access token + a new refresh token row. Passing
    family_id links the new refresh token to an existing rotation chain
    (used by /refresh); omitting it starts a new chain (used by
    signup/login)."""
    raw_refresh_token = generate_refresh_token()
    expires_at = datetime.datetime.utcnow() + datetime.timedelta(days=config.REFRESH_TOKEN_EXPIRE_DAYS)

    token_row = RefreshToken(
        user_id=user.id,
        token_hash=hash_refresh_token(raw_refresh_token),
        expires_at=expires_at,
        **({"family_id": family_id} if family_id else {}),
    )
    db.add(token_row)
    db.commit()

    return TokenResponse(
        access_token=create_access_token(subject=str(user.id)),
        refresh_token=raw_refresh_token,
        expires_in=config.JWT_EXPIRE_MINUTES * 60,
    )


@router.post("/signup", response_model=TokenResponse)
@limiter.limit(AUTH_RATE_LIMIT)
def signup(request: Request, payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_token_pair(db, user)


@router.post("/login", response_model=TokenResponse)
@limiter.limit(AUTH_RATE_LIMIT)
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    return _issue_token_pair(db, user)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit(AUTH_RATE_LIMIT)
def refresh(request: Request, payload: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
    token_row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()

    if token_row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    if token_row.revoked_at is not None:
        if token_row.replaced_by_id is not None:
            # This exact token was already rotated away by a normal refresh
            # and superseded by a newer one -- presenting it again means
            # someone has a copy of a token that should no longer exist.
            # That's a genuine replay signal, so kill the whole chain.
            db.query(RefreshToken).filter(
                RefreshToken.family_id == token_row.family_id,
                RefreshToken.revoked_at.is_(None),
            ).update({"revoked_at": datetime.datetime.utcnow()})
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token reuse detected -- session revoked",
            )
        # Revoked without ever being rotated -- a normal logout, or this
        # token was swept up by a sibling token's reuse detection. Neither
        # is itself evidence of a replay, so don't claim one; this is just
        # "that session is over."
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")

    if token_row.expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user = db.get(User, token_row.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_tokens = _issue_token_pair(db, user, family_id=token_row.family_id)

    # The newest row is the one _issue_token_pair just committed for this user/family.
    new_row = (
        db.query(RefreshToken)
        .filter(RefreshToken.family_id == token_row.family_id)
        .order_by(RefreshToken.id.desc())
        .first()
    )
    token_row.revoked_at = datetime.datetime.utcnow()
    token_row.replaced_by_id = new_row.id
    db.commit()

    return new_tokens


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: LogoutRequest, db: Session = Depends(get_db)):
    token_hash = hash_refresh_token(payload.refresh_token)
    token_row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).first()
    if token_row is None:
        # Logging out with an already-invalid/unknown token is not an error
        # from the caller's perspective -- the end state they wanted (no
        # active session for that token) already holds.
        return

    db.query(RefreshToken).filter(
        RefreshToken.family_id == token_row.family_id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": datetime.datetime.utcnow()})
    db.commit()
