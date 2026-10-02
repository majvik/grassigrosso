# External Integrations

**Analysis Date:** 2026-08-03

## APIs & External Services

**Lead delivery (forms):**
- Telegram Bot API — notify operators on form submit
  - SDK/Client: `axios` → `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`
  - Auth: `BOT_TOKEN`, `CHAT_ID` (comma-separated chat IDs supported in `server.cjs`)
  - Entry: `POST /api/submit` → `sendLeadToTelegram` in `server.cjs`
  - Dev helper: `GET /api/get-chat-id` uses `getUpdates` when not production

- SMTP email (typically Yandex) — lead routing + user confirmation
  - SDK/Client: `nodemailer` (`createMailTransport` in `server.cjs`)
  - Auth: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`
  - Routing map: `PAGE_EMAIL_ROUTING` in `server.cjs` (must stay in sync with `getPageName()` in `src/contact-forms.js`)
  - Always CC: `callback@grassigrosso.com`
  - Confirmation HTML: `lib/confirmation-email.cjs` (unsubscribe HMAC via `UNSUBSCRIBE_SECRET` or `BOT_TOKEN`)
  - Diag: `GET /api/smtp-diag` (non-prod / operational use in `server.cjs`)

**Catalog CMS (internal HTTP, not browser-direct):**
- Strapi 5 feed endpoints consumed only by Node proxy
  - Client: `axios` / Node `fetch` from `server.cjs` to `STRAPI_URL`
  - Optional auth: `STRAPI_TOKEN` (Bearer) if protected endpoints enabled
  - Upstream feeds:
    - `GET ${STRAPI_URL}/api/catalog-feed` → public `GET /api/catalog/products`
    - `GET ${STRAPI_URL}/api/catalog-hero-feed` → `GET /api/catalog/hero-slides`
    - `GET ${STRAPI_URL}/api/catalog-filter-feed` (+ share-help feed) → `GET /api/catalog/filters`
    - `GET ${STRAPI_URL}/api/download-catalog-feed` → `GET /api/download-catalog/slides`
  - Controllers: `strapi-catalog/src/api/catalog/controllers/*.js`
  - AVIF rewrite: `strapi-catalog/src/api/catalog/utils/prefer-avif.js`

**Maps:**
- Yandex Maps JS API 2.1 — contacts page map
  - SDK/Client: script load in `src/contacts-maps.js` → `https://api-maps.yandex.ru/2.1/?lang=ru_RU`
  - Auth: `VITE_YANDEX_MAPS_API_KEY` (baked at Vite/Docker build)

**Analytics:**
- Yandex.Metrika — counter id `107738086` embedded in marketing HTML templates
  - Script: `https://mc.yandex.ru/metrika/tag.js`
  - No server-side SDK

**Frontend → backend contract:**
- Forms POST to `VITE_API_URL` or default `/api/submit` (`src/contact-forms.js`, `src/commercial-offer.js`, `src/resource-modals.js`)
- Catalog client: `src/catalog/catalog-api.ts` → `/api/catalog/*` only (never Strapi origin)

## Data Storage

**Databases:**
- SQLite (leads) via `better-sqlite3`
  - Connection: `DB_PATH` or default `./data/leads.db` (`lib/db.cjs`)
  - Tables: `leads` with status/retry fields; WAL mode
  - Retry queue: SQLite-backed delivery with interval `QUEUE_RETRY_INTERVAL_MS` (legacy file path `QUEUE_FILE_PATH` still referenced)

- SQLite (Strapi catalog) via `better-sqlite3`
  - Connection: `DATABASE_FILENAME` / `STRAPI_DATABASE_FILENAME` (`strapi-catalog/config/database.js`)
  - Local default: `strapi-catalog/.tmp/data.db`
  - Docker runtime: `/app/data/strapi/data.db` (volume)
  - Seed in git: `strapi-catalog/database/seed/data.db` + `seed-manifest.json`
  - Config also defines mysql/postgres clients but production path uses sqlite

**File Storage:**
- Local filesystem only (no S3/CDN SDK)
  - Catalog media: `strapi-catalog/public/uploads/` (committed, served as `/uploads/*` via Node/nginx proxy)
  - Downloadable PDFs: `public/documents/`, `dist/documents/`, or volume `data/documents/` (`DOWNLOAD_FILE_ROUTING` in `server.cjs`)
  - Catalog disk snapshots: `public/catalog-*.snapshot.json`, `public/catalog-snapshot.manifest.json`, `public/download-catalog-slides.snapshot.json` (copied into `dist/` on build)

**Caching:**
- In-memory Map in `server.cjs` for `GET /api/catalog/*` (`CATALOG_STRAPI_CACHE_TTL_MS`, stale window `CATALOG_STRAPI_STALE_MS`)
- Fallback chain: fresh cache → stale cache → disk snapshot JSON under `dist/`/`public/`
- Response header `X-Catalog-Source` indicates source
- Static Cache-Control via `applyMediaResponseHeaders` in `server.cjs` (hashed assets immutable; uploads 30d; HTML no-cache)
- nginx gzip for JSON/JS/CSS (`nginx.conf`)

## Authentication & Identity

**Auth Provider:**
- Strapi Admin + Users & Permissions plugin (`@strapi/plugin-users-permissions`)
  - Implementation: Strapi JWT (`ADMIN_JWT_SECRET`, `JWT_SECRET`, `APP_KEYS`, salts) set via env / `start-services.sh` defaults
  - Browser accesses admin at `/admin` → nginx → Node `http-proxy-middleware` → `STRAPI_URL` (`127.0.0.1:1337`)
  - `STRAPI_PUBLIC_URL` must match public site origin so admin links work behind proxy

**Public site:**
- No end-user login for marketing pages
- Form anti-spam: `lib/anti-spam.cjs` (rate limits / field length; env `SPAM_*`)
- Unsubscribe: HMAC token on `GET /api/unsubscribe` (`lib/confirmation-email.cjs`)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry/Datadog SDK detected)

**Logs:**
- `console.log` / `console.error` in `server.cjs` for mail/Telegram/catalog failures
- Strapi stdout redirected to `/tmp/strapi.log` by `scripts/start-services.sh`
- Docker `HEALTHCHECK` hits `GET /health` (includes app version from `APP_VERSION` / `GIT_SHA`)

**Telemetry:**
- Strapi telemetry disabled by default in container (`STRAPI_TELEMETRY_DISABLED=true`)

## CI/CD & Deployment

**Hosting:**
- Timeweb App Platform (Docker from repo `Dockerfile`)
- Edge: Timeweb nginx using project `nginx.conf` (API/admin/uploads → Node :3000; static `/app/dist`)
- Optional local compose: `docker-compose.yml` (+ `docker-compose.override.example.yml` for uploads bind-mount)

**CI Pipeline:**
- Platform-native build on git push (no `.github/workflows` in repo)
- Image build: `npm ci` → Vite build (with Yandex Maps build-arg) → Strapi build → prune → runtime stage
- Boot: `scripts/start-services.sh` — seed apply by manifest hash → start Strapi → start `server.cjs`

**Catalog content deploy path:**
1. Edit in local Strapi admin / import scripts
2. `npm run strapi:sync-seed` → commit seed + uploads
3. `npm run catalog:export-snapshot` → commit `public/catalog-*.snapshot.json` + manifest
4. `git push` → Timeweb rebuild; seed auto-applies if manifest SHA changed (`STRAPI_AUTO_APPLY_SEED`, force via `STRAPI_RESEED_ON_START=1`)

## Environment Configuration

**Required env vars (production-critical):**
- `BOT_TOKEN`, `CHAT_ID`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO`
- `SITE_URL`, `CORS_ALLOWED_ORIGINS`, `PORT`, `NODE_ENV`
- `STRAPI_URL`, `STRAPI_PUBLIC_URL`, `STRAPI_BEHIND_PROXY`
- Strapi secrets: `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY`
- Recommended: `CATALOG_STRAPI_CACHE_TTL_MS=45000`

**Optional / tooling:**
- `STRAPI_TOKEN`, `DB_PATH`, `QUEUE_*`, `SPAM_*`, `UNSUBSCRIBE_SECRET`
- `STRAPI_DATABASE_FILENAME`, `STRAPI_RESEED_ON_START`, `STRAPI_AUTO_APPLY_SEED`
- `VITE_API_URL`, `VITE_YANDEX_MAPS_API_KEY` / Docker `YANDEX_MAPS_BROWSER_ARG`
- Smoke overrides: `CATALOG_API_BASE_URL`, `CATALOG_UI_BASE_URL`, `CATALOG_PERF_BASE_URL`

**Secrets location:**
- Local: root `.env` + `strapi-catalog/.env` (gitignored)
- Production: Timeweb App Platform environment panel (names match `.env.example`)
- Templates only in git: `.env.example`, `strapi-catalog/.env.example`

## Webhooks & Callbacks

**Incoming:**
- None dedicated (no Stripe/payment webhooks)
- Public HTTP API on same host:
  - `POST /api/submit` — form leads
  - `GET /api/unsubscribe` — email unsubscribe
  - `GET /api/download/:docId` — document download
  - `GET /api/catalog/*`, `GET /api/download-catalog/slides` — catalog JSON
  - `GET /health` — liveness

**Outgoing:**
- Telegram `sendMessage` on lead accept / retry
- SMTP `sendMail` to routed inboxes + optional user confirmation
- Server → Strapi feed GETs (and reverse-proxy of browser `/admin`, `/uploads`, other Strapi paths)

**Proxy surface (browser → Node → Strapi):**
- Prefixes: `/admin`, `/upload`, `/uploads`, `/content-manager`, `/content-type-builder`, `/i18n`, `/documentation`
- Non-internal `/api/*` also proxied to Strapi in production (`INTERNAL_API_PREFIXES` reserved for Node handlers)

---

*Integration audit: 2026-08-03*
