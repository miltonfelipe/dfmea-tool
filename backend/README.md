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
.venv/bin/uvicorn app.main:app --reload            # http://localhost:8000
```

- Interactive API docs: http://localhost:8000/docs
- If `../dist` exists (`npm run build`), the front end is also served at http://localhost:8000/

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
| `DFMEA_SEED_DEMO_USERS` | `true` | Creates `alex/pm123` (PM), `sofia/rv123`, `bruno/rv456` (RV) when the user table is empty. **Set to `false` in production** |
| `DFMEA_CORS_ORIGINS` | `http://localhost:5173` | Comma-separated; the Vite dev server |
| `DFMEA_STATIC_DIR` | `../dist` | Built front end to serve at `/` |

## API

All routes except `/api/health` and `/api/auth/login` need `Authorization: Bearer <token>`. PM = Project Manager only; any logged-in user otherwise.

| Method | Path | Role |
|---|---|---|
| POST | `/api/auth/login` → `{accessToken, user}` | — |
| GET | `/api/auth/me` | any |
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

## Notes

- Tables are created on startup (`create_all`). Add Alembic before changing the schema of a database with real data.
- `app/demo_data.json` holds the demo entries and diagram used by `POST /api/projects` with `demo: true`. Its diagram is also in `src/data/defaults.js` (`DEMO_DIAGRAM`, for the diagram's "load demo" button); keep the two in sync.
