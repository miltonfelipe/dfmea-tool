# DFMEA Tool — Backend

FastAPI + SQLAlchemy API that stores projects, entries, comments, history and users in a database, so several people can work on the same DFMEA. JSON uses the same camelCase field names as the React app (`failureMode`, `revisedRPN`, nested `comments`/`history`).

## Setup

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
```

## Run

```bash
cd backend
export DFMEA_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
export DFMEA_SEED_DEMO_USERS=true                  # development only: demo accounts
.venv/bin/uvicorn app.main:app --reload            # http://localhost:8000
```

- Interactive API docs: http://localhost:8000/docs
- If `../frontend/dist` exists (`cd frontend && npm run build`), the front end is also served at http://localhost:8000/

## Test

```bash
cd backend
.venv/bin/pytest
```

## Configuration (environment variables)

| Variable | Default | Notes |
|---|---|---|
| `DFMEA_DATABASE_URL` | `sqlite:///./dfmea.db` | Any SQLAlchemy URL (e.g. Postgres) |
| `DFMEA_SECRET_KEY` | random per process | JWT signing key, ≥ 32 bytes. Set it, or logins expire on every restart |
| `DFMEA_TOKEN_TTL_MINUTES` | `720` | Login lifetime |
| `DFMEA_SEED_DEMO_USERS` | `false` | `true` creates `alex/pm123` (PM), `sofia/rv123`, `bruno/rv456` (RV) when the user table is empty. Development only (`./dev.sh` turns it on) |
| `DFMEA_LOGIN_MAX_FAILURES` | `5` | Failed sign-ins per username + client IP before a lockout (the IP alone gets 4×) |
| `DFMEA_LOGIN_WINDOW_MINUTES` | `15` | Window for counting failures, and the lockout length |
| `DFMEA_MAX_BODY_BYTES` | `10485760` | Largest request body (10 MB); larger requests get `413` |
| `DFMEA_CORS_ORIGINS` | `http://localhost:5173` | Comma-separated; the Vite dev server |
| `DFMEA_STATIC_DIR` | `../frontend/dist` | Built front end to serve at `/` |

## API

All routes except `/api/health` and `/api/auth/login` need `Authorization: Bearer <token>`. PM = Project Manager only; any logged-in user otherwise.

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` → `{accessToken, user}` | — |
| GET | `/api/auth/me` | any |
| POST | `/api/auth/password` (`currentPassword`, `newPassword`) → new token | any |
| GET | `/api/users` | any |
| POST, PATCH | `/api/users`, `/api/users/{id}` | PM |
| GET | `/api/projects` (summaries with counts) | any |
| POST | `/api/projects` (`demo: true` adds sample data) | PM |
| GET | `/api/projects/{id}` (with entries, comments, history) | any |
| PATCH, DELETE | `/api/projects/{id}` | PM |
| PUT | `/api/projects/{id}/diagram` | PM |
| GET | `/api/projects/{id}/export` (`.dfmea` JSON) | any |
| POST | `/api/projects/import` | PM |
| POST | `/api/projects/{id}/entries` | PM |
| PATCH, DELETE | `/api/entries/{id}` | PM |
| POST | `/api/entries/{id}/comments` | any |
| POST | `/api/comments/{id}/resolve` | PM |

**Versioning:** `PATCH /api/entries/{id}` must include the `version` the client last loaded. If someone saved in between, it returns `409` instead of overwriting. When fields actually change, the server records a history row (`{field: {old, new}}`) and increments the version.

**Import:** accepts files exported by this API or by the browser-only app (`DFMEA-v1`/`DFMEA-v2`). IDs are regenerated; history, comments and authorship are kept.

## User administration

With demo accounts off, a new database has no users. Create the first Project Manager from the command line (the password is prompted for):

```bash
cd backend
.venv/bin/python -m app.cli create-user --username alice --name "Alice Smith" --role PM
.venv/bin/python -m app.cli reset-password --username alice     # e.g. if locked out of the UI
```

They use `DFMEA_DATABASE_URL` like the server. For scripts, set `DFMEA_NEW_PASSWORD` instead of typing the password.

## Security

- **Passwords:** argon2 hashes; new passwords need 8–128 characters. Users change their own with **🔑 Password**; a PM can reset others' through `PATCH /api/users/{id}`.
- **Sessions:** JWTs signed with `DFMEA_SECRET_KEY`. Changing or resetting a password ends that user's other sessions; disabling a user ends them all, immediately.
- **Sign-in protection:** 5 failures per username and client within 15 minutes lock that pair out (`429` with `Retry-After`). Unknown usernames take as long to reject as wrong passwords, and usernames are case-insensitive. The counters are in memory, per process: with several workers or servers, use a shared store. Behind a reverse proxy, start uvicorn with `--proxy-headers` (and `--forwarded-allow-ips`) so the real client IP is used.
- **Permissions** are enforced on the server for every request; the UI only hides buttons.
- **Input limits:** 200 characters for short fields (names, components, …), 5000 for long text and comments, 500 diagram blocks / 2000 connections, 10 MB per request.
- **Headers:** Content Security Policy (own scripts only, Google Fonts for styles), no framing, `nosniff`, `no-referrer`, and `no-store` on API responses. `/docs` has no CSP because Swagger loads from a CDN.
- **HTTPS:** run behind a TLS-terminating proxy (nginx, Caddy, …) in production; tokens are bearer credentials. Add `Strict-Transport-Security` at the proxy.

## Notes

- Tables are created on startup (`create_all`). Add Alembic before changing the schema of a database with real data.
- `app/demo_data.json` holds the demo entries and diagram used by `POST /api/projects` with `demo: true`. Its diagram is also in `frontend/src/data/defaults.js` (`DEMO_DIAGRAM`, for the diagram's "load demo" button); keep the two in sync.
