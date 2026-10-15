from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..db import get_db
from ..models import Comment, Entry, EntryHistory, Project, User, utcnow
from ..schemas import (
    DfmeaFile, Diagram, ProjectCreate, ProjectOut, ProjectSummary, ProjectUpdate, iso_utc,
)
from ..security import current_user, require_pm
from ..seed import add_demo_content

router = APIRouter(prefix="/api/projects", tags=["projects"])
FILE_FORMAT = "DFMEA-v2"

_FULL = (
    selectinload(Project.entries).selectinload(Entry.history),
    selectinload(Project.entries).selectinload(Entry.comments),
)


def load_project(db: Session, project_id: str, *, full: bool = False) -> Project:
    project = db.get(Project, project_id, options=_FULL if full else ())
    if project is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found")
    return project


def _summary(p: Project) -> ProjectSummary:
    comments = [c for e in p.entries for c in e.comments]
    return ProjectSummary(
        id=p.id, name=p.name, product=p.product, revision=p.revision, team=p.team,
        description=p.description, created_by=p.created_by, created_at=p.created_at,
        updated_at=p.updated_at,
        entry_count=len(p.entries),
        critical_count=sum(e.rpn > 200 for e in p.entries),
        open_count=sum(e.status == "Open" for e in p.entries),
        comment_count=len(comments),
        open_comment_count=sum(c.status == "open" for c in comments),
    )


@router.get("", response_model=list[ProjectSummary])
def list_projects(db: Session = Depends(get_db), _: User = Depends(current_user)):
    projects = db.scalars(
        select(Project).options(selectinload(Project.entries).selectinload(Entry.comments))
        .order_by(Project.updated_at.desc())
    ).all()
    return [_summary(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, db: Session = Depends(get_db), user: User = Depends(require_pm)):
    project = Project(**body.model_dump(exclude={"demo"}), created_by=user.id)
    if body.demo:
        add_demo_content(project, user.id)
    db.add(project)
    db.commit()
    return load_project(db, project.id, full=True)


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db), _: User = Depends(current_user)):
    return load_project(db, project_id, full=True)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(project_id: str, body: ProjectUpdate, db: Session = Depends(get_db),
                   _: User = Depends(require_pm)):
    project = load_project(db, project_id, full=True)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(project, k, v)
    project.touch()
    db.commit()
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: str, db: Session = Depends(get_db), _: User = Depends(require_pm)):
    db.delete(load_project(db, project_id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.put("/{project_id}/diagram", response_model=Diagram)
def save_diagram(project_id: str, body: Diagram, db: Session = Depends(get_db),
                 _: User = Depends(require_pm)):
    project = load_project(db, project_id)
    project.diagram = body.model_dump()
    project.touch()
    db.commit()
    return project.diagram


@router.get("/{project_id}/export")
def export_project(project_id: str, db: Session = Depends(get_db), _: User = Depends(current_user)):
    project = ProjectOut.model_validate(load_project(db, project_id, full=True))
    return {"__format": FILE_FORMAT, "exportedAt": iso_utc(utcnow()),
            "project": project.model_dump(mode="json", by_alias=True)}


@router.post("/import", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def import_project(body: DfmeaFile, db: Session = Depends(get_db), user: User = Depends(require_pm)):
    """Create a new project from a .dfmea file. IDs are regenerated; authorship,
    versions, history and comments are kept."""
    src = body.project
    project = Project(**src.model_dump(include={"name", "product", "revision", "team", "description"}),
                      diagram=src.diagram.model_dump() if src.diagram else None, created_by=user.id)
    entry_fields = set(Entry.__table__.columns.keys())
    for i, e in enumerate(src.entries):
        data = e.model_dump(exclude={"history", "comments"}, exclude_none=True)
        entry = Entry(position=i, **{k: v for k, v in data.items() if k in entry_fields})
        entry.history = [EntryHistory(**h.model_dump(exclude_none=True)) for h in e.history]
        entry.comments = [Comment(**c.model_dump(exclude_none=True)) for c in e.comments]
        project.entries.append(entry)
    db.add(project)
    db.commit()
    return load_project(db, project.id, full=True)
