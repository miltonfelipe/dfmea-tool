import json
from functools import cache
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Entry, Project, User
from .schemas import EntryFields
from .security import hash_password

DEMO_USERS = [
    {"name": "Alex Ferreira", "username": "alex", "password": "pm123", "role": "PM", "color": "#00d4ff"},
    {"name": "Sofia Mendes", "username": "sofia", "password": "rv123", "role": "RV", "color": "#a855f7"},
    {"name": "Bruno Costa", "username": "bruno", "password": "rv456", "role": "RV", "color": "#22c55e"},
]


def seed_demo_users(db: Session) -> None:
    if db.scalar(select(User.id).limit(1)) is not None:
        return
    for u in DEMO_USERS:
        db.add(User(name=u["name"], username=u["username"], password_hash=hash_password(u["password"]),
                    role=u["role"], color=u["color"]))
    db.commit()


@cache
def _demo_data() -> dict:
    # Generated from src/data/defaults.js (DEMO_ENTRIES / DEMO_DIAGRAM).
    return json.loads((Path(__file__).parent / "demo_data.json").read_text())


def add_demo_content(project: Project, user_id: str) -> None:
    data = _demo_data()
    project.diagram = data["diagram"]
    for i, raw in enumerate(data["entries"]):
        fields = EntryFields.model_validate(raw).model_dump()
        project.entries.append(Entry(position=i, created_by=user_id, **fields))
