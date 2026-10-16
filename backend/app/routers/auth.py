import math

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import LoginRequest, PasswordChange, TokenOut, UserOut
from ..security import create_token, current_user, hash_password, verify_password
from .users import find_by_username

router = APIRouter(prefix="/api/auth", tags=["auth"])

IP_LIMIT_FACTOR = 4  # one client may fail across several usernames before it's blocked


def _too_many(seconds: int) -> HTTPException:
    minutes = math.ceil(seconds / 60)
    return HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                         f"Too many failed attempts. Try again in {minutes} minute{'s' if minutes != 1 else ''}.",
                         headers={"Retry-After": str(seconds)})


@router.post("/login", response_model=TokenOut)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    limiter = request.app.state.login_limiter
    ip = request.client.host if request.client else "unknown"
    user_key, ip_key = f"login:{body.username.strip().lower()}|{ip}", f"login-ip:{ip}"
    wait = limiter.retry_after(user_key) or limiter.retry_after(ip_key, limiter.max_failures * IP_LIMIT_FACTOR)
    if wait:
        raise _too_many(wait)

    user = find_by_username(db, body.username)
    # Always run the hash check so unknown usernames aren't faster to reject.
    password_ok = verify_password(body.password, user.password_hash if user else None)
    if user is None or not password_ok or not user.active:
        limiter.failure(user_key)
        limiter.failure(ip_key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    limiter.reset(user_key)
    return TokenOut(access_token=create_token(request, user), user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.post("/password", response_model=TokenOut)
def change_password(body: PasswordChange, request: Request, db: Session = Depends(get_db),
                    user: User = Depends(current_user)):
    """Change your own password. Ends all other sessions; returns a new token for this one."""
    limiter = request.app.state.login_limiter
    key = f"password:{user.id}"
    if wait := limiter.retry_after(key):
        raise _too_many(wait)
    if not verify_password(body.current_password, user.password_hash):
        limiter.failure(key)
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    if body.new_password == body.current_password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "New password must be different")
    limiter.reset(key)
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return TokenOut(access_token=create_token(request, user), user=UserOut.model_validate(user))
