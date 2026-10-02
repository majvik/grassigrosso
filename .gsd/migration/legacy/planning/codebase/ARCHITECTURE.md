# Architecture

**Analysis Date:** 2026-08-03

## Pattern Overview

**Overall:** Multi-page marketing site with React islands over Vite HTML shells, plus a Node/Express public API that proxies Strapi catalog CMS feeds. Frontend never talks to Strapi directly.

**Key Characteristics:**
- HTML entry pages (`*.html`) provide shell (head, preloader, cookie banner, Yandex Metrika); React mounts into `[data-react-root]` via `data-react-page`
- Strapi holds catalog content (collections + single types); custom public feed controllers shape JSON for the site
- `server.cjs` owns all browser-facing APIs (`/api/catalog/*`, `/api/download-catalog/*`, `/api/submit`); Strapi admin/uploads are reverse-proxied
- Catalog listing runtime is imperative DOM modules under `src/catalog/*`, hydrated against React-rendered hook markup (`id` / `class` / `data-*`)
- Disk JSON snapshots in `public/` provide fallback when Strapi is down

## Layers

**HTML shell / MPA routing:**
- Purpose: Per-route static HTML documents with clean URLs; Vite multi-page build inputs
- Location: root `*.html`, `templates/marketing-page.html`, `vite.config.mjs` (`cleanHtmlRoutes`, `build.rollupOptions.input`)
- Contains: `<head>` SEO/meta, critical CSS slot, preloader, cookie banner, empty `<main data-react-root data-react-page="…">`, script `./src/main.js`
- Depends on: Vite build, `SITE_URL` / `%%SITE_ORIGIN%%` substitution
- Used by: Browser navigation; production static serve from `dist/` via `server.cjs` / nginx

**React page layer:**
- Purpose: Source of truth for page markup on migrated routes
- Location: `src/components/pages/*.tsx`, routed by `src/components/app/ReactIslandRoot.tsx`
- Contains: Marketing pages (`IndexPage`, `HotelsPage`, `DealersPage`, …), `CatalogPage`, `DownloadCatalogPage`, legal/service pages
- Depends on: `src/components/catalog-page/*`, `src/components/marketing/shared-page-sections.tsx`, `src/components/ui/*`
- Used by: `src/react-entry.tsx` (createRoot on each `[data-react-root]`)

**Legacy / shared client runtime:**
- Purpose: Cross-page behavior that is not React state (forms, modals, Lenis, maps, catalog DOM controllers)
- Location: `src/main.js`, `src/app-shell.js`, `src/contact-forms.js`, `src/page-*.js`, `src/catalog/*`, `src/catalog-hero-slider.js`
- Contains: Bootstrap, prefetch of catalog feeds, listing controllers, hero slider apply
- Depends on: DOM hooks from React pages; public `/api/*` only
- Used by: Every page via `main.js`

**Node public API (proxy + forms):**
- Purpose: Browser contract for catalog data, lead submit, media MIME/cache headers; hide Strapi
- Location: `server.cjs`, helpers in `lib/*.cjs`
- Contains: `GET /api/catalog/products|filters|hero-slides`, `GET /api/download-catalog/slides`, `POST /api/submit`, in-memory + disk-snapshot cache, proxy `/admin` `/uploads`
- Depends on: `STRAPI_URL` (and optional `STRAPI_TOKEN` for rare fallbacks), SMTP/Telegram env for leads
- Used by: Frontend fetch; production container alongside Strapi

**Strapi CMS:**
- Purpose: Authoring and storage for products, filter dictionaries, hero/download single types, help content
- Location: `strapi-catalog/`
- Contains: Collection types (`product`, filter option APIs), single types (`catalog-new-hero`, `download-catalog-page`), custom feed routes under `strapi-catalog/src/api/catalog/`
- Depends on: SQLite (`.tmp/data.db` local; seed `database/seed/data.db` in image), uploads in `strapi-catalog/public/uploads/`
- Used by: Only `server.cjs` (and Strapi admin UI via proxy)

**Static assets & snapshots:**
- Purpose: Marketing images, catalog media, offline catalog JSON fallbacks
- Location: `public/`, `strapi-catalog/public/uploads/`, `public/catalog-*.snapshot.json`, `public/download-catalog-slides.snapshot.json`
- Contains: Built into `dist/` / Docker image; snapshots written by `scripts/export-catalog-snapshot.mjs`
- Depends on: Build/export pipeline
- Used by: Browser (`/uploads/…`, `/assets/…`); `server.cjs` disk-snapshot fallback

