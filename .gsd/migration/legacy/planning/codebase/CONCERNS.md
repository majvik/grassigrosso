# Codebase Concerns

**Analysis Date:** 2026-08-03

## Tech Debt

**Marketing / service copy lives in React, not CMS:**
- Issue: Almost all public marketing and service text is hardcoded in React page components. Non-engineers cannot edit headlines, FAQ, office lists, certificates, or legal text without a code deploy. Strapi covers catalog products, filter dictionaries, hero slides, download-catalog slides, filter-help, and share-help only.
- Files: `src/components/pages/IndexPage.tsx`, `src/components/pages/HotelsPage.tsx`, `src/components/pages/DealersPage.tsx`, `src/components/pages/ContactsPage.tsx`, `src/components/pages/DocumentsPage.tsx`, `src/components/marketing/shared-page-sections.tsx`, `src/components/pages/legal-content.tsx`, `src/components/pages/UnsubscribePage.tsx`
- Impact: Copy/legal updates require developer PR + build; marketing velocity is gated by engineering; risk of stale phone/email/address across duplicated contact blocks.
- Fix approach: Keep catalog/help in Strapi. If CMS for marketing is needed, introduce content types + backend proxy (same pattern as catalog feeds) — do not point the browser at Strapi. Until then, treat `src/components/pages/*.tsx` as the single source of truth for that copy.

**Only catalog + download-catalog slides are CMS-editable media surfaces:**
- Issue: Editable via Strapi admin: `Product`, filter option collections, `catalog-new-hero`, `download-catalog-page` slides, `catalog-filter-help`, `catalog-share-help`. Page chrome for `/download-catalog` (title, form labels) remains React-hardcoded; homepage/hotels/dealers heroes and marketing videos stay in `public/` + JSX.
- Files: `strapi-catalog/src/api/product/`, `strapi-catalog/src/api/catalog-new-hero/`, `strapi-catalog/src/api/download-catalog-page/`, `strapi-catalog/src/api/catalog-filter-help/`, `strapi-catalog/src/api/catalog-share-help/`, `src/components/pages/DownloadCatalogPage.tsx`, `src/catalog/catalog-api.ts`, `server.cjs` (`/api/catalog/*`, `/api/download-catalog/slides`)
- Impact: Operators may assume “everything in admin” — wrong; marketing pages still need code changes. Slide-0 SSR fallbacks in React can drift from Strapi if cover asset hashes change.
- Fix approach: Document editable vs hardcoded surfaces clearly for ops. When replacing download-catalog slide 0 media, update `DOWNLOAD_SLIDE_0_SRC` in `DownloadCatalogPage.tsx` in the same change as seed/snapshot.

**Filter/share help already in Strapi (do not re-hardcode):**
- Issue: Filter-help and share-help content is seeded and served from Strapi feeds, then snapshotted into `public/catalog-filters.snapshot.json`. Duplicate hardcoding in React/TS would create a second source of truth.
- Files: `strapi-catalog/src/api/catalog/controllers/catalog-filter-feed.js`, `strapi-catalog/src/api/catalog/controllers/catalog-share-help-feed.js`, `strapi-catalog/src/api/catalog/utils/seed-catalog-filter-help-content*.js`, `strapi-catalog/src/api/catalog/utils/seed-catalog-share-help-content*.js`, `src/catalog/catalog-filter-help-modal.ts`, `server.cjs` (`GET /api/catalog/filters` merges share-help)
- Impact: Safe for content editors today; risk is future PRs reintroducing static help blobs in `catalog-page-data.ts` or modal TS.
- Fix approach: Edit help only in Strapi (or seed data scripts for bootstrap). Always re-export snapshot after help changes. Modal remains DOM runtime — content must keep flowing from API/snapshot.

