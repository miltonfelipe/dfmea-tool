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


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return _hasher.verify(password, password_hash)


def create_token(request: Request, user: User) -> str:
    settings = request.app.state.settings
    exp = utcnow() + timedelta(minutes=settings.token_ttl_minutes)
    return jwt.encode({"sub": user.id, "exp": exp}, settings.secret_key, algorithm=ALGORITHM)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None:
        raise _unauthorized("Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, request.app.state.settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        raise _unauthorized("Invalid or expired token")
    # Role and active flag are read from the DB, so changes apply immediately.
    user = db.get(User, payload.get("sub"))
    if user is None or not user.active:
        raise _unauthorized("User not found or inactive")
    return user


def require_pm(user: User = Depends(current_user)) -> User:
    if user.role != "PM":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Project Manager role required")
    return user
