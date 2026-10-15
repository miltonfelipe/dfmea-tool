"""Request/response models. JSON uses the same camelCase field names as the React app."""
from datetime import datetime, timezone
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer
from pydantic.alias_generators import to_camel


def iso_utc(d: datetime) -> str:
    # SQLite returns naive datetimes; everything is stored as UTC.
    if d.tzinfo is None:
        d = d.replace(tzinfo=timezone.utc)
    return d.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


UtcDateTime = Annotated[datetime, PlainSerializer(iso_utc, return_type=str)]
Rating = Annotated[int, Field(ge=1, le=10)]
Role = Literal["PM", "RV"]
Status = Literal["Open", "Review", "Closed"]


class Schema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ── Auth / users ────────────────────────────────────────────────────────────

class LoginRequest(Schema):
    username: str
    password: str


class UserOut(Schema):
    id: str
    name: str
    username: str
    role: Role
    color: str
    active: bool


class TokenOut(Schema):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(Schema):
    name: str = Field(min_length=1, max_length=200)
    username: str = Field(min_length=1, max_length=100, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=6)
    role: Role = "RV"
    color: str = "#00d4ff"


class UserUpdate(Schema):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    password: str | None = Field(default=None, min_length=6)
    role: Role | None = None
    color: str | None = None
    active: bool | None = None


# ── Comments / history ─────────────────────────────────────────────────────

class CommentCreate(Schema):
    text: str = Field(min_length=1)


class CommentOut(Schema):
    id: str
    author_id: str | None
    text: str
    status: Literal["open", "resolved"]
    created_at: UtcDateTime
    resolved_by: str | None = None
    resolved_at: UtcDateTime | None = None


class HistoryOut(Schema):
    version: int
    edited_by: str | None
    edited_at: UtcDateTime
    diff: dict[str, Any]


# ── Entries ────────────────────────────────────────────────────────────────

class EntryFields(Schema):
    """Editable entry fields. Unknown keys (id, rpn, history, ...) are ignored,
    so the client can send a whole entry object back."""
    subsystem: str = ""
    component: str = ""
    function: str = ""
    failure_mode: str = ""
    failure_effect: str = ""
    failure_cause: str = ""
    category: str = ""
    severity: Rating = 5
    occurrence: Rating = 5
    detection: Rating = 5
    controls: str = ""
    action: str = ""
    responsible: str = ""
    due_date: str = Field(default="", pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    status: Status = "Open"
    revised_s: Rating = 5
    revised_o: Rating = 3
    revised_d: Rating = 3


class EntryCreate(EntryFields):
    pass


class EntryUpdate(Schema):
    # Same fields as EntryFields but all optional; `version` is the one the
    # client last saw (optimistic locking).
    version: int
    subsystem: str | None = None
    component: str | None = None
    function: str | None = None
    failure_mode: str | None = None
    failure_effect: str | None = None
    failure_cause: str | None = None
    category: str | None = None
    severity: Rating | None = None
    occurrence: Rating | None = None
    detection: Rating | None = None
    controls: str | None = None
    action: str | None = None
    responsible: str | None = None
    due_date: str | None = Field(default=None, pattern=r"^(\d{4}-\d{2}-\d{2})?$")
    status: Status | None = None
    revised_s: Rating | None = None
    revised_o: Rating | None = None
    revised_d: Rating | None = None


class EntryOut(EntryFields):
    id: str
    rpn: int
    revised_rpn: int = Field(alias="revisedRPN")
    version: int
    created_by: str | None
    created_at: UtcDateTime
    updated_at: UtcDateTime
    history: list[HistoryOut]
    comments: list[CommentOut]


# ── Projects ───────────────────────────────────────────────────────────────

class ProjectMeta(Schema):
    name: str = Field(min_length=1, max_length=200)
    product: str = ""
    revision: str = "A"
    team: str = ""
    description: str = ""


class ProjectCreate(ProjectMeta):
    demo: bool = False


class ProjectUpdate(Schema):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    product: str | None = None
    revision: str | None = None
    team: str | None = None
    description: str | None = None


class Diagram(Schema):
    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []


class ProjectSummary(ProjectMeta):
    id: str
    created_by: str | None
    created_at: UtcDateTime
    updated_at: UtcDateTime
    entry_count: int
    critical_count: int
    open_count: int
    comment_count: int
    open_comment_count: int


class ProjectOut(ProjectMeta):
    id: str
    created_by: str | None
    created_at: UtcDateTime
    updated_at: UtcDateTime
    diagram: Diagram | None
    entries: list[EntryOut]


# ── Import / export (.dfmea files) ─────────────────────────────────────────

class ImportComment(Schema):
    author_id: str | None = None
    text: str
    status: Literal["open", "resolved"] = "open"
    created_at: datetime | None = None
    resolved_by: str | None = None
    resolved_at: datetime | None = None


class ImportHistory(Schema):
    version: int
    edited_by: str | None = None
    edited_at: datetime | None = None
    diff: dict[str, Any] = {}


class ImportEntry(EntryFields):
    version: int = 1
    created_by: str | None = None
    created_at: datetime | None = None
    history: list[ImportHistory] = []
    comments: list[ImportComment] = []


class ImportProject(ProjectMeta):
    revision: str = ""
    diagram: Diagram | None = None
    entries: list[ImportEntry]


class DfmeaFile(BaseModel):
    format: Literal["DFMEA-v1", "DFMEA-v2"] = Field(alias="__format")
    project: ImportProject
