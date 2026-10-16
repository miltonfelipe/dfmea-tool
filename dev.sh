#!/usr/bin/env bash
# Start the backend (FastAPI) and frontend (Vite) together for development.
# Ctrl+C stops both. Ports can be changed: API_PORT=8001 WEB_PORT=5174 ./dev.sh
set -euo pipefail
cd "$(dirname "$0")"

API_PORT="${API_PORT:-8000}"
WEB_PORT="${WEB_PORT:-5173}"
export API_PORT

port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
for p in "$API_PORT" "$WEB_PORT"; do
  if port_in_use "$p"; then
    echo "Port $p is already in use (another dev server running?). Stop it, or pick other ports:" >&2
    echo "  API_PORT=8001 WEB_PORT=5174 ./dev.sh" >&2
    exit 1
  fi
done

# First-time setup
if [ ! -x backend/.venv/bin/uvicorn ]; then
  echo "Setting up backend/.venv ..."
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install -q -r backend/requirements-dev.txt
fi
if [ ! -d frontend/node_modules ]; then
  echo "Installing frontend dependencies ..."
  (cd frontend && npm install)
fi

# Keep one dev signing key so logins survive backend restarts.
KEY_FILE=backend/.dev-secret-key
if [ -z "${DFMEA_SECRET_KEY:-}" ]; then
  if [ ! -s "$KEY_FILE" ]; then
    (umask 077 && python3 -c 'import secrets; print(secrets.token_urlsafe(32))' > "$KEY_FILE")
  fi
  DFMEA_SECRET_KEY="$(cat "$KEY_FILE")"
fi
export DFMEA_SECRET_KEY
# Demo accounts (alex/pm123, ...) on a new database. Development only.
export DFMEA_SEED_DEMO_USERS="${DFMEA_SEED_DEMO_USERS:-true}"

# Each server runs in its own process group (job control on), so cleanup
# stops exactly those processes, including uvicorn's reloader and npx's node.
set -m
cleanup() {
  trap - EXIT INT TERM
  for pg in $(jobs -p); do
    kill -TERM -- "-$pg" 2>/dev/null || true
    kill -CONT -- "-$pg" 2>/dev/null || true  # deliver TERM even if stopped
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# stdin from /dev/null: background jobs that read the terminal get stopped
# (SIGTTIN); Vite reads it for keyboard shortcuts.
(cd backend && exec .venv/bin/uvicorn app.main:app --reload --port "$API_PORT") < /dev/null 2>&1 | sed -u 's/^/[api] /' &
(cd frontend && exec npx vite --port "$WEB_PORT" --strictPort) < /dev/null 2>&1 | sed -u 's/^/[web] /' &

echo "Backend:  http://localhost:$API_PORT  (API docs: /docs)"
echo "Frontend: http://localhost:$WEB_PORT  <- open this"
echo "Press Ctrl+C to stop both."

# If either server exits, stop the other too.
wait -n
