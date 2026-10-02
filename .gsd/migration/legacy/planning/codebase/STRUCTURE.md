# Codebase Structure

**Analysis Date:** 2026-08-03

## Directory Layout

```
grassigrosso/
├── *.html                      # MPA entry shells (Vite inputs)
├── templates/                  # marketing-page.html scaffold for new pages
├── public/                     # Static assets + catalog JSON snapshots
├── src/                        # Frontend source (JS/TS/React/CSS)
│   ├── main.js                 # Page bootstrap entry
│   ├── react-entry.tsx         # React island mount
│   ├── catalog/                # Catalog listing/runtime modules
│   ├── components/
│   │   ├── pages/              # React page components (source of truth)
│   │   ├── catalog-page/       # Catalog JSX sections (hero/filters/cards/…)
│   │   ├── marketing/          # Shared Contact/FAQ sections
│   │   ├── app/                # ReactIslandRoot
│   │   └── ui/                 # Base UI primitives + CSS Modules
│   ├── routes/                 # SITE_ROUTES metadata
│   ├── styles/                 # Design tokens + global CSS layers
│   └── contracts/              # Shared TS contracts (e.g. leads)
├── server.cjs                  # Express public API + static + Strapi proxy
├── lib/                        # Node helpers (cors, anti-spam, db, email)
├── strapi-catalog/             # Strapi CMS app (feeds, content-types, uploads)
│   ├── src/api/                # Content-types + custom catalog feeds
│   ├── public/uploads/         # Committed catalog media
│   └── database/seed/          # Seed SQLite + manifest for deploy
├── scripts/                    # Build/ops: start, snapshot, checks, new-page
├── docs/                       # Migration notes, superpowers specs/plans
├── nginx.conf                  # Primary production routing (gzip, /uploads)
├── Dockerfile                  # Multi-stage: Vite + Strapi build → runtime
└── .planning/codebase/         # GSD codebase maps (this folder)
```

## Directory Purposes

**Root HTML (`*.html`):**
- Purpose: One document per public route; clean-path twin registered in `vite.config.mjs`
- Contains: Shell markup; `body[data-page]`; `<main data-react-root data-react-page="…">`
- Key files: `index.html`, `catalog.html`, `download-catalog.html`, `hotels.html`, `dealers.html`, `contacts.html`, `documents.html`, legal/service HTML

**`src/components/pages/`:**
- Purpose: React page-layer for all migrated marketing/catalog routes — edit here, not legacy string HTML blobs
- Contains: `*Page.tsx`, page-local CSS Modules (`download-catalog.module.css`, `service-page.module.css`), `legal-content.tsx`, `catalog-page-data.ts`
- Key files: `CatalogPage.tsx`, `DownloadCatalogPage.tsx`, `IndexPage.tsx`, `HotelsPage.tsx`, `DealersPage.tsx`, `ContactsPage.tsx`, `DocumentsPage.tsx`, `LegalPage.tsx`

**`src/components/catalog-page/`:**
- Purpose: Split catalog JSX (hero, filters, cards, toolbar, layout) keeping DOM hooks for `src/catalog/*`
- Contains: Presentational React sections only
- Key files: `layout.tsx`, `hero.tsx`, `filters.tsx`, `cards.tsx`, `toolbar.tsx`

**`src/components/marketing/`:**
- Purpose: Shared full-width sections reused across marketing pages
- Contains: Contact form blocks, FAQ accordion markup with `data-*` hooks
- Key files: `shared-page-sections.tsx`

**`src/components/ui/`:**
- Purpose: Base UI primitives (`@base-ui/react` wrappers) + CSS Modules
- Contains: Button, Dialog, Input, Select, Sheet, Tabs, etc.; barrel `index.ts`
- Key files: `Button.tsx`, `Dialog.tsx`, `ui.module.css`

**`src/catalog/`:**
- Purpose: Catalog runtime after React paints — listing, filters DOM, modals, favourites, galleries
- Contains: `.ts` / `.js` modules; `catalog-page.js` is bootstrap only
- Key files: `catalog-api.ts` (public `/api/catalog/*` client), `catalog-listing-controller.ts`, `catalog-modals-bootstrap.ts`, `catalog-hero.ts`, `catalog-page.js`

