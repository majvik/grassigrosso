#!/usr/bin/env bash
set -euo pipefail

STRAPI_PORT="${STRAPI_PORT:-1337}"
STRAPI_HOST="${STRAPI_HOST:-0.0.0.0}"
STRAPI_DB_FILE="${STRAPI_DATABASE_FILENAME:-/app/data/strapi/data.db}"
STRAPI_SEED_DB_FILE="${STRAPI_SEED_DB_FILE:-/app/strapi-catalog/database/seed/data.db}"
STRAPI_START_TIMEOUT_SEC="${STRAPI_START_TIMEOUT_SEC:-180}"
STRAPI_START_MAX_ATTEMPTS="${STRAPI_START_MAX_ATTEMPTS:-3}"
APP_KEYS_VALUE="${APP_KEYS:-dev-app-key-1,dev-app-key-2}"
API_TOKEN_SALT_VALUE="${API_TOKEN_SALT:-dev-api-token-salt}"
ADMIN_JWT_SECRET_VALUE="${ADMIN_JWT_SECRET:-dev-admin-jwt-secret}"
TRANSFER_TOKEN_SALT_VALUE="${TRANSFER_TOKEN_SALT:-dev-transfer-token-salt}"
JWT_SECRET_VALUE="${JWT_SECRET:-dev-jwt-secret}"
ENCRYPTION_KEY_VALUE="${ENCRYPTION_KEY:-dev-encryption-key-32chars-min}"
STRAPI_TELEMETRY_DISABLED_VALUE="${STRAPI_TELEMETRY_DISABLED:-true}"
STRAPI_LOG_FILE="/tmp/strapi.log"

mkdir -p "$(dirname "$STRAPI_DB_FILE")"

if [[ ! -s "$STRAPI_DB_FILE" && -f "$STRAPI_SEED_DB_FILE" ]]; then
  echo "[boot] Seeding Strapi database from ${STRAPI_SEED_DB_FILE}"
  cp "$STRAPI_SEED_DB_FILE" "$STRAPI_DB_FILE"
fi

cleanup() {
  if [[ -n "${APP_PID:-}" ]] && kill -0 "$APP_PID" 2>/dev/null; then
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
  fi
  if [[ -n "${STRAPI_PID:-}" ]] && kill -0 "$STRAPI_PID" 2>/dev/null; then
    kill "$STRAPI_PID" 2>/dev/null || true
    wait "$STRAPI_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

start_strapi_once() {
  : > "$STRAPI_LOG_FILE"
  echo "[boot] Starting Strapi on ${STRAPI_HOST}:${STRAPI_PORT}"
  HOST="$STRAPI_HOST" PORT="$STRAPI_PORT" DATABASE_FILENAME="$STRAPI_DB_FILE" \
    APP_KEYS="$APP_KEYS_VALUE" API_TOKEN_SALT="$API_TOKEN_SALT_VALUE" ADMIN_JWT_SECRET="$ADMIN_JWT_SECRET_VALUE" \
    TRANSFER_TOKEN_SALT="$TRANSFER_TOKEN_SALT_VALUE" JWT_SECRET="$JWT_SECRET_VALUE" ENCRYPTION_KEY="$ENCRYPTION_KEY_VALUE" \
    STRAPI_TELEMETRY_DISABLED="$STRAPI_TELEMETRY_DISABLED_VALUE" \
    npm run start --prefix strapi-catalog >"$STRAPI_LOG_FILE" 2>&1 &
  STRAPI_PID=$!
}

wait_for_strapi_port() {
  echo "[boot] Waiting for Strapi TCP port ${STRAPI_PORT} (timeout ${STRAPI_START_TIMEOUT_SEC}s)"
  for i in $(seq 1 "$STRAPI_START_TIMEOUT_SEC"); do
    if ! kill -0 "$STRAPI_PID" 2>/dev/null; then
      echo "[boot] ERROR: Strapi process exited before becoming ready"
      echo "[boot] Strapi log tail:"
      node -e "const fs=require('fs');const p='${STRAPI_LOG_FILE}';try{const t=fs.readFileSync(p,'utf8');console.log(t.split('\n').slice(-120).join('\n'));}catch(e){console.log('[boot] (no strapi log available)')}"
      return 1
    fi

    if node -e "const n=require('net');const s=n.createConnection({host:'127.0.0.1',port:${STRAPI_PORT}});s.on('connect',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),500);" >/dev/null 2>&1; then
      echo "[boot] Strapi is ready"
      return 0
    fi

    sleep 1
  done

  echo "[boot] ERROR: Strapi did not open port ${STRAPI_PORT} within timeout"
  return 1
}

strapi_ready=false
for attempt in $(seq 1 "$STRAPI_START_MAX_ATTEMPTS"); do
  start_strapi_once
  if wait_for_strapi_port; then
    strapi_ready=true
    break
  fi
  echo "[boot] Strapi attempt ${attempt}/${STRAPI_START_MAX_ATTEMPTS} failed"
  if [[ -n "${STRAPI_PID:-}" ]] && kill -0 "$STRAPI_PID" 2>/dev/null; then
    kill "$STRAPI_PID" 2>/dev/null || true
    wait "$STRAPI_PID" 2>/dev/null || true
  fi
  if [ "$attempt" -lt "$STRAPI_START_MAX_ATTEMPTS" ]; then
    echo "[boot] Retrying Strapi startup in 3s..."
    sleep 3
  fi
done

if [ "$strapi_ready" != "true" ]; then
  echo "[boot] WARNING: Strapi is unavailable after ${STRAPI_START_MAX_ATTEMPTS} attempts; starting API/web server anyway"
fi

echo "[boot] Starting API/web server on :${PORT:-3000}"
node server.cjs &
APP_PID=$!
wait "$APP_PID"