**Seed + snapshot deploy contract is multi-step and easy to miss:**
- Issue: Live Strapi DB on the server is **not** the git source of truth. Local `.tmp/data.db` → `npm run strapi:sync-seed` → `database/seed/data.db` + `seed-manifest.json` → `npm run catalog:export-snapshot` → commit `public/catalog-*.snapshot.json`, `public/download-catalog-slides.snapshot.json`, `public/catalog-snapshot.manifest.json`, and `strapi-catalog/public/uploads/`. On boot, `scripts/start-services.sh` copies seed when manifest SHA changes (or volume DB empty / `STRAPI_RESEED_ON_START=1`).
- Files: `scripts/sync-strapi-seed.mjs`, `scripts/export-catalog-snapshot.mjs`, `scripts/start-services.sh`, `strapi-catalog/database/seed/data.db`, `strapi-catalog/database/seed/seed-manifest.json`, `public/catalog-snapshot.manifest.json`, `AGENTS.md`
- Impact: Skipping sync-seed or snapshot leaves prod on stale content or disk-fallback that disagrees with admin. Server-only admin edits are wiped on next seed apply. `STRAPI_AUTO_APPLY_SEED=0` disables auto-apply and can strand volume DB behind git.
- Fix approach: Treat “content deploy” as a checklist: stop Strapi → sync-seed → optimize media if needed → export-snapshot → commit seed + uploads + snapshots → push. Never rely on production admin as durable storage.

**Legal pages hardcoded in React:**
- Issue: Privacy, terms, and cookies are a large JSX document in `legal-content.tsx` (updatedAt strings, operator details, tables). No CMS, no separate markdown pipeline.
- Files: `src/components/pages/legal-content.tsx`, `src/components/pages/LegalPage.tsx`, entry HTML `privacy.html` / `terms.html` / `cookies.html`
- Impact: Legal revisions require eng deploy; compliance deadlines blocked by release cycle; easy to update one page and forget `updatedAt` or sitemap/meta.
- Fix approach: Keep single file as source until a legal CMS is justified. When editing, update all three page ids in `LEGAL_PAGES` and bump `updatedAt` in the same PR. Do not split into parallel HTML string sources.

**Catalog runtime still DOM-orchestrated on top of React markup:**
- Issue: Catalog page JSX renders structure; behavior is large imperative modules that mutate DOM (`innerHTML`, class toggles, querySelector contracts). Heaviest leftovers called out in migration docs: image modal and filter DOM.
- Files: `src/catalog/catalog-listing-controller.ts` (~1123 lines), `src/catalog/catalog-image-modal.ts` (~754), `src/catalog/catalog-product-gallery.ts` (~657), `src/catalog/catalog-filter-dom.ts` (~411), `src/components/pages/CatalogPage.tsx`, `src/components/catalog-page/*`, `docs/ui-migration.md`
- Impact: React re-renders can fight DOM mutations; class/`data-*` renames break filters/modals silently; hard to unit-test; slow for new catalog UX.
- Fix approach: Incremental cleanup per `docs/ui-migration.md` — `catalog-image-modal.ts` then `catalog-filter-dom.ts` — without replacing Strapi feed / favourites / share contracts in one rewrite.

**Dual Product schema: relation fields + legacy enums:**
- Issue: Product content-type keeps both relation fields (filter dictionaries) and old enumeration fields. Feeds merge relation + legacy sizes/fillings.
- Files: `strapi-catalog/src/api/product/content-types/product/schema.json`, `strapi-catalog/src/api/catalog/controllers/catalog-feed.js`, `strapi-catalog/src/index.js` (bootstrap backfill)
- Impact: Editors can fill only enums and appear fine in admin while public filters expect relation slugs; drift between enum and relation causes filter/share mismatches.
- Fix approach: Prefer relation fields for all new edits. Plan enum removal only after verifying feed + snapshot use relations exclusively.

**Giant legacy CSS + React CSS Modules coexistence:**
- Issue: Migrated pages still depend on global CSS for full-width parity (`components.css` ~8076 lines, `catalog-page.css` ~2793). New UI kit uses CSS Modules in parallel.
- Files: `src/styles/components.css`, `src/styles/catalog-page.css`, `src/components/pages/*.module.css`, `docs/ui-migration.md`
- Impact: Dead selectors accumulate; visual regressions when “cleaning CSS”; conflict between module hashes and runtime class-name contracts if someone binds JS to modules.
- Fix approach: Extract CSS Modules only where parity is proven. Never use CSS Module hashes as JS hooks — keep `data-*`. Delete global selectors only when catalog runtime and page interactions no longer reference them.

**SSR/typed catalog fallback data can drift from live feed:**
- Issue: `catalog-page-data.ts` holds typed hero/filter/card fallback used before/without Strapi. Must stay compatible with runtime DOM contracts.
- Files: `src/components/pages/catalog-page-data.ts`, `src/components/catalog-page/*`, `public/catalog-*.snapshot.json`
- Impact: Stale fallback cards/filters after catalog import; LCP hero slide 0 path mismatches AVIF uploads.
- Fix approach: After catalog imports, refresh fallback assets carefully or shrink fallback toward snapshot-backed data without dropping empty-state structure.

