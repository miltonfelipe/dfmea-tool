# DFMEA Tool

A web-based Design Failure Mode and Effects Analysis (DFMEA) tool for electronics and industrial machinery projects.

- **Worksheet**: failure modes with Severity / Occurrence / Detection ratings, RPN and revised RPN, actions, owners and status
- **Block diagram**: drag-and-drop system diagram linked to subsystems
- **Dashboard**: risk matrix, RPN statistics and per-subsystem summary
- **Review**: per-entry comments and version history
- **Roles**: Project Manager (edit) and Reviewer (comment)
- **Import / export**: projects as `.dfmea` (JSON) files, worksheet as CSV

React 19 + Vite front end and a FastAPI backend that stores everything in a database, so a team works on the same projects. Only the light/dark theme is kept in the browser.

## Project layout

```
dfmea-tool/
├── frontend/    React app (Vite): src/, public/, package.json
└── backend/     FastAPI app: app/, tests/, requirements.txt
```

## Running the app

You run two processes in two terminals: the Python backend and the React front end.

**Terminal 1: backend** (http://localhost:8000, interactive API docs at http://localhost:8000/docs)

```bash
cd backend
python3 -m venv .venv                          # first time only
.venv/bin/pip install -r requirements-dev.txt  # first time only
export DFMEA_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')
.venv/bin/uvicorn app.main:app --reload
```

**Terminal 2: front end**

```bash
cd frontend
npm install      # first time only
npm run dev
```

Open **http://localhost:5173** and sign in. The dev server forwards `/api` requests to the backend.

| User | Password | Role |
|---|---|---|
| `alex` | `pm123` | Project Manager (can edit) |
| `sofia` | `rv123` | Reviewer (comments only) |
| `bruno` | `rv456` | Reviewer (comments only) |

The backend creates these accounts the first time it starts on an empty database.

**Good to know:**

- **Your data:** it's saved in `backend/dfmea.db`. Delete that file to start fresh.
- **Logins after a restart:** the `export` above makes a new random key each time, so every backend restart logs everyone out. To stay logged in across restarts, generate a key once and reuse the same value.
- **Trying several users:** open a second browser window (or a private window) and log in as someone else to see shared data and comments.
- **Configuration:** all backend settings are environment variables, listed in [backend/README.md](backend/README.md).

Other commands, from the repo root:

```bash
(cd frontend && npm run build)      # production build to frontend/dist/
(cd frontend && npm run lint)
(cd backend && .venv/bin/pytest)
```

## Production

Build the front end, then run only the backend. It serves both the app and the API from one process:

```bash
(cd frontend && npm run build)
cd backend
DFMEA_SECRET_KEY=<your-key> DFMEA_SEED_DEMO_USERS=false .venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Everything (front end at `/`, API at `/api`) is then served at http://localhost:8000. `DFMEA_SEED_DEMO_USERS=false` stops the demo accounts from being created.

## Moving data from the browser-only version

Earlier versions kept projects in browser `localStorage`. In the old version, open each project and use **Export .dfmea**, then **Import** the files here as a Project Manager. Comments and version history are kept.
