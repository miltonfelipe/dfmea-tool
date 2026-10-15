import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def new_id() -> str:
    return uuid.uuid4().hex


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200))
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(2))  # "PM" | "RV"
    color: Mapped[str] = mapped_column(String(16), default="#00d4ff")
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(200))
    product: Mapped[str] = mapped_column(String(200), default="")
    revision: Mapped[str] = mapped_column(String(50), default="")
    team: Mapped[str] = mapped_column(String(200), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    diagram: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    # Author/editor ids are plain strings (no FK) so imported files from other
    # installations keep their attribution.
    created_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    entries: Mapped[list["Entry"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="Entry.position"
    )

    def touch(self) -> None:
        self.updated_at = utcnow()


class Entry(Base):
    __tablename__ = "entries"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)

    subsystem: Mapped[str] = mapped_column(String(200), default="")
    component: Mapped[str] = mapped_column(String(200), default="")
    function: Mapped[str] = mapped_column(Text, default="")
    failure_mode: Mapped[str] = mapped_column(Text, default="")
    failure_effect: Mapped[str] = mapped_column(Text, default="")
    failure_cause: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(100), default="")
    severity: Mapped[int] = mapped_column(Integer, default=5)
    occurrence: Mapped[int] = mapped_column(Integer, default=5)
    detection: Mapped[int] = mapped_column(Integer, default=5)
    controls: Mapped[str] = mapped_column(Text, default="")
    action: Mapped[str] = mapped_column(Text, default="")
    responsible: Mapped[str] = mapped_column(String(200), default="")
    due_date: Mapped[str] = mapped_column(String(10), default="")  # "YYYY-MM-DD" or ""
    status: Mapped[str] = mapped_column(String(20), default="Open")
    revised_s: Mapped[int] = mapped_column(Integer, default=5)
    revised_o: Mapped[int] = mapped_column(Integer, default=3)
    revised_d: Mapped[int] = mapped_column(Integer, default=3)

    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project: Mapped[Project] = relationship(back_populates="entries")
    history: Mapped[list["EntryHistory"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan", order_by="EntryHistory.version"
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="entry", cascade="all, delete-orphan", order_by="Comment.created_at"
    )

    @property
    def rpn(self) -> int:
        return self.severity * self.occurrence * self.detection

    @property
    def revised_rpn(self) -> int:
        return self.revised_s * self.revised_o * self.revised_d


class EntryHistory(Base):
    __tablename__ = "entry_history"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    entry_id: Mapped[str] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"), index=True)
    version: Mapped[int] = mapped_column(Integer)
    edited_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
    edited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # {"fieldName": {"old": ..., "new": ...}} — same shape the front end renders.
    diff: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    entry: Mapped[Entry] = relationship(back_populates="history")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    entry_id: Mapped[str] = mapped_column(ForeignKey("entries.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    text: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(10), default="open")  # "open" | "resolved"
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    resolved_by: Mapped[str | None] = mapped_column(String(32), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    entry: Mapped[Entry] = relationship(back_populates="comments")