## Known Bugs

**Production admin edits overwritten by seed apply:**
- Symptoms: Content changed only in Timeweb Strapi admin disappears after deploy when `seed-manifest.json` SHA differs and `scripts/start-services.sh` copies `database/seed/data.db` onto the volume.
- Files: `scripts/start-services.sh`, `strapi-catalog/database/seed/data.db`, `strapi-catalog/database/seed/seed-manifest.json`
- Trigger: Push with new seed manifest while operators edited prod DB directly.
- Workaround: Always edit locally → sync-seed → snapshot → push. Use `STRAPI_AUTO_APPLY_SEED=0` only with a deliberate ops process (otherwise volume drifts permanently from git).

**Download-catalog slides snapshot can be silently skipped:**
- Symptoms: `npm run catalog:export-snapshot` warns and continues if `/api/download-catalog/slides` fails; products/filters may update while download slides snapshot stays old or missing.
- Files: `scripts/export-catalog-snapshot.mjs` (`.catch` returns `null`), `public/download-catalog-slides.snapshot.json`, `server.cjs` disk fallback map key `download-catalog:slides`
- Trigger: Export while API/Strapi down or download-catalog feed error.
- Workaround: Treat a skip warning as failure for content releases; re-run export with healthy `dev:api` + Strapi.

**Email routing desync if `page` labels diverge:**
- Symptoms: Form submissions land in `MAIL_TO` fallback instead of sales/hotels/b2b.
- Files: `src/contact-forms.js` (`getPageName()`), `server.cjs` (`PAGE_EMAIL_ROUTING`)
- Trigger: Adding a page/form with a new `page` string on one side only, or using `.html` slugs in keys.
- Workaround: Update both maps in the same PR; keys must match exactly (no `.html`).

**Strapi cold-start / unavailable → degraded catalog:**
- Symptoms: Admin login 502 / empty JSON parse; public catalog may serve `stale-cache` or `disk-snapshot` (`X-Catalog-Source`). Boot may log Strapi unavailable and still start `server.cjs`.
- Files: `scripts/start-services.sh`, `server.cjs` (catalog cache + snapshot fallback), `/tmp/strapi.log` in container
- Trigger: Slow container, missing Strapi secrets, SQLite path issues, OOM.
- Workaround: Committed snapshots keep public catalog alive; fix Strapi via container logs. Do not remove snapshot/cache fallback without replacement.

## Security Considerations

**Lead form endpoint is public and spam-sensitive:**
- Risk: Bot flood of `POST /api/submit` → mailbox/Telegram noise, SQLite growth.
- Files: `server.cjs`, `lib/anti-spam.cjs`, honeypot fields in forms (e.g. `DownloadCatalogPage.tsx` `HiddenTrapField`)
- Current mitigation: Rate limits, min interval, honeypot keys (`website`/`url`/`homepage`), field length caps; tighter defaults in production.
- Recommendations: Keep honeypots on new forms; do not disable spam in prod; monitor leads DB path (`DB_PATH`).

**Strapi secrets fall back to documented dev defaults in boot script:**
- Risk: If Timeweb env omits `APP_KEYS` / `JWT_SECRET` / etc., `start-services.sh` substitutes `dev-*` values — weak admin crypto on a public host.
- Files: `scripts/start-services.sh`, `.env.example`
- Current mitigation: Documented requirement to set secrets in hosting panel; `.dockerignore` keeps local `strapi-catalog/.env` out of image.
- Recommendations: Fail boot in production when secrets are still `dev-*` prefixes; verify Timeweb env parity with `.env.example`.

**CORS enabled on API surface:**
- Risk: Misconfigured origin allowlist could broaden cross-origin form posts.
- Files: `server.cjs` (`cors(corsOptions)`)
- Current mitigation: Origin options tied to site configuration (review when adding domains).
- Recommendations: Re-check allowlist when adding staging hosts.

**No separate auth on public catalog proxy:**
- Risk: Catalog JSON endpoints are intentionally public; over-fetch is fine, but must never proxy Strapi admin or write APIs to the browser.
- Files: `server.cjs` (`/api/catalog/*`, `/api/download-catalog/slides`, `/admin` proxy)
- Current mitigation: Frontend uses only backend public feeds; admin is separate proxied path.
- Recommendations: Preserve “no `VITE_STRAPI_*` in frontend runtime” invariant from `AGENTS.md`.

## Performance Bottlenecks

