import base64
import hashlib
import hmac
from datetime import timedelta

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .db import get_db
from .models import User, utcnow

_hasher = PasswordHash.recommended()  # argon2
_bearer = HTTPBearer(auto_error=False)
ALGORITHM = "HS256"
# Verified against when the username doesn't exist, so a failed login takes
# about as long either way and doesn't reveal which usernames are valid.
_DUMMY_HASH = _hasher.hash("dummy-password-for-timing")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str | None) -> bool:
    if password_hash is None:
        _hasher.verify(password, _DUMMY_HASH)
        return False
    return _hasher.verify(password, password_hash)


def _password_fingerprint(user: User, secret_key: str) -> str:
    # Changes whenever the password does (new salt => new hash), so a password
    # change or reset invalidates every token issued before it. Keyed with the
    # secret so the token reveals nothing about the hash.
    mac = hmac.new(secret_key.encode(), user.password_hash.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(mac[:16]).decode().rstrip("=")


def create_token(request: Request, user: User) -> str:
    settings = request.app.state.settings
    now = utcnow()
    claims = {"sub": user.id, "iat": now, "exp": now + timedelta(minutes=settings.token_ttl_minutes),
              "pwv": _password_fingerprint(user, settings.secret_key)}
    return jwt.encode(claims, settings.secret_key, algorithm=ALGORITHM)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise _unauthorized("Not authenticated")
    secret_key = request.app.state.settings.secret_key
    try:
        payload = jwt.decode(creds.credentials, secret_key, algorithms=[ALGORITHM],
                             options={"require": ["sub", "exp", "pwv"]})
    except jwt.PyJWTError:
        raise _unauthorized("Invalid or expired token")
    # Role and active flag are read from the DB, so changes apply immediately.
    user = db.get(User, payload["sub"])
    if user is None or not user.active:
        raise _unauthorized("User not found or inactive")
    if not hmac.compare_digest(payload["pwv"], _password_fingerprint(user, secret_key)):
        raise _unauthorized("Password changed; please sign in again")
    return user


def require_pm(user: User = Depends(current_user)) -> User:
    if user.role != "PM":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project Manager role required")
    return user