**`strapi-catalog/src/api/`:**
- Purpose: CMS content-types and custom public feeds
- Contains:
  - Single types: `catalog-new-hero/`, `download-catalog-page/`
  - Collections: `product/`, `collection/`, filter option APIs, `catalog-filter-help/`, `catalog-share-help/`, `tag/`
  - Feed API package: `catalog/` (`controllers/`, `routes/`, `utils/`)
- Key files: `catalog/controllers/catalog-feed.js`, `catalog-hero-feed.js`, `download-catalog-feed.js`, `catalog-filter-feed.js`

**`server.cjs` + `lib/`:**
- Purpose: Only browser-facing backend for the marketing site
- Contains: Catalog proxy endpoints, submit/unsubscribe, static serve, Strapi path proxy
- Key files: `server.cjs`, `lib/anti-spam.cjs`, `lib/cors-config.cjs`, `lib/db.cjs`, `lib/confirmation-email.cjs`

**`scripts/`:**
- Purpose: Ops and quality gates
- Contains: Container boot, seed sync, snapshot export, catalog API/UI/perf checks, `new-page.mjs`
- Key files: `start-services.sh`, `export-catalog-snapshot.mjs`, `check-catalog-api.mjs`, `check-catalog-ui.mjs`, `new-page.mjs`

**`public/`:**
- Purpose: Site-root static files copied/served; catalog snapshots for fallback
- Contains: Images, sitemap, `catalog-*.snapshot.json`, `download-catalog-slides.snapshot.json`, `catalog-snapshot.manifest.json`

## Key File Locations

**Entry Points:**
- `src/main.js`: Universal client bootstrap
- `src/react-entry.tsx`: React island mount
- `src/components/app/ReactIslandRoot.tsx`: Page component switch
- `server.cjs`: HTTP API + static + proxy
- `scripts/start-services.sh`: Production process orchestration (Strapi + Node)
- `strapi-catalog/src/index.js`: Strapi bootstrap (seed dictionaries, download-catalog seed, dist prepare)

**Configuration:**
- `package.json`: Frontend/Node scripts
- `vite.config.mjs`: Multi-page inputs, clean URLs, `@` alias → `src/`
- `.env` / `.env.example`: `STRAPI_URL`, SMTP, `CATALOG_STRAPI_CACHE_TTL_MS`, `SITE_URL`, maps key
- `strapi-catalog/config/`: Strapi server/database/middlewares
- `nginx.conf`: Production path rules (HTML 301, `/uploads`, gzip)
- `Dockerfile`: Build + runtime image for Timeweb App Platform

**Core Logic:**
- Catalog client API: `src/catalog/catalog-api.ts`
- Catalog listing: `src/catalog/catalog-listing-controller.ts`
- Hero apply / download display mode: `src/catalog/catalog-hero.ts`, `src/catalog-hero-slider.js`
- Forms + page name map: `src/contact-forms.js`
- Email routing: `PAGE_EMAIL_ROUTING` in `server.cjs`
- Download catalog UI: `src/components/pages/DownloadCatalogPage.tsx`
- Download catalog CMS: `strapi-catalog/src/api/download-catalog-page/…/schema.json` + `download-catalog-feed.js`

**Testing / checks:**
- `scripts/check-catalog-api.mjs`
- `scripts/check-catalog-ui.mjs`
- `scripts/check-catalog-perf.mjs`
- `scripts/check-routing-contracts.mjs`

## Naming Conventions

**Files:**
- React pages: `PascalCase` + `Page` suffix — `HotelsPage.tsx`, `DownloadCatalogPage.tsx`
- Catalog runtime: `catalog-<domain>.ts` kebab — `catalog-listing-controller.ts`, `catalog-filter-dom.ts`
- CSS Modules: colocated `*.module.css` next to page/component
- Strapi APIs: kebab folder matching UID — `download-catalog-page`, `mattress-size`
- Feed routes: `<domain>-feed` — `catalog-feed`, `download-catalog-feed`
- HTML shells: kebab slug — `download-catalog.html`

