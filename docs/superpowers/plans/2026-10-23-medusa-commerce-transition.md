# Medusa Commerce Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить действующий каталог Grassigrosso в self-hosted B2C-магазин на Medusa Core с отдельными товарными страницами, гостевым и пользовательским commerce-flow, оплатой через Т-Банк и ручным согласованием доставки после оплаты.

**Architecture:** Strapi остаётся единственным владельцем контента и media, Medusa — единственным владельцем variants, SKU, цен, inventory, carts, customers, orders и payments. Существующий Node backend становится BFF и fail-closed boundary: он объединяет данные двух систем, закрывает commerce-страницы через `503`, если обязательная система недоступна, и принимает внешние payment notifications. Переход выполняется локальными волнами; работающий каталог не переключается до полного acceptance gate.

**Tech Stack:** Vite 7, React 19, TypeScript 6, Base UI, Express 4, Strapi 5.42.1, Medusa Core 2.21.2 candidate pinned by exact tag/commit, PostgreSQL 16, Redis 7.2, Node.js 24, Docker Compose, Т-Банк Internet Acquiring API, cloud KKT/OFD.

**Spec:** `docs/superpowers/specs/2026-10-23-medusa-commerce-transition-design.md`

## Global Constraints

- Work locally only; do not push, deploy, create/update a pull request, or change Timeweb/dev/prod.
- Do not begin a later phase while the previous phase has an open required test or verification item.
- Every behavior change follows RED → GREEN and includes an automated regression test.
- Use Medusa Core only. Official packages may physically contain upstream Enterprise Materials, but project code must not enable, import, modify, copy, derive from, or depend on Enterprise RBAC/SSO/OIDC behavior; a later filtered-source fork must preserve all public contracts.
- Pin the accepted Medusa tag, commit SHA, lockfile, licenses, SBOM, Node runtime, PostgreSQL, Redis, and Docker image digests before writing integration code.
- Strapi owns content/media/SEO; Medusa owns variants/SKU/prices/inventory/carts/customers/orders/payments.
- A field has exactly one writable owner. Cross-system data is an immutable-key projection, never competing two-way ownership.
- Product sizes are Medusa variants with independent SKU, price, and managed inventory; backorders are disabled.
- A `1000` inventory quantity is an ordinary finite quantity, not a special infinite-stock mode.
- Catalog, smart-selector results, product-backed favourites, and product pages require both Strapi and Medusa; failure returns `503` and no snapshot-render.
- Cart, checkout, authentication, profile, and orders require Medusa; failure returns `503`.
- Marketing/legal pages independent of commerce remain available during commerce outages.
- Product quick view is removed on desktop and mobile; card navigation opens a full product page.
- Checkout stays available to guests; account creation is explicit and starts with email/password.
- Delivery is excluded from the initial payment; collect only name, email, phone, city/region, preferred contact method, comment, and required consents.
- Reserve inventory for exactly 30 minutes during payment; reconcile provider state before expiry release.
- Browser redirects never prove payment success; only validated server notifications or server-to-server status reconciliation do.
- Personal data, logs containing it, queues, databases, media, and backups remain in the Russian hosting contour.
- Do not store smart-selector profiles or response history in customer accounts in v1.
- Each completed task updates this plan with exact test commands and results before its commit.

## File Structure

### Commerce application

- `medusa-commerce/medusa-config.ts` — Medusa module/provider configuration only.
- `medusa-commerce/src/modules/strapi/` — read-only Strapi client and immutable product-link projection.
- `medusa-commerce/src/modules/favourites/` — server-side customer favourites.
- `medusa-commerce/src/modules/tbank-payment/` — Т-Банк payment provider only.
- `medusa-commerce/src/workflows/catalog-sync/` — idempotent catalog/variant reconciliation.
- `medusa-commerce/src/workflows/payment-reservation/` — 30-minute reservation lifecycle and recovery.
- `medusa-commerce/src/workflows/delivery-contact/` — post-payment manager task/notification lifecycle.
- `medusa-commerce/src/subscribers/` — thin event subscribers that invoke workflows.
- `medusa-commerce/src/jobs/` — expiration/reconciliation jobs.
- `medusa-commerce/integration-tests/` — Medusa-level integration tests.

### Existing backend/BFF

- `server/commerce/commerce-client.cjs` — JSDoc-typed Medusa HTTP client executable by the existing CommonJS server.
- `server/commerce/commerce-readiness.cjs` — dependency readiness and fail-closed decisions.
- `server/commerce/catalog-projection.cjs` — Strapi content + Medusa trading projection.
- `server/commerce/routes/` — focused CommonJS catalog, cart, auth, profile, checkout, order and payment routes.
- `server/commerce/tbank-notification.cjs` — request authentication/normalization before Medusa provider workflow.
- `server.cjs` — composition root only; register the focused commerce router and preserve existing routes.

### Storefront

- `src/components/pages/ProductPage.tsx` — full product route surface.
- `src/components/pages/CartPage.tsx`, `CheckoutPage.tsx`, `ProfilePage.tsx`, `OrderPage.tsx`, `FavouritesPage.tsx`, `CommerceUnavailablePage.tsx` — one route surface each.
- `src/components/commerce/` — focused product selector, share, cart, auth, checkout, order and profile components.
- `src/commerce/` — typed API client, stores, merge logic and route-independent browser services.
- `src/components/catalog-page/cards.tsx` and catalog runtime modules — card navigation/favourite/share hooks only.
- `product.html`, `cart.html`, `checkout.html`, `profile.html`, `order.html`, `favourites.html`, `service-unavailable.html` — Vite entries retaining mandatory site shell contracts.

### Test and operational artifacts

- `scripts/check-commerce-*.mjs` — local contract/browser/security checks following existing script harness conventions.
- `scripts/commerce/` — import, reconciliation, license/SBOM and fixture utilities.
- `docker-compose.commerce.yml` — local PostgreSQL/Redis/Medusa dependencies.
- `docs/runbooks/commerce-*.md` — backup, restore, payment incident and cutover runbooks.

## Review Focus

- A delayed successful Т-Банк notification after the 30-minute reservation expiry must not oversell; it must enter `manual_review` with a durable operator alert.
- A partial dependency failure must never expose a plausible mixed snapshot: required commerce pages return `503`, while unrelated marketing/legal pages remain available.
- Guest-to-account merge must be idempotent and lossless when the same variant/favourite exists on both sides or becomes unavailable during merge.
- A price or inventory change between product view, cart, payment initialization, and callback must be detected server-side without trusting browser totals.
- Duplicate, reordered, forged, and amount-mismatched payment notifications must not duplicate orders, captures, refunds, receipts, or manager notifications.

---

## Phase 0 — License and reproducible foundation

### Task 1: Pin and audit the Medusa distribution

