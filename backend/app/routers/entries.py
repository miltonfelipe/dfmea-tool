from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Comment, Entry, EntryHistory, User, utcnow
from ..schemas import CommentCreate, CommentOut, EntryCreate, EntryOut, EntryUpdate
from ..security import current_user, require_pm
from .projects import load_project

router = APIRouter(prefix="/api", tags=["entries"])

# Fields recorded in version history, as camelCase keys (matches the front end).
TRACKED = ["subsystem", "component", "function", "failureMode", "failureEffect", "failureCause",
           "category", "severity", "occurrence", "detection", "rpn", "controls", "action",
           "responsible", "dueDate", "status", "revisedS", "revisedO", "revisedD", "revisedRPN"]


def _snapshot(entry: Entry) -> dict[str, Any]:
    out = EntryOut.model_validate(entry).model_dump(by_alias=True)
    return {k: out[k] for k in TRACKED}


def _diff(old: dict[str, Any], new: dict[str, Any]) -> dict[str, Any]:
    norm = lambda v: "" if v in (None, "") else str(v)  # noqa: E731
    return {k: {"old": old[k], "new": new[k]} for k in TRACKED if norm(old[k]) != norm(new[k])}


def _load_entry(db: Session, entry_id: str) -> Entry:
    entry = db.get(Entry, entry_id, options=(selectinload(Entry.history), selectinload(Entry.comments)))
    if entry is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entry not found")
    return entry


@router.post("/projects/{project_id}/entries", response_model=EntryOut, status_code=status.HTTP_201_CREATED)
def create_entry(project_id: str, body: EntryCreate, db: Session = Depends(get_db),
                 user: User = Depends(require_pm)):
    project = load_project(db, project_id)
    entry = Entry(**body.model_dump(), position=len(project.entries), created_by=user.id)
    project.entries.append(entry)
    project.touch()
    db.commit()
    return _load_entry(db, entry.id)


@router.patch("/entries/{entry_id}", response_model=EntryOut)
def update_entry(entry_id: str, body: EntryUpdate, db: Session = Depends(get_db),
                 user: User = Depends(require_pm)):
    entry = _load_entry(db, entry_id)
    if body.version != entry.version:
        raise HTTPException(status.HTTP_409_CONFLICT,
                            f"Entry was changed by someone else (now v{entry.version}); reload and retry")
    before = _snapshot(entry)
    for k, v in body.model_dump(exclude_unset=True, exclude={"version"}).items():
        setattr(entry, k, v)
    diff = _diff(before, _snapshot(entry))
    if diff:
        entry.history.append(EntryHistory(version=entry.version, edited_by=user.id, diff=diff))
        entry.version += 1
        entry.updated_at = utcnow()
        entry.project.touch()
    db.commit()
    return _load_entry(db, entry.id)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: str, db: Session = Depends(get_db), _: User = Depends(require_pm)):
    entry = _load_entry(db, entry_id)
    entry.project.touch()
    db.delete(entry)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/entries/{entry_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_comment(entry_id: str, body: CommentCreate, db: Session = Depends(get_db),
                user: User = Depends(current_user)):
    entry = _load_entry(db, entry_id)
    comment = Comment(author_id=user.id, text=body.text.strip())
    entry.comments.append(comment)
    entry.project.touch()
    db.commit()
    return comment


@router.post("/comments/{comment_id}/resolve", response_model=CommentOut)
def resolve_comment(comment_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    comment = db.get(Comment, comment_id)
    if comment is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comment not found")
    if comment.status != "resolved":
        comment.status, comment.resolved_by, comment.resolved_at = "resolved", user.id, utcnow()
        comment.entry.project.touch()
        db.commit()
    return comment
