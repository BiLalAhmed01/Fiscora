"""Shared slowapi Limiter instance.

Lives in its own module (rather than backend/main.py) so router modules can
import and apply @limiter.limit(...) to individual endpoints without a
circular import on backend.main (which itself imports the routers).
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