**Files:**
- Create: `scripts/commerce/check-medusa-license.mjs`
- Create: `scripts/commerce/check-medusa-license.test.mjs`
- Create: `scripts/commerce/enterprise-paths.json`
- Create: `docs/commerce/medusa-baseline.md`
- Create: `docs/commerce/medusa-baseline.json`
- Create: `docs/commerce/medusa-sbom.json`
- Create: `docs/commerce/licenses/medusa-v2.21.2-LICENSE`
- Create: `docs/commerce/licenses/medusa-v2.21.2-ENTERPRISE-LICENSE.md`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run check:medusa-license`.
- Produces: machine-readable allow/deny inputs consumed by every later dependency update.
- Pins: Medusa `v2.21.2` only if the checked tag SHA, licenses, package contents, and Node compatibility match the baseline; otherwise stop and amend the spec/plan rather than silently choosing another version.

- [x] **Step 1: Write the failing license-baseline check**

Assert that the pinned tag SHA, root `LICENSE`, `ENTERPRISE-LICENSE.md`, denied Enterprise paths, package versions, and generated SBOM hashes exactly match committed baseline data; assert failure for an injected unknown license, project-owned Enterprise path, forbidden feature flag or forbidden package import.

- [x] **Step 2: Run the check and verify RED**

Run: `npm run check:medusa-license`
Expected: FAIL because no committed baseline or checker exists.

- [x] **Step 3: Implement `check-medusa-license.mjs`**

Expose `loadBaseline(path)`, `scanPackageTree(root)`, `assertNoEnterpriseMaterial(scan, denylist)`, and `writeSbom(scan, output)`; do not download or update packages during the check.

- [x] **Step 4: Generate and manually review the baseline**

Record exact tag, commit SHA, license hashes, package versions, Node requirement, denied paths and SBOM. Document that future changes require an explicit diff review.

- [x] **Step 5: Run the license check and verify GREEN**

Run: `npm run check:medusa-license`
Expected: PASS and report exact accepted tag/SHA with zero project Enterprise usage/activation and zero unknown license findings. Physical Enterprise files declared inside unchanged official upstream packages are inventoried, not misreported as project usage.

- [x] **Step 6: Commit Task 1**

```bash
git add package.json scripts/commerce/check-medusa-license.mjs scripts/commerce/check-medusa-license.test.mjs scripts/commerce/enterprise-paths.json docs/commerce/medusa-baseline.md docs/commerce/medusa-baseline.json docs/commerce/medusa-sbom.json docs/commerce/licenses docs/superpowers/specs/2026-10-23-medusa-commerce-transition-design.md docs/superpowers/plans/2026-10-23-medusa-commerce-transition.md
git commit -m "chore(commerce): pin Medusa license baseline"
```

#### Execution Results — Task 1

- Tests added: 4 Node test-runner checks covering committed baseline consistency, unknown-license/project Enterprise rejection, forbidden flag/package detection, and deterministic SBOM output.
- RED: `npm run check:medusa-license` → exit 1; missing baseline/checker. A second RED run proved missing Enterprise activation detection.
- GREEN: `npm run check:medusa-license` → 4/4 PASS; CLI reported tag `v2.21.2`, commit `020565398e436a2bc65777a3b1ad347b4735d6df`, 5 pinned packages, 0 project Enterprise usages, 0 unknown licenses.
- Additional gate: `npm run typecheck` → exit 0; `git diff --check` → exit 0.
- Ruling: official packages are temporarily permitted to physically contain declared upstream Enterprise files, but project activation/import/modification/copy/dependency is fail-closed; contracts preserve a later filtered-fork migration.
- Remote actions: none. Only read-only retrieval of official GitHub/npm artifacts was used to generate and review committed evidence.

### Task 2: Scaffold the isolated Medusa runtime and local infrastructure

**Files:**
- Create: `medusa-commerce/`
- Create: `docker-compose.commerce.yml`
- Create: `.env.commerce.example`
- Create: `scripts/check-commerce-runtime.mjs`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Produces: Medusa Admin/API on a dedicated local port, PostgreSQL 16 and Redis 7.2.
- Produces: `npm run dev:commerce`, `npm run build:commerce`, `npm run check:commerce-runtime`.
- Preserves: existing Strapi/API/Vite ports and `npm run dev:all` until a later explicit orchestration task.

- [x] **Step 1: Write the failing runtime contract**

Assert pinned package versions, disabled Enterprise feature flags, RUB region fixture, Russian Admin locale availability, PostgreSQL connection, Redis connection, health endpoint, and absence of Cloud-only runtime dependencies.

- [x] **Step 2: Run the runtime check and verify RED**

Run: `npm run check:commerce-runtime`
Expected: FAIL because the runtime is absent.

- [x] **Step 3: Scaffold Medusa from the accepted pinned source**

Create the application without a replacement storefront. Configure PostgreSQL, Redis, local file provider for development, email test provider, RUB and Russia defaults. Keep generated files inside `medusa-commerce/`.

- [x] **Step 4: Add local Docker and environment contracts**

Use named local volumes, explicit health checks and non-production credentials. Never copy real secrets into examples or tests.

- [x] **Step 5: Add baseline backup/restore smoke**

Create `scripts/commerce/check-backup-restore.mjs`; insert a fixture, create a local backup, restore into a fresh test database, and assert the fixture survives.

- [x] **Step 6: Verify GREEN**

Run: `npm run check:medusa-license && npm run check:commerce-runtime && npm run build:commerce`
Expected: all PASS; Admin can select Russian; backup/restore smoke passes.

- [x] **Step 7: Record commands/results and commit Task 2**

```bash
git add medusa-commerce docker-compose.commerce.yml .env.commerce.example package.json .gitignore scripts/check-commerce-runtime.mjs scripts/commerce/check-backup-restore.mjs docs/superpowers/plans/2026-10-23-medusa-commerce-transition.md
git commit -m "feat(commerce): add self-hosted Medusa foundation"
```

#### Execution Results — Task 2 / Phase 0

- Tests added: 5 static runtime-contract tests plus executable PostgreSQL, Redis, migration, backup/restore, Russian Admin locale and HTTP health checks.
- RED: `npm run check:commerce-runtime` → exit 1 with absent `medusa-commerce/`; additional RED runs caught incompatible React 19, missing `ts-node`, missing build-safe local secrets and a PostgreSQL restore command that attempted `DROP/CREATE DATABASE` in one transaction.
- GREEN: `npm run check:medusa-license && npm run check:commerce-runtime && npm run build:commerce` → exit 0. Runtime result: PostgreSQL accepting connections, Redis `PONG`, restored fixture `survives`, Russian Admin translation present, `/health` returned 200; backend and Admin builds completed.
- Regression: `npm run check:routes`, `npm run check:pages-cms-contract`, `npm run check:pages-cms-isolation`, and `npm run typecheck` → exit 0. Aggregate `npm run check` could not complete because the pre-existing catalog API on `127.0.0.1:3000` was not running; all checks before `check:catalog-api` passed.
- Docker cleanup: `docker compose -f docker-compose.commerce.yml ps` returned no running commerce containers. Named local data volumes are intentionally retained for subsequent work.
- Known limitation: `npm install --prefix medusa-commerce` reports 93 transitive advisories (63 moderate, 30 high) in the pinned Medusa dependency tree. They require dependency-path review in the later security gate; no blind `npm audit fix --force` was applied.
- Runtime pins: PostgreSQL `16.10-alpine3.22@sha256:029660…2297`, Redis `7.2.11-alpine3.21@sha256:1a34bd…a0a7`, dedicated host ports 5433/6380/9000.
- Remote actions: none; no push, deploy, PR or external environment change.

---

## Phase 1 — Product ownership, import and fail-closed BFF

### Task 3: Define immutable product/variant contracts

**Files:**
- Create: `commerce-contracts/catalog-v1.schema.json`
- Create: `src/commerce/contracts.ts`
- Create: `scripts/commerce/build-medusa-catalog-import.mjs`
- Create: `scripts/check-commerce-catalog-contract.mjs`
- Modify: `strapi-catalog/src/api/product/content-types/product/schema.json`
- Modify: `strapi-catalog/src/api/catalog/controllers/catalog-feed.js`
- Modify: `src/catalog/catalog-api.ts`
- Modify: `package.json`

**Interfaces:**
- `commerce-contracts/catalog-v1.schema.json` is the runtime-neutral source of validation truth consumed by Node import/reconciliation tools; browser TypeScript types mirror its versioned fields and are parity-tested.
- Produces: `CommerceProductRef { strapiDocumentId: string; medusaProductId: string; integrationKey: string }`.
- Produces: `CommerceVariantProjection { id: string; sku: string; size: string; priceKopecks: number; inventoryQuantity: number; available: boolean }`.
- Produces: deterministic SKU format `GG-{PRODUCT_KEY}-{WIDTH}X{LENGTH}`.
- Consumes: existing Strapi size relations and product slug only as migration input, never as the permanent identity.

- [x] **Step 1: Write failing contract/import tests**

Assert every active product gets one immutable integration key, every allowed size gets one unique variant/SKU, prices use integer kopecks, inventory is finite and non-negative, backorders are false, rerunning import yields byte-identical output, duplicate SKU/input keys fail closed, and frontend types/fixtures remain compatible with the versioned JSON schema.

- [x] **Step 2: Run RED**

Run: `npm run check:commerce-catalog-contract`
Expected: FAIL because the contract fields and importer do not exist.

- [x] **Step 3: Add the Strapi immutable integration field**

Add `commerce_key` as required unique text for commerce-enabled records. Do not make slug the relation key and do not add prices/stock/orders to Strapi.

- [x] **Step 4: Implement deterministic import generation**

Expose `buildCommerceProduct(row)`, `buildCommerceVariants(row)`, `formatSku(productKey, size)`, and `validateImport(document)`; output a reviewable JSON artifact without writing Medusa.

- [x] **Step 5: Add controlled initial inventory fixture rules**

Require explicit per-variant inventory input. Permit `1000` as a normal value; reject missing, negative, fractional or implicit infinite stock.

- [x] **Step 6: Run GREEN and existing catalog gates**

Run: `npm run check:commerce-catalog-contract && npm run check:catalog-api && npm run typecheck`
Expected: all PASS.

- [x] **Step 7: Commit Task 3**

```bash
git add commerce-contracts/catalog-v1.schema.json src/commerce/contracts.ts scripts/commerce/build-medusa-catalog-import.mjs scripts/check-commerce-catalog-contract.mjs strapi-catalog/src/api/product/content-types/product/schema.json strapi-catalog/src/api/catalog/controllers/catalog-feed.js src/catalog/catalog-api.ts package.json
git commit -m "feat(commerce): define product variant ownership contract"
```

#### Execution Results — Task 3

- Tests added: executable contract/import gate covering immutable product keys, one explicit variant per allowed size, deterministic SKU/order/output, integer kopeck prices, finite non-negative managed inventory, disabled backorders, duplicate rejection and JSON-schema/TypeScript field parity.
- RED: `npm run check:commerce-catalog-contract` → exit 1 with `ERR_MODULE_NOT_FOUND` for the not-yet-created importer.
- GREEN: `npm run check:commerce-catalog-contract` → exit 0, `Commerce catalog contract: PASS`.
- Regression: `npm run check:catalog-api` → exit 0 against the local Strapi/API stack; `npm run typecheck` → exit 0.
- Runtime smoke: Strapi live-reloaded the required/unique `commerce_key` schema and returned `204 /_health`; API, Vite catalog and Medusa returned HTTP 200.
- Ownership ruling: Strapi supplies only immutable identity, content and allowed sizes. Each variant's kopeck price and finite inventory are explicit commerce import inputs and are never inferred from Strapi `price_rub`.
- Remote actions: none; no push, deploy, PR or external environment change.

### Task 4: Implement idempotent Medusa catalog reconciliation

**Files:**
- Create: `medusa-commerce/src/workflows/catalog-sync/`
- Create: `medusa-commerce/src/scripts/import-strapi-catalog.ts`
- Create: `medusa-commerce/integration-tests/catalog-sync.spec.ts`
- Create: `scripts/commerce/reconcile-catalog.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 3 import document.
- Produces: `syncCatalog(input: CatalogImport): Promise<CatalogSyncReport>`.
- Produces: report counts for created/updated/unchanged/rejected products and variants; never deletes without an explicit reviewed deletion mode.

