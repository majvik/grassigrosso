# Testing Patterns

**Analysis Date:** 2026-08-03

## Test Framework

**Runner:**
- No Jest / Vitest / Mocha / Playwright / Cypress unit or E2E suite detected
- Verification = **Node smoke scripts** + **TypeScript compiler** + GSD phase verify steps

**Assertion Library:**
- Manual: push human-readable strings into `failures[]`, then `process.exit(1)` if non-empty
- Browser: Chrome headless + CDP via `scripts/lib/catalog-chrome-session.mjs`
- Gate remote browser: `scripts/lib/catalog-smoke-env.mjs` (`shouldRunBrowserSmoke`)

**Run Commands:**
```bash
npm run typecheck                 # tsc --noEmit (strict)
npm run check:routes              # HTML + email routing contracts
npm run check:catalog-api         # live catalog API + snapshot files
npm run check:catalog-ui          # Chrome headless DOM smoke (local)
npm run check:catalog-perf        # API/HTML budgets + optional DOM metrics
npm run check                     # routes + catalog-api + typecheck
npm run catalog-import:validate   # markdown import frontmatter whitelist
```

**Env overrides:**

| Variable | Default | Used by |
|----------|---------|---------|
| `CATALOG_API_BASE_URL` | `http://127.0.0.1:3000` | `check:catalog-api`; perf API side |
| `CATALOG_UI_BASE_URL` | `http://127.0.0.1:5174` | `check:catalog-ui` |
| `CATALOG_PERF_BASE_URL` | falls back to UI base | `check:catalog-perf` |
| `CATALOG_UI_TIMEOUT_MS` | `45000` | UI smoke overall timeout |
| `CATALOG_PERF_TIMEOUT_MS` | `60000` | Perf overall timeout |
| `CATALOG_SMOKE_SKIP_BROWSER` | — | Force skip Chrome |
| `CATALOG_SMOKE_FORCE_BROWSER` | — | Force Chrome even on remote hosts |
| `CATALOG_PERF_MAX_CARDS` | `6` | Perf DOM card budget |
| `CATALOG_PERF_MAX_EAGER` | `2` | Perf eager image budget |
| `CATALOG_PERF_MAX_UPLOADS` | `10` | Perf `/uploads/` request budget |
| `CATALOG_PERF_MAX_DOM_NODES` | `900` | Perf DOM node budget |
| `CATALOG_PERF_MAX_LISTING_JSON` | `28000` | Listing JSON byte budget |
| `CHROME_PATH` | macOS Chrome app path | Headless binary override |

## Test File Organization

**Location:**
- Smokes live under `scripts/` — not co-located `*.test.ts`
- Shared helpers: `scripts/lib/`
- GSD verify expectations: `docs/superpowers/plans/*.md` (documentation, not executable)

**Naming:**
- `check-<domain>.mjs` — automated gates
- `validate-catalog-import.mjs` — offline import validation
- No `*.test.*` / `*.spec.*` files in the repo

**Structure:**
```
scripts/
├── check-routing-contracts.mjs   # static HTML + email label sync
├── check-catalog-api.mjs         # HTTP against running API + snapshots
├── check-catalog-ui.mjs          # Chrome CDP UI interactions
├── check-catalog-perf.mjs        # budgets (API/HTML ± browser)
├── validate-catalog-import.mjs   # docs/catalog-import markdown
└── lib/
    ├── catalog-chrome-session.mjs
    └── catalog-smoke-env.mjs
```

## Test Structure

**Suite Organization:**
Linear top-level scripts (no `describe`/`it`). Canonical pattern from `scripts/check-catalog-api.mjs`:

```javascript
const failures = []

async function readJson(path) {
  // fetch → on error push to failures, return null
}

const filters = await readJson('/api/catalog/filters')
if (filters) {
  // assert groups, slugs, product cross-refs
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}
console.log(`Catalog API ok: ${baseUrl}`)
```

