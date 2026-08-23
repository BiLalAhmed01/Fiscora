"""Password hashing + JWT issuance/verification. Simplest scheme that works
with a Next.js frontend: bearer token in an Authorization header.
"""
import datetime
import hashlib
import secrets

import bcrypt
from jose import JWTError, jwt

from backend import config


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(subject: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> str:
    """Returns the subject (user id as str) or raises JWTError."""
    payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    subject = payload.get("sub")
    if subject is None:
        raise JWTError("Token missing subject")
    return subject


def generate_refresh_token() -> str:
    """An opaque, high-entropy token -- not a JWT. Verified by DB lookup on
    its hash (see hash_refresh_token), which is what makes server-side
    revocation possible."""
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """SHA-256 hash stored in place of the raw token so a DB leak alone
    doesn't hand out usable credentials."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