- [x] **Step 1: Write failing Medusa integration tests**

Test first import, no-op rerun, changed price, changed inventory, added size, removed size becoming unpublished rather than deleted, duplicate key rejection and transaction rollback on a mid-batch error.

- [x] **Step 2: Run RED**

Run: `npm run test:commerce -- catalog-sync.spec.ts`
Expected: FAIL because workflow/service do not exist.

- [x] **Step 3: Implement the sync workflow**

Use Medusa workflows and product/inventory/pricing modules. Keep descriptive content read-only and store only integration references needed by commerce.

- [x] **Step 4: Implement dry-run reconciliation**

Expose a root command that compares Strapi export with Medusa and exits non-zero for missing links, duplicate SKUs, price mismatches or unexpected published variants.

- [x] **Step 5: Run GREEN and record a zero-diff rerun**

Run: `npm run test:commerce -- catalog-sync.spec.ts && npm run commerce:catalog:import && npm run commerce:catalog:reconcile`
Expected: tests PASS; second import is a no-op; reconciliation reports zero unexpected differences.

- [x] **Step 6: Commit Task 4**

```bash
git add medusa-commerce/src/workflows/catalog-sync medusa-commerce/src/scripts/import-strapi-catalog.ts medusa-commerce/integration-tests/catalog-sync.spec.ts scripts/commerce/reconcile-catalog.mjs package.json
git commit -m "feat(commerce): sync Strapi products into Medusa variants"
```

#### Execution Results — Task 4