## Data Flow

**Catalog listing (products + filters):**

1. `src/main.js` detects `data-page="catalog"`, dynamically imports catalog modules, calls `prefetchCatalogProductsFeed()` / `prefetchCatalogHeroFeed()` before React finish
2. Browser `fetch` → `GET /api/catalog/products` and `GET /api/catalog/filters` (`src/catalog/catalog-api.ts`)
3. `server.cjs` serves memory cache if fresh; else requests Strapi `GET /api/catalog-feed` and `GET /api/catalog-filter-feed` (+ share-help feed merged into filters)
4. On Strapi failure: memory stale → `public/*.snapshot.json` disk body → client may also try sessionStorage / client snapshot path in `catalog-api.ts`
5. `src/catalog/catalog-listing-controller.ts` renders cards into React-provided grid hooks, wires filters/modals

**Catalog / download-catalog hero slides:**

1. Prefetch: `prefetchCatalogHeroFeed()` or `prefetchDownloadCatalogFeed()` in `src/catalog-hero-slider.js`
2. Browser → `GET /api/catalog/hero-slides` or `GET /api/download-catalog/slides`
3. Node → Strapi `GET /api/catalog-hero-feed` or `GET /api/download-catalog-feed`
4. Feed controllers read single types `api::catalog-new-hero.catalog-new-hero` / `api::download-catalog-page.download-catalog-page`, normalize media, apply AVIF preference (`prefer-avif.js`)
5. Client `applyCatalogHeroFeed()` fills empty slide shells (slide 0 may have SSR/LCP fallback image in React)

**Download-catalog page pattern:**

1. `download-catalog.html` sets `data-page="download-catalog"` and `data-react-page="download-catalog"`
2. `ReactIslandRoot` renders `DownloadCatalogPage` (`src/components/pages/DownloadCatalogPage.tsx`) — slider shell + slide-0 LCP image only
3. `main.js` loads hero-slider module and `prefetchDownloadCatalogFeed()`
4. After React mount, `setupDownloadCatalogHero()` awaits feed, applies slides, honors `displayMode` (`slider` | `image_only`) from Strapi single type
5. Same hero slider DOM contract as catalog (`catalog-hero-slider`, `catalog-hero-slide`, dots/nav) — shared apply path, different feed URL

**Lead forms:**

1. Forms in React/marketing markup; `src/contact-forms.js` posts `POST /api/submit` with `page` from `getPageName()` (pathname slug, no `.html`)
2. `server.cjs` maps `page` via `PAGE_EMAIL_ROUTING` to SMTP recipients (+ `callback@` copy); optional Telegram
3. Client and server keys must stay in sync (`src/contact-forms.js` ↔ `PAGE_EMAIL_ROUTING`)

**State Management:**
- No global React store for catalog; listing state lives in `catalog-listing-controller` / module-level stores (`catalog-product-store.ts`, favourites in storage)
- React pages are mostly presentational markup + CSS Modules where needed
- Server: in-memory feed cache keyed by feed type; disk snapshots as cold fallback

## Key Abstractions

**Public catalog API (Node contract):**
- Purpose: Stable browser URLs independent of Strapi route names
- Examples: `server.cjs` handlers for `/api/catalog/products`, `/api/catalog/filters`, `/api/catalog/hero-slides`, `/api/download-catalog/slides`
- Pattern: Axios fetch to Strapi custom feeds → normalize → cache → JSON; never expose Strapi auth to the browser

**Strapi custom feeds:**
- Purpose: Transform CMS entities into front-ready payloads (AVIF URLs, flat filter groups, slide arrays)
- Examples: `strapi-catalog/src/api/catalog/controllers/catalog-feed.js`, `catalog-hero-feed.js`, `catalog-filter-feed.js`, `catalog-share-help-feed.js`, `download-catalog-feed.js`
- Pattern: Public `auth: false` routes under `strapi-catalog/src/api/catalog/routes/*`; controllers query content-types and return shaped `ctx.body`

**Strapi single types for page media:**
- Purpose: One editable document per slider/page config (not per-slide collection)
- Examples: `catalog-new-hero` schema, `download-catalog-page` schema (both use repeatable `catalog.hero-slide` component)
- Pattern: Admin edits single type → feed controller reads with populate → Node proxies to `/api/.../slides`

