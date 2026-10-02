# Technology Stack

**Analysis Date:** 2026-08-03

## Languages

**Primary:**
- JavaScript (CommonJS + ESM) — Vite app entry (`src/main.js`), Express API (`server.cjs`), shared libs (`lib/*.cjs`), Node scripts (`scripts/*.mjs`)
- TypeScript (strict, `noEmit`) — React islands, catalog runtime modules (`src/**/*.ts`, `src/**/*.tsx`); check via `npm run typecheck`
- JSX/TSX — React page layer under `src/components/`

**Secondary:**
- Python 3.14 — catalog import tooling (`scripts/build-catalog-import.py`)
- Bash — production boot (`scripts/start-services.sh`)
- CSS / CSS Modules — design tokens (`src/styles/tokens.css`), page modules, global `src/style.css`
- HTML multi-page entrypoints — root `*.html` (Vite MPA inputs)
- nginx config — edge routing (`nginx.conf`) for Timeweb

## Runtime

**Environment:**
- Node.js 22 (Docker base `node:22-slim`; local observed `v22.19.0`)
- Strapi engines: Node `>=20.0.0 <=24.x.x` (`strapi-catalog/package.json`)
- npm 10.x (lockfile v3)

**Package Manager:**
- npm (two packages: root + `strapi-catalog/`)
- Lockfiles: `package-lock.json`, `strapi-catalog/package-lock.json` (both present)

## Frameworks

**Core:**
- Vite 7.x (`^7.2.4`, lock `7.3.1`) — MPA build, React plugin, clean-URL + critical-CSS plugins (`vite.config.mjs`)
- React 19.2.x — island hydration via `[data-react-root]` (`src/react-entry.tsx`)
- `@base-ui/react` ^1.4.1 — UI primitives (`src/components/ui/*`)
- Express 4.x — production/dev API + static/proxy host (`server.cjs`)
- Strapi 5.42.1 — catalog CMS (`strapi-catalog/`)

**Testing:**
- No unit-test framework in root `package.json`
- Smoke/contract scripts: `scripts/check-catalog-api.mjs`, `scripts/check-catalog-ui.mjs`, `scripts/check-catalog-perf.mjs`, `scripts/check-routing-contracts.mjs`
- Typecheck: TypeScript 6.x (`tsc --noEmit`)

**Build/Dev:**
- `@vitejs/plugin-react` ^5.2.0
- `concurrently` + `kill-port` — `npm run dev:all` (Strapi :1337, API :3000, Vite :5174)
- `sharp` — AVIF/media optimize (`scripts/optimize-catalog-uploads.mjs`)
- Docker multi-stage build (`Dockerfile`) — build web + Strapi, prune devDeps, run `start-services.sh`

## Key Dependencies

**Critical:**
- `express` — HTTP API, static `dist/`, Strapi/Vite proxy
- `http-proxy-middleware` — proxy `/admin`, `/uploads`, Strapi `/api/*` (non-internal), and in dev → Vite :5174
- `axios` — Telegram Bot API + Strapi feed fetches from `server.cjs`
- `nodemailer` — SMTP lead + confirmation mail
- `better-sqlite3` — leads DB (`lib/db.cjs`) and Strapi SQLite
- `react` / `react-dom` — island UI
- `@strapi/strapi` 5.42.1 + `@strapi/plugin-users-permissions` + `@strapi/plugin-cloud` — CMS admin + content API
- `dotenv` — env loading for `server.cjs`

**Frontend UX:**
- `gsap` — motion
- `lenis` — smooth scroll (`src/main.js`)
- `lucide-react`, `clsx`, `class-variance-authority` — icons / class utilities

**Infrastructure:**
- `cors` — origin allowlist (`lib/cors-config.cjs`)
- Native `fetch` in Node scripts (snapshot export, checks)

## Configuration

**Environment:**
- Root `.env` (gitignored); template `.env.example`
- Strapi local `.env` in `strapi-catalog/` (gitignored); template `strapi-catalog/.env.example`
- Production secrets on Timeweb App Platform panel (same var names as `.env.example`); `strapi-catalog/.env` is not copied into the image (`.dockerignore`)

**Key configs required:**
- Forms: `BOT_TOKEN`, `CHAT_ID`, `SMTP_*`, `MAIL_FROM`, `MAIL_TO`
- Site: `SITE_URL`, `CORS_ALLOWED_ORIGINS`, `PORT`, `NODE_ENV`
- Strapi link: `STRAPI_URL`, `STRAPI_PUBLIC_URL`, `STRAPI_BEHIND_PROXY`, Strapi secrets (`APP_KEYS`, `JWT_SECRET`, …)
- Catalog cache: `CATALOG_STRAPI_CACHE_TTL_MS` (prod default 45s), `CATALOG_STRAPI_STALE_MS`
- Build-time front: `VITE_API_URL`, `VITE_YANDEX_MAPS_API_KEY` (Docker build-arg `YANDEX_MAPS_BROWSER_ARG`)

**Build:**
- `vite.config.mjs` — MPA `rollupOptions.input`, alias `@` → `src/`, proxy `/api` + `/uploads` → `DEV_API_PORT` (default 3000)
- `tsconfig.json` — ES2022, `jsx: react-jsx`, path `@/*`
- `Dockerfile` — Node 22, `npm run build` + Strapi build, `CMD scripts/start-services.sh`
- `docker-compose.yml` — single `web` service, volume `grassigrosso-data` → `/app/data`
- `nginx.conf` — gzip, `/api` + Strapi paths → `:3000`, static from `/app/dist`
- Strapi: `strapi-catalog/config/{database,server,middlewares,plugins,admin,api}.js`

## Platform Requirements

**Development:**
- Node 20–24, npm 6+
- Ports: Vite `5174`, API `3000`, Strapi `1337`
- Optional Chrome for `check:catalog-ui` (headless)
- Python 3 for `catalog-import:build`
- Local stack: `npm run dev:all` or split `dev:strapi` / `dev:api` / `dev:web`

**Production:**
- Timeweb App Platform — git push → Docker build from `Dockerfile` → container
- Process model: `start-services.sh` starts Strapi then `node server.cjs` on `PORT` (default 3000)
- Persistent volume: `/app/data` (leads SQLite, Strapi runtime DB, documents)
- Seed: `strapi-catalog/database/seed/data.db` + `seed-manifest.json` applied on start when hash changes
- Media: `strapi-catalog/public/uploads/` committed and copied into the image
- Health: `GET /health` (Docker `HEALTHCHECK`)

---

*Stack analysis: 2026-08-03*