- Tests added: 5 Node/TypeScript integration scenarios for initial create, byte-stable no-op rerun, price/inventory updates with stable IDs, additive/removal lifecycle, duplicate rejection and whole-batch rollback.
- RED: `npm run test:commerce -- catalog-sync.spec.ts` → exit 1 because `src/workflows/catalog-sync` did not exist.
- GREEN: `npm run test:commerce -- catalog-sync.spec.ts` → 5/5 PASS.
- Real Medusa smoke: a temporary `LOCAL-SMOKE` product was created through Product/Pricing/Inventory Core workflows; its second import reported one unchanged product/variant and reconciliation returned zero differences. It was then removed through `deleteProductsWorkflow`.
- Reconciliation checks: missing/unexpected product links, duplicate/missing/unexpected SKUs, title/Strapi-link drift, RUB-price drift and stocked-inventory drift.
- Final local gate: `npm run test:commerce -- catalog-sync.spec.ts && npm run commerce:catalog:import && npm run commerce:catalog:reconcile && npm run build:commerce && npm run typecheck` → exit 0; Medusa backend/Admin builds succeeded.
- Safety: removed sizes are retained with zero stock and `grassigrosso_published=false`; only compensating rollback may delete entities created by the failed batch. Normal reconciliation never deletes catalog entities.
- Remote actions: none; no push, deploy, PR or external environment change.

### Task 5: Add BFF composition and fail-closed readiness

**Files:**
- Create: `server/commerce/commerce-client.cjs`
- Create: `server/commerce/commerce-readiness.cjs`
- Create: `server/commerce/catalog-projection.cjs`
- Create: `server/commerce/routes/catalog-routes.cjs`
- Create: `scripts/check-commerce-readiness.mjs`
- Modify: `server.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `getCommerceReadiness(scope: CommerceScope): Promise<CommerceReadiness>`.
- Produces: `composeCatalogProduct(content, trading): CatalogProductProjection`.
- Produces: `GET /api/commerce/catalog`, `GET /api/commerce/products/:key`, `GET /api/commerce/readiness`.
- `CommerceScope` is `catalog | product | favourites | smartSelector | cart | checkout | auth | profile | orders`.
- `CommerceReadiness` includes `ready`, `status`, `failedDependencies`, and `requestId`; it never includes secrets or raw upstream errors.

- [ ] **Step 1: Write failing readiness/route tests**

Assert: both systems healthy returns composed data; Strapi failure returns `503` for catalog/product/favourites/smartSelector; Medusa failure returns `503` for every commerce scope; malformed upstream contract also returns `503`; marketing/legal routes remain `200`; no session/disk snapshot bypasses the gate; response includes `Retry-After`, `noindex` signal and request ID.

- [ ] **Step 2: Run RED**

Run: `npm run check:commerce-readiness`
Expected: FAIL because routes and gate are absent.

- [ ] **Step 3: Implement typed clients and readiness decisions**

Set bounded timeouts, normalize upstream failures, and avoid logging response bodies that may contain personal data.

- [ ] **Step 4: Implement catalog projection**

Join exclusively by immutable integration key. Reject orphaned, duplicate or incomplete joins instead of choosing an arbitrary record.

- [ ] **Step 5: Register focused routes in `server.cjs`**

Keep `server.cjs` as composition root; do not move commerce orchestration back into the monolith.

- [ ] **Step 6: Run GREEN and existing server gates**

Run: `npm run check:commerce-readiness && npm run check:catalog-api && npm run check:routes && npm run typecheck`
Expected: all PASS.

- [ ] **Step 7: Commit Task 5**

```bash
git add server/commerce server.cjs scripts/check-commerce-readiness.mjs package.json
git commit -m "feat(api): add fail-closed commerce projection"
```

---

## Phase 2 — Storefront product journey

### Task 6: Add full product routes and remove quick view

**Files:**
- Create: `product.html`
- Create: `service-unavailable.html`
- Create: `src/components/pages/ProductPage.tsx`
- Create: `src/components/pages/CommerceUnavailablePage.tsx`
- Create: `src/components/commerce/product/`
- Create: `src/components/pages/product-page.module.css`
- Create: `scripts/check-product-page.mjs`
- Modify: `src/components/app/ReactIslandRoot.tsx`
- Modify: `src/components/catalog-page/cards.tsx`
- Modify: `src/catalog/catalog-card.ts`
- Modify: `src/catalog/catalog-modal.ts`
- Modify: `src/catalog/catalog-modals-bootstrap.ts`
- Modify: `catalog.html`
- Modify: `vite.config.mjs`
- Modify: `server.cjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: Task 5 `GET /api/commerce/products/:key`.
- Produces: clean route `/catalog/:slug` resolved by server/Vite without `.html`.
- Produces: `ProductVariantSelector` emitting the selected immutable variant ID.
- Removes: product quick-view open path on desktop and mobile; image-modal/gallery behavior on the full product page remains separate.

- [ ] **Step 1: Write failing browser tests**

Assert card/photo/title navigation to product page; favourite/share controls do not navigate; no quick-view trigger/modal exists at desktop or mobile; product page renders gallery/content, updates price/stock by selected size, disables zero-stock variants, and returns the service-unavailable surface on `503`.

- [ ] **Step 2: Run RED**

Run: `npm run check:product-page`
Expected: FAIL because route/page and revised card contract do not exist.

- [ ] **Step 3: Add product HTML/React route and explicit unavailable surface**

Preserve required critical CSS, Yandex Metrica, fonts, icons, manifest, preloader, cookie banner and root asset paths. Map gated commerce `503` responses to the dedicated unavailable page with `Retry-After`, request ID and `noindex`; do not render stale catalog/product data.

- [ ] **Step 4: Implement product page components**

Split gallery, summary, variant selector, inventory message, quantity and secondary actions into focused components. Purchase action stays disabled until Task 9.

- [ ] **Step 5: Remove quick-view code paths**

Delete only product quick-view ownership; preserve filter-help, share, forms and media gallery modals. Remove dead selectors/tests rather than leaving hidden fallback markup.

- [ ] **Step 6: Run GREEN and catalog regression gates**

Run: `npm run check:product-page && npm run check:catalog-ui && npm run check:modal-system && npm run typecheck && npm run build:web`
Expected: all PASS.

- [ ] **Step 7: Commit Task 6**

```bash
git add product.html service-unavailable.html src/components/pages/ProductPage.tsx src/components/pages/CommerceUnavailablePage.tsx src/components/pages/product-page.module.css src/components/commerce/product src/components/app/ReactIslandRoot.tsx src/components/catalog-page/cards.tsx src/catalog/catalog-card.ts src/catalog/catalog-modal.ts src/catalog/catalog-modals-bootstrap.ts catalog.html vite.config.mjs server.cjs scripts/check-product-page.mjs package.json
git commit -m "feat(catalog): add full product pages"
```

### Task 7: Implement share and secondary manager contact