**Patterns:**
- Setup: env `baseUrl`; optional `startCatalogChromeSession(baseUrl)`; overall `setTimeout` fail-safe
- Teardown: `cleanup()` on `exit` / `SIGINT`; kill Chrome; remove temp user-data dir
- Assertion: `if (!cond) failures.push(...)`; UI polling via `waitFor(evaluate, label, expression, timeoutMs)`

## Mocking

**Framework:** Not applicable — smokes hit real processes

**Patterns:**
```javascript
import { shouldRunBrowserSmoke } from './lib/catalog-smoke-env.mjs'

const runBrowser = shouldRunBrowserSmoke(baseUrl)
if (!runBrowser) {
  console.log(`Catalog UI smoke skipped for remote deploy: ${baseUrl}/catalog`)
  process.exit(0)
}
```

**What to Mock:**
- `npm run dev:api` injects fake SMTP/Telegram env in `package.json` — operational stub, not a test library
- Do not add Jest mocks; extend smoke scripts or CDP `Runtime.evaluate` expressions

**What NOT to Mock:**
- Live `/api/catalog/filters`, `/api/catalog/products`, `/api/catalog/hero-slides`
- `public/catalog-*.snapshot.json` and `public/catalog-snapshot.manifest.json` (real deploy artifacts)

## Fixtures and Factories

**Test Data:**
- UI smoke constants in `scripts/check-catalog-ui.mjs`: `EXPECTED_PRODUCT_COUNT = 43`, classic filter `'6'`, ordered size slugs `140x190`…`180x200`
- API smoke required groups/slugs in `scripts/check-catalog-api.mjs` (`requiredFilterGroups`, `requiredFilterSlugs`, mattress size order)
- Email labels fixture: `src/contracts/lead-routing.json` (consumed by `check:routes` and typed in `src/contracts/leads.ts`)

```json
{
  "labels": [
    "Главная страница",
    "Главная (КП)",
    "Страница \"Отелям\"",
    "Отелям (каталог)",
    "Страница \"Дилерам\"",
    "Страница \"Каталог\"",
    "Документы",
    "Документы (помощь)",
    "Страница \"Контакты\""
  ]
}
```

**Location:**
- `src/contracts/lead-routing.json` — form `page` label contract
- `public/catalog-products.snapshot.json`, `public/catalog-snapshot.manifest.json` — fallback + API smoke
- `docs/catalog-import/` — import markdown for `catalog-import:validate`
- Strapi seed: `strapi-catalog/database/seed/data.db` (content fixture for deploy, not unit tests)

## Coverage

**Requirements:** None enforced (no coverage tool)

**View Coverage:**
```bash
npm run check
npm run check:catalog-ui      # Vite + API + Strapi up
npm run check:catalog-perf
```

## Test Types

**Unit Tests:**
- Not used. Prefer smoke invariants + `typecheck` for regressions.

**Integration / contract smokes:**

`check:routes` (`scripts/check-routing-contracts.mjs`):
- HTML entries exist for clean routes; no internal `.html` hrefs
- Required head/body snippets (`vite-critical-css`, Metrika, preloader, `src/main.js`, …)
- Every `lead-routing.json` label appears in `server.cjs` `PAGE_EMAIL_ROUTING`
- Every label appears in client sources: `src/main.js`, `src/resource-modals.js`, `src/contact-forms.js`, `src/commercial-offer.js`

`check:catalog-api` (`scripts/check-catalog-api.mjs`):
- `/api/catalog/filters` — required groups; key slugs; size list order/length; filling display names (`Орто-пена`, `Нано-пена`)
- `/api/catalog/products` — item shape, gallery rules, slug membership vs filter sets, nanoFoam count ≥ 5
- `/api/catalog/products?view=listing` — slim gallery (≤1), no `sources[]`, smaller than full feed
- `/api/catalog/hero-slides` — image/video + `src`
- Snapshot manifest `productCount` ≥ 40, `productsSha256`, orient present in snapshot JSON

`catalog-import:validate` — frontmatter whitelist for collections/firmness/fillings/etc.

**E2E / Browser:**