**Catalog listing controller rebuilds card HTML strings:**
- Problem: Visible cards often rebuilt via `innerHTML` joins from `buildCatalogueCardHtml`.
- Files: `src/catalog/catalog-listing-controller.ts`, `src/catalog/catalog-card.ts`
- Cause: Imperative listing + favourites/share modes share one DOM pipeline.
- Improvement path: Narrow re-render to changed cards; eventually React-managed card list behind same `data-*` hooks without giant string templates.

**Heavy hero / uploads without careful preload policy:**
- Problem: Double-fetch of hero AVIF if slides 1…N regain `<picture>` in SSR/JSX; `preload="metadata"` on hero video historically pulled full webm on desktop.
- Files: `src/components/catalog-page/hero.tsx`, `src/catalog/catalog-hero.ts`, `catalog.html`, `AGENTS.md`
- Cause: SSR fallback + Strapi feed race.
- Improvement path: Keep picture only on slide 0; keep video `preload="none"`; prefer AVIF via `prefer-avif.js` + committed `.avif` siblings under `strapi-catalog/public/uploads/`.

**Strapi SQLite + cold admin:**
- Problem: Admin and heavy feeds compete on single SQLite file; cold container start is slow.
- Files: `strapi-catalog/`, `scripts/start-services.sh`, in-memory cache in `server.cjs` (`CATALOG_STRAPI_CACHE_TTL_MS`, default ~45s prod)
- Cause: Embedded CMS in same app image; no separate DB server.
- Improvement path: Keep public TTL cache + disk snapshots; avoid disabling cache on Timeweb without reason.

**Large committed uploads tree (~130M, hundreds of files):**
- Problem: Clone/build time and git pressure; very large videos may hit host/git limits.
- Files: `strapi-catalog/public/uploads/`
- Cause: Deploy-from-git contract (uploads must be in image).
- Improvement path: Keep optimizing via `npm run catalog:optimize-media`; use Git LFS / external storage only as a deliberate follow-up if limits bite.

## Fragile Areas

**Seed manifest ↔ volume marker ↔ snapshot triad:**
- Files: `scripts/start-services.sh`, `strapi-catalog/database/seed/seed-manifest.json`, `public/catalog-snapshot.manifest.json`, `scripts/check-catalog-api.mjs`
- Why fragile: Three artifacts must agree conceptually (DB content, applied SHA, public JSON fallback). Partial commits cause subtle prod bugs (live Strapi new, snapshot old, or reverse).
- Safe modification: Always commit seed + uploads + snapshots together after catalog/help/hero/download-slide edits. Run `npm run check:catalog-api` before push.
- Test coverage: `check:catalog-api` asserts snapshot manifest productCount and sample slug; no automated check that seed SHA matches snapshot freshness.

**React markup ↔ catalog DOM class contract:**
- Files: `src/components/catalog-page/*`, `src/catalog/catalog-filter-dom.ts`, `src/catalog/catalog-listing-controller.ts`, `src/catalog/catalog-image-modal.ts`
- Why fragile: Runtime selects `.catalogue-new-card`, `.catalogue-new-filter-group`, modal nodes, etc. Cosmetic class renames break filters/modals.
- Safe modification: Preserve `id` / `class` / `data-*` hooks when editing catalog React. Prefer extending components over rewriting class names.
- Test coverage: `npm run check:catalog-ui` (local Chrome headless); remote UI relies on browser MCP — CLI UI check skips remote HTTPS.

**`getPageName` ↔ `PAGE_EMAIL_ROUTING`:**
- Files: `src/contact-forms.js`, `server.cjs`
- Why fragile: Stringly-typed routing; no shared constant module.
- Safe modification: Change both files atomically; add `check:routes` coverage when adding pages (`npm run check:routes`).
- Test coverage: `scripts/check-routing-contracts.mjs` exists — extend it when adding form pages.

**Legal content as JSX blob:**
- Files: `src/components/pages/legal-content.tsx`
- Why fragile: Large nested JSX; easy merge conflicts; HTML-like structure without content review tooling.
- Safe modification: Minimal diffs; keep structure (h2/p/ul/table) consistent with `service-page.module.css`.
- Test coverage: None beyond typecheck/build.

**Download-catalog slide count hardcoded to 8:**
- Files: `src/components/pages/DownloadCatalogPage.tsx` (`DOWNLOAD_SLIDE_COUNT = 8`)
- Why fragile: Strapi may add/remove slides while React still renders 8 empty slots / dots.
- Safe modification: Keep count in sync with Strapi download-catalog page + snapshot; or drive count from feed after load without breaking LCP slide 0.
- Test coverage: Not enforced in `check:catalog-api` beyond general snapshot presence.

