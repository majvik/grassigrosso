#!/usr/bin/env bash
set -euo pipefail

STRAPI_PORT="${STRAPI_PORT:-1337}"
STRAPI_HOST="${STRAPI_HOST:-0.0.0.0}"
STRAPI_DB_FILE="${STRAPI_DATABASE_FILENAME:-/app/data/strapi/data.db}"
APP_KEYS_VALUE="${APP_KEYS:-dev-app-key-1,dev-app-key-2}"
API_TOKEN_SALT_VALUE="${API_TOKEN_SALT:-dev-api-token-salt}"
ADMIN_JWT_SECRET_VALUE="${ADMIN_JWT_SECRET:-dev-admin-jwt-secret}"
TRANSFER_TOKEN_SALT_VALUE="${TRANSFER_TOKEN_SALT:-dev-transfer-token-salt}"
JWT_SECRET_VALUE="${JWT_SECRET:-dev-jwt-secret}"
ENCRYPTION_KEY_VALUE="${ENCRYPTION_KEY:-dev-encryption-key-32chars-min}"

mkdir -p "$(dirname "$STRAPI_DB_FILE")"

cleanup() {
  if [[ -n "${STRAPI_PID:-}" ]] && kill -0 "$STRAPI_PID" 2>/dev/null; then
    kill "$STRAPI_PID" 2>/dev/null || true
    wait "$STRAPI_PID" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

echo "[boot] Starting Strapi on ${STRAPI_HOST}:${STRAPI_PORT}"
HOST="$STRAPI_HOST" PORT="$STRAPI_PORT" DATABASE_FILENAME="$STRAPI_DB_FILE" \
  APP_KEYS="$APP_KEYS_VALUE" API_TOKEN_SALT="$API_TOKEN_SALT_VALUE" ADMIN_JWT_SECRET="$ADMIN_JWT_SECRET_VALUE" \
  TRANSFER_TOKEN_SALT="$TRANSFER_TOKEN_SALT_VALUE" JWT_SECRET="$JWT_SECRET_VALUE" ENCRYPTION_KEY="$ENCRYPTION_KEY_VALUE" \
  npm run start --prefix strapi-catalog &
STRAPI_PID=$!

echo "[boot] Starting API/web server on :${PORT:-3000}"
node server.cjs