**Files:**
- Create: `docs/commerce/max-share-contract.md`
- Create: `src/components/commerce/share/ProductShare.tsx`
- Create: `src/components/commerce/share/product-share.module.css`
- Create: `src/commerce/share.ts`
- Create: `scripts/check-product-share.mjs`
- Modify: `src/components/catalog-page/cards.tsx`
- Modify: `src/components/pages/ProductPage.tsx`
- Modify: `src/catalog/catalog-share.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `shareProduct(input: ProductShareInput, env: ShareEnvironment): Promise<ShareOutcome>`.
- Mobile uses Web Share API first; desktop or unsupported/cancelled mobile uses the unified Dialog fallback.
- MAX target remains disabled/hidden until Task 7 contains a test against an official supported URL/deep-link contract; no guessed endpoint is allowed.

- [ ] **Step 1: Write failing share tests**

Assert canonical URL use, native mobile invocation, fallback on unsupported API, copy success/failure, VK URL encoding, MAX absence without validated contract, and manager-contact action containing product title plus canonical URL. Assert share button never navigates the card.

- [ ] **Step 2: Run RED**

Run: `npm run check:product-share`
Expected: FAIL.

- [ ] **Step 3: Verify and record the MAX sharing contract**

Check current official MAX developer/product documentation and record the supported web/deep-link contract, source URL and verification date. If no official contract exists, record that result and keep the target hidden; do not infer a URL from third-party examples.

- [ ] **Step 4: Implement share service and UI**

Use existing unified modal shell and accessible focus restoration. Treat native share cancellation as a user cancellation, not an error notification.

- [ ] **Step 5: Run GREEN**

Run: `npm run check:product-share && npm run check:product-page && npm run check:modal-system && npm run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit Task 7**

```bash
git add docs/commerce/max-share-contract.md src/components/commerce/share src/commerce/share.ts src/components/catalog-page/cards.tsx src/components/pages/ProductPage.tsx src/catalog/catalog-share.ts scripts/check-product-share.mjs package.json
git commit -m "feat(catalog): add product sharing actions"
```

### Task 8: Migrate favourites to guest/server merge

**Files:**
- Create: `medusa-commerce/src/modules/favourites/`
- Create: `medusa-commerce/src/api/store/favourites/`
- Create: `medusa-commerce/integration-tests/favourites.spec.ts`
- Create: `src/commerce/favourites-store.ts`
- Create: `src/components/pages/FavouritesPage.tsx`
- Create: `favourites.html`
- Create: `scripts/check-commerce-favourites.mjs`
- Modify: `src/catalog/catalog-favourites.ts`
- Modify: `src/catalog/catalog-favourites-ui.ts`
- Modify: `src/components/app/ReactIslandRoot.tsx`
- Modify: `vite.config.mjs`
- Modify: `server.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `mergeGuestFavourites(localIds, serverIds): FavouriteMergeResult` using set union.
- Produces: authenticated CRUD endpoints keyed by immutable product ID.
- Preserves: guest local favourites with a versioned schema.

- [ ] **Step 1: Write failing merge/API/browser tests**

Assert guest add/remove, schema migration, duplicate union, repeated idempotent merge, unavailable item retention with status, no local deletion before acknowledged server commit, retry after interrupted merge, separate favourites page and fail-closed `503` behavior.

- [ ] **Step 2: Run RED**

Run: `npm run test:commerce -- favourites.spec.ts && npm run check:commerce-favourites`
Expected: FAIL.

- [ ] **Step 3: Implement the Medusa favourites module/API**

Enforce customer ownership server-side; never accept a customer ID from the browser as authorization.

- [ ] **Step 4: Implement versioned guest store and merge**

Keep deterministic pending/synced markers so browser interruption cannot lose local items.

- [ ] **Step 5: Add favourites page and card integration**

Route through BFF projections; do not render stale local product details when dependencies fail.

- [ ] **Step 6: Run GREEN**

Run: `npm run test:commerce -- favourites.spec.ts && npm run check:commerce-favourites && npm run check:catalog-ui && npm run typecheck && npm run build:web`
Expected: all PASS.

- [ ] **Step 7: Commit Task 8**

```bash
git add medusa-commerce/src/modules/favourites medusa-commerce/src/api/store/favourites medusa-commerce/integration-tests/favourites.spec.ts src/commerce/favourites-store.ts src/components/pages/FavouritesPage.tsx favourites.html src/catalog/catalog-favourites.ts src/catalog/catalog-favourites-ui.ts src/components/app/ReactIslandRoot.tsx vite.config.mjs server.cjs scripts/check-commerce-favourites.mjs package.json
git commit -m "feat(commerce): merge guest and account favourites"
```

---

## Phase 3 — Cart, account, profile and checkout shell

### Task 9: Implement guest cart and cart page

**Files:**
- Create: `src/commerce/cart-client.ts`
- Create: `src/components/pages/CartPage.tsx`
- Create: `src/components/commerce/cart/`
- Create: `cart.html`
- Create: `scripts/check-commerce-cart.mjs`
- Create: `medusa-commerce/integration-tests/cart.spec.ts`
- Modify: `src/components/pages/ProductPage.tsx`
- Modify: `src/components/app/ReactIslandRoot.tsx`
- Modify: `vite.config.mjs`
- Modify: `server.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: guest cart ID stored in secure same-site browser/server contract; cart lines always reference variant IDs.
- Produces: add/update/remove/revalidate methods that never accept browser price totals.

- [ ] **Step 1: Write failing cart tests**

Assert add selected variant, update quantity, remove, server-side price/stock calculation, zero-stock rejection, stale-price response, unavailable variant handling, concurrent last-unit protection boundary, reload persistence and Medusa-down `503`.

- [ ] **Step 2: Run RED**

Run: `npm run test:commerce -- cart.spec.ts && npm run check:commerce-cart`
Expected: FAIL.

- [ ] **Step 3: Implement BFF/cart client and product add action**

Use Medusa Store API through the backend boundary. Do not expose secret keys or trust client totals.

- [ ] **Step 4: Add cart route/page**

Show per-line size/SKU/price/availability and delivery-excluded copy. Checkout action remains connected to the system payment provider until Task 13.

- [ ] **Step 5: Run GREEN**

Run: `npm run test:commerce -- cart.spec.ts && npm run check:commerce-cart && npm run check:product-page && npm run typecheck && npm run build:web`
Expected: all PASS.

- [ ] **Step 6: Commit Task 9**

```bash
git add src/commerce/cart-client.ts src/components/pages/CartPage.tsx src/components/commerce/cart cart.html scripts/check-commerce-cart.mjs medusa-commerce/integration-tests/cart.spec.ts src/components/pages/ProductPage.tsx src/components/app/ReactIslandRoot.tsx vite.config.mjs server.cjs package.json
git commit -m "feat(commerce): add guest cart"
```

### Task 10: Implement email/password account and lossless guest merge