`check:catalog-ui` (`scripts/check-catalog-ui.mjs`) — local only by default:
- Results count = 43; DOM cards ≤ 6 on first page; 6 visible
- Collection chip `classic` → 6 results
- Size select menu: exact standard slugs, banned oversized sizes
- Sort `height-desc` orders visible cards
- Favourite → count `1`
- Open `#catalogueImageModal` with ≥4 specs; close
- Fail on `window.__catalogSmokeErrors`

`check:catalog-perf` (`scripts/check-catalog-perf.mjs`):
- Always: listing JSON byte budget; orient listing must not include `sources[]` / `layersCatalog`
- Always: catalog HTML has hero AVIF preload + listing API preload
- Browser (local): cards / eager / hidden-eager / uploads / DOM nodes vs `BUDGET`
- Remote: browser skipped; API+HTML still checked — use Cursor browser MCP for DOM on Timeweb

**Typecheck:**
- `npm run typecheck` gates all `src/**/*.ts(x)` under strict `tsconfig.json`

## Common Patterns

**Async Testing / polling:**
```javascript
async function waitFor(evaluate, label, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  let value
  while (Date.now() < deadline) {
    value = await evaluate(expression)
    if (value) return value
    await delay(200)
  }
  failures.push(`${label}: timed out`)
  return value
}
```

**Error Testing:**
```javascript
if (!response.ok) {
  failures.push(`${path}: expected 2xx, got ${response.status}`)
  return null
}
```

**Email routing contract check:**
```javascript
// scripts/check-routing-contracts.mjs
const routing = JSON.parse(read('src/contracts/lead-routing.json'))
const routingBlock = server.match(/const PAGE_EMAIL_ROUTING = \{([\s\S]*?)\n\};/)
// every label ∈ PAGE_EMAIL_ROUTING AND ∈ client form sources
```

**Remote vs local browser:**
```javascript
// scripts/lib/catalog-smoke-env.mjs
export function shouldRunBrowserSmoke(baseUrl) {
  if (process.env.CATALOG_SMOKE_FORCE_BROWSER === '1') return true
  if (process.env.CATALOG_SMOKE_SKIP_BROWSER === '1') return false
  return isLocalSmokeUrl(baseUrl) // localhost / 127.0.0.1 only
}
```

## Verify Checklist by Change Type

| Change | Minimum verify |
|--------|----------------|
| Typo / copy | Manual / none |
| Forms / `page` labels / `PAGE_EMAIL_ROUTING` | `npm run check:routes` |
| Catalog API / Strapi feeds / filters | `check:catalog-api` (API+Strapi up) |
| Catalog UI / filters / cards / modal | `dev:all` then `check:catalog-ui` |
| Catalog perf / listing slim / hero preload | `check:catalog-perf` |
| TS / React / CSS Modules | `npm run typecheck` |
| Strapi admin field labels (`ru.json`) | Restart admin + manual UI check; no automated i18n smoke |
| Non-trivial feature | GSD phases with verify after each (`AGENTS.md`, `docs/superpowers/plans/`) |
| New uploads / seed | `catalog:optimize-media` → smokes → `strapi:sync-seed` / `catalog:export-snapshot` |

## Prerequisites for Catalog Smokes

**API smoke:** `server.cjs` on `CATALOG_API_BASE_URL` (usually with Strapi); snapshot files present in `public/`

**UI smoke:** Vite on UI base (default `5174`), working API proxy, catalog hydration; Google Chrome for CDP (`CHROME_PATH` if non-default)

**GSD phase verify (example from plans):** after catalog DOM windowing — assert `.catalogue-new-card` count ≤ 6 before scroll + `check:catalog-ui` pass — see `docs/superpowers/plans/2026-06-08-catalog-perf-wave2.md`

**Perf on Timeweb:**
```bash
CATALOG_PERF_BASE_URL=https://majvik-grassigrosso-e3cd.twc1.net npm run check:catalog-perf
```
(API + HTML preload; DOM metrics need local Chrome or Cursor browser MCP)

---

*Testing analysis: 2026-08-03*
