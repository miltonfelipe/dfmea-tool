"""Admin commands.

    python -m app.cli create-user --username alice --name "Alice Smith" --role PM
    python -m app.cli reset-password --username alice

Passwords are prompted for (not passed as arguments, which would land in shell
history), or read from DFMEA_NEW_PASSWORD for scripted use.
"""
import argparse
import getpass
import os
import sys

from pydantic import ValidationError

from .config import Settings
from .db import make_engine, make_sessionmaker
from .models import Base, User
from .routers.users import find_by_username
from .schemas import UserCreate, UserUpdate
from .security import hash_password


def _password() -> str:
    if pw := os.environ.get("DFMEA_NEW_PASSWORD"):
        return pw
    pw = getpass.getpass("Password: ")
    if pw != getpass.getpass("Repeat password: "):
        sys.exit("Passwords do not match")
    return pw


def _fail(e: ValidationError):
    sys.exit("; ".join(f"{'.'.join(map(str, err['loc']))}: {err['msg']}" for err in e.errors()))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    c = sub.add_parser("create-user", help="create a user")
    c.add_argument("--username", required=True)
    c.add_argument("--name", help="full name (defaults to the username)")
    c.add_argument("--role", choices=["PM", "RV"], default="RV")
    r = sub.add_parser("reset-password", help="set a new password (ends the user's sessions)")
    r.add_argument("--username", required=True)
    args = parser.parse_args(argv)

    engine = make_engine(Settings(secret_key="unused-by-cli-commands-0000000000").database_url)
    Base.metadata.create_all(engine)
    with make_sessionmaker(engine)() as db:
        if args.command == "create-user":
            if find_by_username(db, args.username):
                sys.exit(f"User '{args.username}' already exists")
            try:
                data = UserCreate(name=args.name or args.username, username=args.username,
                                  password=_password(), role=args.role)
            except ValidationError as e:
                _fail(e)
            db.add(User(name=data.name, username=data.username, password_hash=hash_password(data.password),
                        role=data.role, color=data.color))
            db.commit()
            print(f"Created {data.role} '{data.username}'")
        else:
            user = find_by_username(db, args.username)
            if user is None:
                sys.exit(f"No user '{args.username}'")
            try:
                data = UserUpdate(password=_password())
            except ValidationError as e:
                _fail(e)
            user.password_hash = hash_password(data.password)
            db.commit()
            print(f"Password reset for '{user.username}'")
    engine.dispose()


if __name__ == "__main__":
    main()