**Files:**
- Create: `src/commerce/auth-client.ts`
- Create: `src/components/commerce/auth/`
- Create: `server/commerce/routes/auth-routes.cjs`
- Create: `medusa-commerce/integration-tests/customer-auth.spec.ts`
- Create: `scripts/check-commerce-auth.mjs`
- Modify: `server.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: register, verify-email, login, logout, forgot-password and reset-password flows.
- Produces: `mergeGuestState({ guestCartId, localFavouriteIds }): Promise<MergeReceipt>` after authentication.
- Uses: generic MIT Core authentication only; no Enterprise OIDC/SSO.

- [ ] **Step 1: Write failing auth/security tests**

Assert explicit account creation, email verification, password reset single use/expiry, secure cookies, CSRF posture, rate limits, generic credential errors, session rotation, logout invalidation, idempotent cart/favourites merge and no loss during a partial merge failure.

- [ ] **Step 2: Run RED**

Run: `npm run test:commerce -- customer-auth.spec.ts && npm run check:commerce-auth`
Expected: FAIL.

- [ ] **Step 3: Implement focused auth BFF routes and UI**

Never log passwords/tokens. Use Medusa auth provider contracts and local notification provider for verification/reset messages.

- [ ] **Step 4: Implement post-login merge receipt**

Commit cart and favourites independently but return a resumable receipt; clear guest state only after each acknowledged merge.

- [ ] **Step 5: Run GREEN and security scans**

Run: `npm run test:commerce -- customer-auth.spec.ts && npm run check:commerce-auth && npm run check:personal-data && npm run typecheck`
Expected: all PASS.

- [ ] **Step 6: Commit Task 10**

```bash
git add src/commerce/auth-client.ts src/components/commerce/auth server/commerce/routes/auth-routes.cjs medusa-commerce/integration-tests/customer-auth.spec.ts scripts/check-commerce-auth.mjs server.cjs package.json
git commit -m "feat(commerce): add customer email authentication"
```

### Task 11: Add profile, guest order access and checkout data collection

**Files:**
- Create: `profile.html`
- Create: `checkout.html`
- Create: `order.html`
- Create: `src/components/pages/ProfilePage.tsx`
- Create: `src/components/pages/CheckoutPage.tsx`
- Create: `src/components/pages/OrderPage.tsx`
- Create: `src/components/commerce/profile/`
- Create: `src/components/commerce/checkout/`
- Create: `src/components/commerce/order/`
- Create: `server/commerce/routes/profile-routes.cjs`
- Create: `server/commerce/routes/checkout-routes.cjs`
- Create: `server/commerce/routes/order-routes.cjs`
- Create: `scripts/check-commerce-checkout.mjs`
- Create: `medusa-commerce/integration-tests/checkout.spec.ts`
- Modify: `src/components/app/ReactIslandRoot.tsx`
- Modify: `vite.config.mjs`
- Modify: `server.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `CheckoutContact { name; email; phone; region; city; preferredContact; comment?; consentVersion }`.
- Produces: authenticated order history and signed, expiring guest order lookup.
- Explicitly excludes: full address and delivery amount from initial payment.

- [ ] **Step 1: Write failing checkout/profile/order tests**

Assert guest and authenticated checkout; required normalized fields; malformed phone/email rejection; explicit versioned consents; no full-address requirement; delivery-excluded copy; no silent account creation; order ownership; guest signed-link expiry/non-enumerability; profile has orders/favourites/contact data but no smart-selector profile.

- [ ] **Step 2: Run RED**

Run: `npm run test:commerce -- checkout.spec.ts && npm run check:commerce-checkout`
Expected: FAIL.

- [ ] **Step 3: Implement checkout DTO validation and BFF routes**

Reject unknown sensitive fields rather than storing arbitrary payload. Sanitize free-text comment for output and notifications.

- [ ] **Step 4: Implement checkout/profile/order pages**

Retain mandatory page shell contracts and use data attributes rather than CSS Module hashes for browser-test hooks.

- [ ] **Step 5: Run GREEN and legal route gates**

Run: `npm run test:commerce -- checkout.spec.ts && npm run check:commerce-checkout && npm run check:routes && npm run check:personal-data && npm run typecheck && npm run build:web`
Expected: all PASS.

- [ ] **Step 6: Commit Task 11**

```bash
git add profile.html checkout.html order.html src/components/pages/ProfilePage.tsx src/components/pages/CheckoutPage.tsx src/components/pages/OrderPage.tsx src/components/commerce/profile src/components/commerce/checkout src/components/commerce/order server/commerce/routes/profile-routes.cjs server/commerce/routes/checkout-routes.cjs server/commerce/routes/order-routes.cjs scripts/check-commerce-checkout.mjs medusa-commerce/integration-tests/checkout.spec.ts src/components/app/ReactIslandRoot.tsx vite.config.mjs server.cjs package.json
git commit -m "feat(commerce): add checkout and customer profile"
```

---

## Phase 4 — Reservation, order operations and delivery contact

### Task 12: Implement 30-minute reservation and durable delivery workflow

