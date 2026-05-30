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
STRAPI_NODE_MODULES_SENTINEL="strapi-catalog/node_modules/@strapi/strapi/package.json"
STRAPI_BUILD_SENTINEL="strapi-catalog/dist/build/index.html"
STRAPI_SEED_MANIFEST_FILE="${STRAPI_SEED_MANIFEST_FILE:-/app/strapi-catalog/database/seed/seed-manifest.json}"
STRAPI_APPLIED_SEED_MARKER="${STRAPI_APPLIED_SEED_MARKER:-/app/data/strapi/.applied-seed-sha256}"

mkdir -p "$(dirname "$STRAPI_DB_FILE")"

apply_seed_to_runtime() {
  local reason="$1"
  if [[ ! -f "$STRAPI_SEED_DB_FILE" ]]; then
    echo "[boot] WARN: seed DB not found at ${STRAPI_SEED_DB_FILE} (${reason})"
    return 1
  fi
  echo "[boot] ${reason} — copying ${STRAPI_SEED_DB_FILE} → ${STRAPI_DB_FILE}"
  cp "$STRAPI_SEED_DB_FILE" "$STRAPI_DB_FILE"
  if [[ -f "$STRAPI_SEED_MANIFEST_FILE" ]]; then
    node -e "
      const fs = require('fs');
      const manifest = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
      fs.writeFileSync(process.argv[2], String(manifest.sha256 || '') + '\n', 'utf8');
    " "$STRAPI_SEED_MANIFEST_FILE" "$STRAPI_APPLIED_SEED_MARKER"
  fi
  return 0
}

maybe_apply_seed_from_manifest() {
  if [[ "${STRAPI_AUTO_APPLY_SEED:-1}" == "0" ]]; then
    return 0
  fi
  if [[ ! -f "$STRAPI_SEED_MANIFEST_FILE" || ! -f "$STRAPI_SEED_DB_FILE" ]]; then
    return 0
  fi
  local seed_sha applied_sha
  seed_sha="$(node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));process.stdout.write(String(m.sha256||''));" "$STRAPI_SEED_MANIFEST_FILE")"
  if [[ -z "$seed_sha" ]]; then
    return 0
  fi
  applied_sha=""
  if [[ -f "$STRAPI_APPLIED_SEED_MARKER" ]]; then
    applied_sha="$(tr -d '[:space:]' < "$STRAPI_APPLIED_SEED_MARKER")"
  fi
  if [[ "$seed_sha" == "$applied_sha" ]]; then
    echo "[boot] Strapi seed unchanged (manifest ${seed_sha:0:12}…)"
    return 0
  fi
  apply_seed_to_runtime "New seed manifest (${seed_sha:0:12}…, was ${applied_sha:-empty})"
}

if [[ ! -f "$STRAPI_NODE_MODULES_SENTINEL" ]]; then
  echo "[boot] Installing Strapi dependencies"
  npm install --prefix strapi-catalog --no-audit --fund=false --no-update-notifier --loglevel=error
fi

if [[ ! -f "$STRAPI_BUILD_SENTINEL" ]]; then
  echo "[boot] Building Strapi admin"
  npm run build --prefix strapi-catalog
fi

if [[ "${STRAPI_RESEED_ON_START:-}" == "1" ]]; then
  apply_seed_to_runtime "STRAPI_RESEED_ON_START=1"
elif [[ ! -s "$STRAPI_DB_FILE" ]]; then
  apply_seed_to_runtime "Empty runtime Strapi database"
else
  maybe_apply_seed_from_manifest
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