**Directories:**
- `src/components/<domain>/` for React groupings (`pages`, `catalog-page`, `marketing`, `ui`, `app`)
- `strapi-catalog/src/api/<content-type>/` standard Strapi layout (`content-types`, optional controllers/routes)
- Custom feeds live under the `catalog` API package, not under each single-type folder

**DOM / data attributes:**
- Page id: `data-page` on `<body>`, `data-react-page` on island root (same slug)
- Prefer `data-*` for JS hooks on migrated pages (`data-faq-item`, etc.), not hashed CSS Module classes

## Where to Add New Code

**New marketing page:**
1. Prefer `npm run new-page -- <slug> "Title – Grassigrosso"` (writes HTML + Vite input)
2. Add `src/components/pages/<Name>Page.tsx`
3. Register in `ReactIslandRoot.tsx`
4. Add slug → title in `src/contact-forms.js` `getPageName()` and matching key in `PAGE_EMAIL_ROUTING` if the page has a form
5. Add path to `vite.config.mjs` `cleanHtmlRoutes` / rollup input if not using `new-page`
6. Add URL to `public/sitemap.xml`; update nav in header/footer across pages as needed
7. Tests: smoke build; form routing check if applicable

**New catalog CMS surface (follow download-catalog pattern):**
1. Strapi single type (or collection) under `strapi-catalog/src/api/<name>/`
2. Custom feed controller + public route under `strapi-catalog/src/api/catalog/`
3. Node endpoint in `server.cjs` (`/api/…`) with cache key + optional `public/*.snapshot.json` via `export-catalog-snapshot.mjs`
4. Client fetch only through `/api/…` in `src/catalog/catalog-api.ts` (or sibling module) — never Strapi host
5. React page under `src/components/pages/` with SSR/LCP fallback for slide/media #0; empty shells for the rest
6. Prefetch + apply from `src/main.js` / hero-slider style bootstrap

**New catalog UI section:**
- JSX: `src/components/catalog-page/`
- Runtime: new module under `src/catalog/`; wire from `catalog-page.js` or listing/modals bootstrap — do not grow `catalog-page.js` into a monolith

**New shared marketing section:**
- Extend `src/components/marketing/shared-page-sections.tsx` first; consume from page files

**New UI primitive:**
- `src/components/ui/` + export from `index.ts`

**Utilities:**
- Frontend shared: `src/lib/` (e.g. `cn.ts`)
- Node shared: `lib/*.cjs`
- Strapi feed helpers: `strapi-catalog/src/api/catalog/utils/`

**Route metadata:**
- `src/routes/routes.ts` for nav/path registry when the route is a primary/legal/service site page

## Special Directories

**`strapi-catalog/public/uploads/`:**
- Purpose: Catalog/media files served as `/uploads/…`
- Generated: No (authored/optimized locally)
- Committed: Yes — required for Docker deploy without rsync

**`strapi-catalog/database/seed/`:**
- Purpose: Seed SQLite + `seed-manifest.json` for container first-boot / hash-based reseed
- Generated: Via `npm run strapi:sync-seed` from local `.tmp/data.db`
- Committed: Yes

**`strapi-catalog/.tmp/`:**
- Purpose: Local working SQLite (`data.db`)
- Generated: Yes
- Committed: No

**`public/catalog-*.snapshot.json` / `download-catalog-slides.snapshot.json`:**
- Purpose: Cold fallback when Strapi unavailable
- Generated: `npm run catalog:export-snapshot`
- Committed: Yes (after catalog content changes)

**`dist/`:**
- Purpose: Vite production output served by Node
- Generated: `npm run build`
- Committed: No

**`.planning/codebase/`:**
- Purpose: GSD architecture/structure maps for planners/executors
- Generated: By map-codebase agents
- Committed: As project chooses

## Invariants (placement rules)

- Do not call Strapi from `src/` — only same-origin `/api/catalog/*` and `/api/download-catalog/*`
- Do not put migrated page markup back into HTML strings or `dangerouslySetInnerHTML` for known `data-react-page` values
- Do not add a second frontend CMS admin bundle in this repo
- Public asset URLs must be root-absolute (`/uploads/…`, `/boxspring.avif`) — never `./public/…`
- Keep `getPageName()` and `PAGE_EMAIL_ROUTING` keys synchronized when adding forms

---

*Structure analysis: 2026-08-03*