**Files:**
- Create: `medusa-commerce/src/workflows/payment-reservation/`
- Create: `medusa-commerce/src/workflows/delivery-contact/`
- Create: `medusa-commerce/src/jobs/expire-payment-reservations.ts`
- Create: `medusa-commerce/src/subscribers/order-paid.ts`
- Create: `medusa-commerce/integration-tests/payment-reservation.spec.ts`
- Create: `medusa-commerce/integration-tests/delivery-contact.spec.ts`
- Create: `scripts/check-commerce-operations.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `reserveForPayment(cartId, now): PaymentReservation` with `expiresAt = now + 30 minutes`.
- Produces: `reconcileBeforeRelease(reservationId): ReservationResolution`.
- Produces order state `paid_awaiting_delivery_contact` and one durable manager task per paid order.

- [ ] **Step 1: Write failing reservation/concurrency tests**

Assert exact 30-minute expiry, last-unit contention, no backorder, successful payment retention, failed payment release, reconciliation before timed release, delayed success after release entering `manual_review`, repeated job idempotency and process restart recovery.

- [ ] **Step 2: Write failing delivery-operation tests**

Assert one manager task per paid order, retry after notification failure, no rollback of payment/order when notification fails, delivery fields editable only by trusted admin flow, and state progression through agreement/preparation/shipping/completion.

- [ ] **Step 3: Run RED**

Run: `npm run test:commerce -- payment-reservation.spec.ts delivery-contact.spec.ts && npm run check:commerce-operations`
Expected: FAIL.

- [ ] **Step 4: Implement reservation workflow/job**

Use database-backed state/locking; do not rely on browser timers or in-memory-only timeouts.

- [ ] **Step 5: Implement delivery contact workflow**

Persist task status and notification attempts. The first channel can use the existing server notification infrastructure only after it proves durable retry semantics.

- [ ] **Step 6: Run GREEN**

Run: `npm run test:commerce -- payment-reservation.spec.ts delivery-contact.spec.ts && npm run check:commerce-operations`
Expected: all PASS, including restart and concurrency cases.

- [ ] **Step 7: Commit Task 12**

```bash
git add medusa-commerce/src/workflows/payment-reservation medusa-commerce/src/workflows/delivery-contact medusa-commerce/src/jobs/expire-payment-reservations.ts medusa-commerce/src/subscribers/order-paid.ts medusa-commerce/integration-tests/payment-reservation.spec.ts medusa-commerce/integration-tests/delivery-contact.spec.ts scripts/check-commerce-operations.mjs package.json
git commit -m "feat(commerce): reserve inventory and queue delivery contact"
```

---

## Phase 5 — Т-Банк and fiscal sandbox

### Task 13: Implement the Т-Банк payment provider

**Files:**
- Create: `medusa-commerce/src/modules/tbank-payment/index.ts`
- Create: `medusa-commerce/src/modules/tbank-payment/service.ts`
- Create: `medusa-commerce/src/modules/tbank-payment/types.ts`
- Create: `medusa-commerce/src/modules/tbank-payment/signature.ts`
- Create: `medusa-commerce/src/modules/tbank-payment/client.ts`
- Create: `medusa-commerce/integration-tests/tbank-payment.spec.ts`
- Create: `server/commerce/tbank-notification.cjs`
- Create: `server/commerce/routes/payment-routes.cjs`
- Create: `scripts/check-tbank-payment.mjs`
- Modify: `medusa-commerce/medusa-config.ts`
- Modify: `server.cjs`
- Modify: `.env.commerce.example`
- Modify: `package.json`

**Interfaces:**
- Implements the pinned Medusa `AbstractPaymentProvider` contract used by the selected Core version.
- Produces normalized operations for initialize, authorize/status, cancel, capture if applicable, refund and webhook update.
- Consumes integer kopecks only.
- Stores provider `PaymentId`, status and safe reconciliation metadata; secrets never enter session data exposed to storefront.

- [ ] **Step 1: Freeze the T-Банк protocol fixture from official documentation**

Commit sanitized request/response fixtures for Init, status, success/failure notification, cancel/refund and Receipt. Record whether the merchant contract uses one-stage or two-stage payment; if still unknown, stop this phase rather than implement both speculatively.

- [ ] **Step 2: Write failing signature/client/provider tests**

Assert canonical token construction, constant-time comparison, integer amount handling, timeout/retry classification, secret redaction, state mapping, idempotency key reuse and no duplicate remote operation on retry.

- [ ] **Step 3: Write failing notification adversarial tests**

Assert valid, forged, duplicate, reordered and amount/currency/order-mismatched notifications; browser success URL alone leaves payment pending; delayed success routes through Task 12 resolution.

- [ ] **Step 4: Run RED**

Run: `npm run test:commerce -- tbank-payment.spec.ts && npm run check:tbank-payment`
Expected: FAIL.

- [ ] **Step 5: Implement client, signature and provider**

Keep transport, cryptographic normalization and Medusa lifecycle mapping in separate files. Accept provider callbacks only through the backend route with raw-body requirements preserved where the protocol needs them.

- [ ] **Step 6: Run GREEN with local mock server**

Run: `npm run test:commerce -- tbank-payment.spec.ts && npm run check:tbank-payment`
Expected: all deterministic mock scenarios PASS without production credentials.

- [ ] **Step 7: Run sandbox contract tests when credentials are explicitly supplied**

Run: `TBANK_SANDBOX=1 npm run check:tbank-payment:sandbox`
Expected: init, payment status, failure path and refund PASS; command skips with an explicit non-green status when credentials are absent, and the phase remains incomplete.

- [ ] **Step 8: Commit Task 13**

```bash
git add medusa-commerce/src/modules/tbank-payment medusa-commerce/integration-tests/tbank-payment.spec.ts server/commerce/tbank-notification.cjs server/commerce/routes/payment-routes.cjs scripts/check-tbank-payment.mjs medusa-commerce/medusa-config.ts server.cjs .env.commerce.example package.json
git commit -m "feat(payments): integrate T-Bank acquiring"
```

### Task 14: Add KKT/OFD receipt lifecycle

**Files:**
- Create: `medusa-commerce/src/modules/tbank-payment/receipt.ts`
- Create: `medusa-commerce/src/workflows/fiscalization/`
- Create: `medusa-commerce/integration-tests/fiscalization.spec.ts`
- Create: `scripts/check-commerce-fiscalization.mjs`
- Modify: `medusa-commerce/src/modules/tbank-payment/service.ts`
- Modify: `src/components/pages/CheckoutPage.tsx`
- Modify: `.env.commerce.example`
- Modify: `package.json`

**Interfaces:**
- Produces: `buildReceipt(order, customer, fiscalConfig): TBankReceipt`.
- Produces: fiscal state `pending | succeeded | failed_manual_review` linked to payment/order operation.
- Requires: exact selected KKT/OFD provider and FFD settings recorded before implementation.

- [ ] **Step 1: Write failing receipt/refund tests**

Assert line names, quantities, integer kopecks, total equality, tax/payment method/object settings, email/phone presence, Internet-payment marker requirements, full refund receipt and partial refund receipt. Reject mismatched totals or missing mandatory fiscal configuration.

- [ ] **Step 2: Run RED**

Run: `npm run test:commerce -- fiscalization.spec.ts && npm run check:commerce-fiscalization`
Expected: FAIL.

- [ ] **Step 3: Implement receipt builder and fiscal workflow**

Do not silently mark payment/order failed when fiscal delivery fails; persist the fiscal incident and alert operators for legally required remediation.

- [ ] **Step 4: Run GREEN and sandbox fiscal check**

Run: `npm run test:commerce -- fiscalization.spec.ts && npm run check:commerce-fiscalization && TBANK_SANDBOX=1 npm run check:tbank-payment:sandbox`
Expected: all PASS, including full and partial refund receipt flows.

- [ ] **Step 5: Commit Task 14**

```bash
git add medusa-commerce/src/modules/tbank-payment/receipt.ts medusa-commerce/src/workflows/fiscalization medusa-commerce/integration-tests/fiscalization.spec.ts scripts/check-commerce-fiscalization.mjs medusa-commerce/src/modules/tbank-payment/service.ts src/components/pages/CheckoutPage.tsx .env.commerce.example package.json
git commit -m "feat(payments): add fiscal receipt lifecycle"
```

---

## Phase 6 — Legal, observability and local acceptance

### Task 15: Update personal-data and consumer legal surfaces

**Files:**
- Modify: legal Markdown/DOCX sources identified by `docs/superpowers/specs/2026-09-14-personal-data-documents-legal-corrections-design.md`
- Modify: `src/components/pages/legal-content.tsx`
- Modify: `src/pages/legal-page-contract.ts`
- Modify: relevant Strapi legal fixtures/content types
- Modify: `scripts/check-personal-data.mjs`
- Create: `scripts/check-commerce-legal.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: versioned consent identifiers consumed by Task 11 checkout records.
- Covers: account, orders, payment, KKT/OFD, delivery coordination, retention, recipients and customer rights.