**React island routing:**
- Purpose: Map `data-react-page` string to page component; unknown page → `NotFoundPage` (no HTML blob fallback)
- Examples: `src/react-entry.tsx`, `src/components/app/ReactIslandRoot.tsx`
- Pattern: Strict page id switch; marketing pages in `src/components/pages/`

**Catalog DOM hook contract:**
- Purpose: Let imperative catalog runtime attach to React-rendered structure without CSS-module class coupling for behavior
- Examples: `src/components/catalog-page/hero.tsx`, `filters.tsx`, `cards.tsx`, `toolbar.tsx`; consumers in `src/catalog/*`
- Pattern: Stable global class names / `id` / `data-*` attributes; interactive hooks prefer `data-*`

**Disk snapshot fallback:**
- Purpose: Catalog still usable if Strapi is cold or unavailable
- Examples: `public/catalog-products.snapshot.json`, `catalog-filters.snapshot.json`, `catalog-hero.snapshot.json`, `download-catalog-slides.snapshot.json`, `CATALOG_DISK_SNAPSHOT_FILES` in `server.cjs`
- Pattern: Export via `npm run catalog:export-snapshot`; commit snapshots; server reads on miss

## Entry Points

**Browser page bootstrap:**
- Location: `src/main.js`
- Triggers: `<script type="module" src="./src/main.js">` on every HTML page
- Responsibilities: Preloader/fonts, Lenis shell, conditional React import, catalog/download prefetch, page interactions/forms, then `initCataloguePage` / hero setup

**React mount:**
- Location: `src/react-entry.tsx`
- Triggers: Dynamic import from `main.js` when `[data-react-root]` exists
- Responsibilities: `createRoot` + `ReactIslandRoot` per island node

**Page router (React):**
- Location: `src/components/app/ReactIslandRoot.tsx`
- Triggers: `dataset.reactPage` / `body.dataset.page`
- Responsibilities: Select `src/components/pages/*` component

**Node HTTP server:**
- Location: `server.cjs`
- Triggers: Container/`npm` start via `scripts/start-services.sh` (Strapi then Node) or local API process
- Responsibilities: Public APIs, static `dist`, Strapi proxy, email routing, media headers

**Strapi application:**
- Location: `strapi-catalog/` (`strapi start` / `develop`); bootstrap `strapi-catalog/src/index.js`
- Triggers: Same container start script; local develop
- Responsibilities: Admin CMS, seed/backfill dictionaries, register feeds, serve uploads

**Site route registry (metadata):**
- Location: `src/routes/routes.ts`
- Triggers: Tooling / nav helpers (not the React island switch itself)
- Responsibilities: Path, htmlFile, nav group; note `download-catalog` is wired in Vite/`ReactIslandRoot` even if omitted from `SITE_ROUTES`

## Error Handling

**Strategy:** Degrade gracefully on the catalog path (cache → snapshot → static SSR slide); hard-fail only when no data remains. Forms return HTTP errors from anti-spam / SMTP layers.

**Patterns:**
- Catalog client: try/catch around feed fetches; warn and keep SSR fallback slides (`catalog-hero-slider.js`)
- Node catalog handlers: on Strapi error, attempt disk snapshot; otherwise 502/503 JSON with empty arrays where appropriate
- React island: unknown `page` → `NotFoundPage`, not legacy HTML injection
- Forms: anti-spam in `lib/anti-spam.cjs`; queue/retry for outbound mail in `server.cjs`

## Cross-Cutting Concerns

**Logging:** `console` / Strapi logger; production Strapi stdout to `/tmp/strapi.log` via `scripts/start-services.sh`

**Validation:** Form spam/rate limits server-side; Strapi schema validates CMS input; feed controllers coerce arrays/numbers

**Authentication:** Strapi admin only (proxied `/admin`); public feeds are unauthenticated; browser has no Strapi token (`src/` has no `STRAPI_URL` / `VITE_STRAPI_*` usage)

**Caching:** `CATALOG_STRAPI_CACHE_TTL_MS` (default 45s in production) + stale window; immutable hashed assets / long-lived uploads via `applyMediaResponseHeaders` in `server.cjs`

**Email routing:** Dual map — `getPageName()` in `src/contact-forms.js` and `PAGE_EMAIL_ROUTING` in `server.cjs` must match exactly

---

*Architecture analysis: 2026-08-03*
