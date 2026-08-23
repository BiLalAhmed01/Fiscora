"""Shared slowapi Limiter instance.

Lives in its own module (rather than backend/main.py) so router modules can
import and apply @limiter.limit(...) to individual endpoints without a
circular import on backend.main (which itself imports the routers).
"""
from jose import JWTError
from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request

from backend.api.security import decode_access_token

limiter = Limiter(key_func=get_remote_address)


def user_or_ip_key(request: Request) -> str:
    """Rate-limit key for endpoints that should throttle per authenticated
    user rather than per IP -- e.g. /chat, where per-IP keying makes every
    user behind the same office/campus NAT or carrier CGNAT share one quota,
    and doesn't actually track spend per account on a paid LLM endpoint.

    Decodes the bearer token directly (rather than depending on
    get_current_user) because slowapi's key_func runs off the raw Request
    before FastAPI dependency injection happens. Falls back to per-IP for
    requests with no token or an invalid/expired one -- those still hit the
    real auth dependency and get rejected with 401 further down; this key
    only needs to bucket them somewhere.
    """
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            user_id = decode_access_token(auth_header[len("Bearer "):])
            return f"user:{user_id}"
        except JWTError:
            pass
    return get_remote_address(request)
