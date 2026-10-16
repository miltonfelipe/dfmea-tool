from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import User
from ..schemas import UserCreate, UserOut, UserUpdate
from ..security import current_user, hash_password, require_pm

router = APIRouter(prefix="/api/users", tags=["users"])


def find_by_username(db: Session, username: str) -> User | None:
    """Case-insensitive lookup (older rows may have been stored with capitals)."""
    return db.scalar(select(User).where(func.lower(User.username) == username.strip().lower()))


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(current_user)):
    # Everyone needs names/colours to render comment authors and avatars.
    return db.scalars(select(User).order_by(User.name)).all()


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, db: Session = Depends(get_db), _: User = Depends(require_pm)):
    if find_by_username(db, body.username):
        raise HTTPException(status.HTTP_409_CONFLICT, "Username already exists")
    user = User(name=body.name, username=body.username, password_hash=hash_password(body.password),
                role=body.role, color=body.color)
    db.add(user)
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, body: UserUpdate, db: Session = Depends(get_db), me: User = Depends(require_pm)):
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if user.id == me.id and (changes.get("active") is False or changes.get("role", "PM") != "PM"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You cannot deactivate or demote yourself")
    if "password" in changes:
        # New hash => the user's existing sessions stop working (see security.py).
        user.password_hash = hash_password(changes.pop("password"))
    for k, v in changes.items():
        setattr(user, k, v)
    db.commit()
    return user