- [ ] **Step 1: Write failing legal contract checks**

Assert required seller identity, payment/delivery separation, return information, account/order processing purposes, consent version, T-Банк/KKT/OFD recipient categories, Russian storage contour and absence of claims not implemented in code.

- [ ] **Step 2: Run RED**

Run: `npm run check:commerce-legal && npm run check:personal-data`
Expected: FAIL on missing commerce disclosures/contracts.

- [ ] **Step 3: Update sources and generated documents**

Treat legal text as counsel-review material; mark only business identifiers requiring human confirmation, not implementation requirements.

- [ ] **Step 4: Verify GREEN and render document outputs**

Run: `npm run check:commerce-legal && npm run check:personal-data && npm run check:pages-cms-hydrate-dom && npm run build:web`
Expected: all PASS; every generated document page is rendered and visually reviewed.

- [ ] **Step 5: Commit Task 15**

Commit only reviewed legal sources, generated artifacts, fixtures and checks with an explicit docs/legal commit message.

### Task 16: Add observability, retention and incident runbooks

**Files:**
- Create: `server/commerce/commerce-metrics.cjs`
- Create: `server/commerce/redaction.cjs`
- Create: `scripts/check-commerce-observability.mjs`
- Create: `docs/runbooks/commerce-payment-incident.md`
- Create: `docs/runbooks/commerce-backup-restore.md`
- Create: `docs/runbooks/commerce-dependency-outage.md`
- Create: `docs/runbooks/commerce-data-retention.md`
- Modify: commerce routes/workflows created earlier
- Modify: `package.json`

**Interfaces:**
- Produces metrics named for checkout, reservation, payment, webhook, reconciliation, fiscalization, notification backlog and order-state age.
- Produces centralized `redactCommerceLog(value)` used before structured logging.

- [ ] **Step 1: Write failing metrics/redaction tests**

Assert email, phone, comments, passwords, tokens, provider credentials and raw payloads are absent from logs/analytics; assert required counters/timers and request IDs appear for success/failure paths.

- [ ] **Step 2: Run RED**

Run: `npm run check:commerce-observability`
Expected: FAIL.

- [ ] **Step 3: Implement redaction and instrumentation**

Keep metric labels bounded; never use customer/order IDs as unbounded labels.

- [ ] **Step 4: Write executable runbooks**

Include exact local commands, decision points, safe retry actions, backup restore verification and escalation conditions. Do not include production secrets.

- [ ] **Step 5: Run GREEN**

Run: `npm run check:commerce-observability && npm run check:personal-data`
Expected: all PASS.

- [ ] **Step 6: Commit Task 16**

```bash
git add server/commerce/commerce-metrics.cjs server/commerce/redaction.cjs scripts/check-commerce-observability.mjs docs/runbooks package.json
git commit -m "feat(commerce): add operations observability"
```

### Task 17: Full local acceptance and cutover package

**Files:**
- Create: `scripts/check-commerce-e2e.mjs`
- Create: `scripts/check-commerce-security.mjs`
- Create: `scripts/check-commerce-performance.mjs`
- Create: `docs/runbooks/commerce-cutover.md`
- Create: `docs/runbooks/commerce-rollback.md`
- Modify: `package.json`
- Modify: `docs/superpowers/plans/2026-10-23-medusa-commerce-transition.md`

**Interfaces:**
- Produces: `npm run check:commerce` as the complete local gate.
- Produces: a cutover package only; does not authorize push/deploy.

- [ ] **Step 1: Write the end-to-end acceptance harness**

Cover guest browse → product → favourite/share → cart → checkout → mocked/sandbox payment → paid order → manager task → delivery states; repeat for authenticated customer and guest-to-account merge.

- [ ] **Step 2: Add outage and adversarial suites**

Exercise Strapi down, Medusa down, malformed dependency response, T-Банк timeout, duplicate/reordered/forged webhook, amount mismatch, delayed success after expiry, fiscal failure and notification failure. Assert fail-closed behavior and recovery.

- [ ] **Step 3: Add local security and performance budgets**

Check secret leakage, cookies/CSRF/rate limits, dependency vulnerabilities with reviewed exceptions, product/catalog/cart/checkout latency, bundle size and catalog performance regression.

- [ ] **Step 4: Run the complete local gate**

Run: `npm run check:medusa-license && npm run check:commerce && npm run check && npm run check:catalog-ui && npm run check:catalog-perf && npm run check:personal-data && npm run typecheck && npm run build`
Expected: every command PASS. A skipped sandbox/KKT check, unreviewed vulnerability, failed legal check, missing backup restore, or uncovered scenario keeps the plan incomplete.

- [ ] **Step 5: Perform manual local supplemental smoke**

Inspect desktop/mobile catalog, product, share fallback/native path where available, favourites, cart, checkout, profile, order, Russian Medusa Admin, `503` service pages and accessibility focus flows. Record viewports and results; manual smoke does not replace Step 4.

- [ ] **Step 6: Execute a backup/restore and process-restart drill**

Restore Strapi, Medusa PostgreSQL, media and queue state into fresh local services; resume a pending reservation/reconciliation and verify no duplicate order/payment/notification.

- [ ] **Step 7: Write cutover and rollback runbooks**

Document data freeze, final reconcile, feature switch, health checks, rollback thresholds and recovery. Stop before any remote action.

- [ ] **Step 8: Record all evidence in this plan and commit Task 17**

```bash
git add scripts/check-commerce-e2e.mjs scripts/check-commerce-security.mjs scripts/check-commerce-performance.mjs docs/runbooks/commerce-cutover.md docs/runbooks/commerce-rollback.md package.json docs/superpowers/plans/2026-10-23-medusa-commerce-transition.md
git commit -m "test(commerce): complete local acceptance gate"
```

## Phase Completion Rules

After every phase, append an `Execution Results` subsection containing:

- tests added;
- exact commands run;
- exit codes and meaningful result counts;
- known limitations;
- migrations and rollback notes;
- confirmation that no remote action occurred.

A phase remains `in_progress` when any required automated test is missing, skipped, failing, or not reproducible locally. The next phase must not start until the open gate is resolved or the user explicitly changes scope in the spec.

## Plan Completion Criteria

- All 17 tasks are complete with atomic commits and recorded evidence.
- The full local gate in Task 17 passes without skipped mandatory integrations.
- Commerce pages fail closed exactly as specified; independent marketing/legal pages remain available.
- All code, databases, queues, media, build inputs and backups are reproducible inside the controlled Russian contour.
- No Enterprise Medusa feature or Medusa Cloud runtime dependency is present.
- No push, deploy, PR, Timeweb change or production credential use occurred without a separate explicit user request.