## Scaling Limits

**SQLite Strapi single-node:**
- Current capacity: Fine for catalog size (~40+ products) and low concurrent admin use.
- Limit: Write-heavy admin + public feed spikes on one file; no horizontal Strapi scale.
- Scaling path: External Postgres / object storage for media if traffic or team size grows; keep public Node cache either way.

**In-memory catalog cache per Node process:**
- Current capacity: One process (`server.cjs`) with TTL + stale window.
- Limit: Multi-instance deploy would not share memory cache (each warms alone; disk snapshot still shared via image).
- Scaling path: Sticky single instance (current Timeweb shape) or shared cache later.

**Leads SQLite (`DB_PATH`):**
- Current capacity: Local/queued lead store for email/Telegram delivery.
- Limit: Unbounded growth if delivery fails repeatedly; single-file lock contention.
- Scaling path: Retention/purge job; monitor pending counts logged at boot.

## Dependencies at Risk

**Imperative catalog stack vs React 19 island:**
- Risk: Dual paradigms increase regression rate as React Compiler / Strict patterns spread.
- Impact: Catalog UX bugs hard to reproduce; migration half-finished.
- Migration plan: Follow `docs/ui-migration.md` residual steps; do not introduce a second state library mid-cleanup.

**Legacy Product enums:**
- Risk: Schema duplication.
- Impact: Incorrect public filters if relations empty.
- Migration plan: Backfill verification → stop writing enums → remove enums in a dedicated Strapi schema phase + seed/snapshot refresh.

**MPA HTML entries + Vite multi-page input:**
- Risk: Forgetting `vite.config.mjs` input for a new page drops it from `dist/`.
- Impact: 404 on production for new marketing URLs.
- Migration plan: Prefer `npm run new-page`; keep `check:routes` green.

## Missing Critical Features

**No CMS for marketing/legal copy:**
- Problem: Cannot change homepage/hotels/dealers/documents/legal without engineering.
- Blocks: Non-dev content ops, fast legal updates, A/B copy without deploys.

**No automated unit/integration test suite:**
- Problem: Zero `*.test.*` / `*.spec.*` files; quality gates are scripts (`typecheck`, `check:catalog-api`, `check:catalog-ui`, `check:catalog-perf`, `check:routes`).
- Blocks: Safe refactors of `catalog-listing-controller.ts` and form routing without manual smoke.

**No durable “edit prod content without git” path:**
- Problem: By design, prod admin is ephemeral relative to seed.
- Blocks: Emergency copy fixes on production without a full seed cycle (unless ops temporarily freezes auto-apply — then git and volume diverge).

## Test Coverage Gaps

**Marketing React page copy / legal text:**
- What's not tested: Content accuracy, link targets, contact parity across pages.
- Files: `src/components/pages/*.tsx`, `src/components/pages/legal-content.tsx`
- Risk: Broken tel/mailto, outdated legal operator details ship unnoticed.
- Priority: Medium (process/checklist); High before legal redesign.

**Catalog DOM runtime modules:**
- What's not tested: Filter combinations, modal gallery edge cases, favourites/share HTML injection paths beyond smoke.
- Files: `src/catalog/catalog-listing-controller.ts`, `src/catalog/catalog-image-modal.ts`, `src/catalog/catalog-filter-dom.ts`, `src/catalog/catalog-product-gallery.ts`
- Risk: Regressions in listing/modal after “small” class or feed shape changes.
- Priority: High before further catalog runtime cleanup.

**Seed/snapshot consistency:**
- What's not tested: That `seed-manifest.json` SHA content matches exported snapshots and uploads referenced by feeds.
- Files: `scripts/sync-strapi-seed.mjs`, `scripts/export-catalog-snapshot.mjs`, `scripts/check-catalog-api.mjs`
- Risk: Partial content deploys.
- Priority: High for content release process; Medium for CI automation.

**Email routing contract expansion:**
- What's not tested: Every form `page` value used in client vs `PAGE_EMAIL_ROUTING` keys (beyond existing route checks).
- Files: `src/contact-forms.js`, `server.cjs`, forms in page components
- Risk: Silent mis-delivery to fallback inbox.
- Priority: High when adding pages with forms.

---

*Concerns audit: 2026-08-03*
