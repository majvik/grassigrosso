# Coding Conventions

**Analysis Date:** 2026-08-03

## Naming Patterns

**Files:**
- React pages: PascalCase + `Page` suffix — `src/components/pages/CatalogPage.tsx`, `HotelsPage.tsx`, `DownloadCatalogPage.tsx`
- React UI primitives: PascalCase — `src/components/ui/Button.tsx`, `Dialog.tsx`, `Sheet.tsx`
- Catalog page JSX pieces: kebab-case filenames — `src/components/catalog-page/filters.tsx`, `hero.tsx`, `toolbar.tsx`, `cards.tsx`
- Catalog runtime: `catalog-<domain>.ts` under `src/catalog/` — `catalog-listing-controller.ts`, `catalog-api.ts`, `catalog-image-modal.ts`
- Legacy page orchestration (pre-TS): kebab-case `.js` — `src/contact-forms.js`, `src/commercial-offer.js`, `src/resource-modals.js`, `src/main.js`
- CSS Modules: co-located `*.module.css` — `src/components/ui/ui.module.css`, `src/components/pages/service-page.module.css`, `download-catalog.module.css`
- Smoke / contract scripts: `scripts/check-*.mjs`, helpers in `scripts/lib/`
- GSD artifacts: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`, `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
- Strapi RU admin copy: `strapi-catalog/src/admin/translations/ru.json`

**Functions:**
- camelCase — `getPageName()`, `getEmailRecipients()`, `shouldRunBrowserSmoke()`, `applyCatalogHeroFeed()`
- PascalCase for React components — `export function LegalPage`, `export const Button`
- Catalog DOM bootstrap verbs: `setup*`, `apply*`, `render*`, `sync*` — `setupCatalogueNewPageHero`, `renderCatalogueFilterGroups`, `syncCatalogueFilterUi`

**Variables:**
- camelCase locals — `baseUrl`, `failures`, `listingBytes`
- SCREAMING_SNAKE for module constants and budgets — `PAGE_EMAIL_ROUTING`, `EXPECTED_PRODUCT_COUNT`, `OVERALL_TIMEOUT_MS`, `BUDGET`
- Public filter/product **slugs** are camelCase English tokens — `memoryEffect`, `nanoFoam`, `dualFirmness`, `upTo160`; display `name` is Russian and editable in Strapi — **do not rename slugs casually**

**Types:**
- PascalCase — `CatalogProduct`, `ButtonProps`, `LeadPayload`, `CatalogFilterGroups`
- Closed unions as string literal types where the set is known
- `interface` for React props; `type` / exported types for feed payloads in `src/catalog/catalog-api.ts`
- Form labels: `FormPageLabel` from `src/contracts/leads.ts` derived from `lead-routing.json`

## Code Style

**Formatting:**
- No Prettier / Biome / ESLint config at repo root — style is match-the-file + `tsc --noEmit`
- Prefer single quotes in `.js` / `.mjs` / most catalog `.ts`; some React files use double quotes (`src/components/app/ReactIslandRoot.tsx`) — **match the file you edit**
- Most frontend TS/TSX omit trailing semicolons; `server.cjs` and Strapi JS use semicolons — match surrounding file
- 2-space indent

**Linting:**
- Primary static gate: `npm run typecheck` → `tsc --noEmit`, `strict: true` (`tsconfig.json`)
- Aggregate gate: `npm run check` → `check:routes` + `check:catalog-api` + `typecheck`
- No ESLint package detected — do not assume lint autofix exists

**TypeScript:**
- `allowJs: false` for included `src/**/*.ts(x)` — put new typed logic in `.ts`/`.tsx`, not new `.js` inside typed areas
- Path alias `@/*` → `./src/*` — use for React/UI (`@/lib/cn`, `@/components/pages/...`)
- Relative imports OK inside a cluster (`src/catalog/*`)
- CSS Modules: `declare module '*.module.css'` in `src/vite-env.d.ts`

## Import Organization

**Order (typical UI component):**
1. React / Base UI (`react`, `@base-ui/react/...`)
2. Third-party (`class-variance-authority`, `clsx`)
3. Internal `@/` imports (`@/lib/cn`)
4. Local CSS Module (`import styles from './ui.module.css'`)
5. Relative siblings

**Path Aliases:**
- `@/*` → `src/*` — prefer for cross-folder React imports

**Barrel Files:**
- UI kit exposes `src/components/ui/index.ts` (`export * from './Button'` …) — OK to import from `@/components/ui` or a concrete file
- Do not add new mega-barrels for pages/catalog; import concrete modules
- Shared marketing sections: single module `src/components/marketing/shared-page-sections.tsx`

## Error Handling

**Patterns:**
- Smoke scripts: accumulate `failures[]`, print `- …` lines, `process.exit(1)` — `scripts/check-catalog-api.mjs`, `scripts/check-routing-contracts.mjs`, `scripts/check-catalog-ui.mjs`
- Catalog network: try/catch → `console.warn` + static/SSR fallback — `src/catalog/catalog-listing-controller.ts`, `src/catalog-hero-slider.js`
- Hard fail when feed is empty/unavailable — `throw new Error('Empty catalog feed')` / `'Catalog unavailable'` in `src/catalog/catalog-api.ts`
- Forms: `clearErrors` / `showError` with Russian messages — `src/contact-forms.js`
- Unknown React `page`: render `NotFoundPage` — never `dangerouslySetInnerHTML` fallback — `src/components/app/ReactIslandRoot.tsx`
- Strapi Admin RU: missing translation → English/technical fallback; load via `config.translations` in `strapi-catalog/src/admin/app.js` (not `registerTrads`)

**Do not:**
- Let client `page` strings diverge from `PAGE_EMAIL_ROUTING` keys — unknown labels silently fall back to `MAIL_TO` and break mailbox routing

## Logging

**Framework:** `console` only (no frontend error-tracking SDK)

**Patterns:**
- `console.warn` for recoverable catalog/proxy failures
- `console.error` for bootstrap failures (`src/main.js` react-entry) and smoke failure lists
- Smoke success: single `console.log` summary line
- Container Strapi logs: `/tmp/strapi.log` (ops convention in `AGENTS.md`)

## Comments

**When to Comment:**
- Non-obvious contracts: email label sync, hero double-load ban, AVIF prefer, LCP slide fallbacks
- Russian comments OK in Strapi admin config — `strapi-catalog/src/admin/app.js`
- Domain JSDoc sparingly on catalog/feed types

**JSDoc/TSDoc:**
- Sparse; do not narrate obvious code

## Function Design

**Size:**
- Prefer focused modules — catalog bootstrap stays in `src/catalog/catalog-page.js`; logic lives in controllers/modals — do not re-merge into one mega-file
- Extend `src/components/catalog-page/*` and `src/components/pages/*.tsx` for markup; do not revive HTML string page blobs

**Parameters:**
- Options objects for multi-flag helpers; typed feed payloads for API responses
- Smoke bases via env: `CATALOG_API_BASE_URL`, `CATALOG_UI_BASE_URL`, `CATALOG_PERF_BASE_URL`

**Return Values:**
- Smokes: return `null` and push failures so one run collects many issues
- Runtime API helpers: throw on hard failure — stay consistent with the module

## Module Design

**Exports:**
- Named exports for React components and utilities
- Default export only for Strapi admin app — `strapi-catalog/src/admin/app.js`
- Set `displayName` on `forwardRef` UI components — `Button.displayName = 'Button'`

**Barrel Files:**
- UI kit barrel exists; avoid new barrels for pages/catalog

## GSD + Superpowers Workflow

Mandatory for non-trivial work (feature, perf, multi-hypothesis bug, integration, refactor) — see `AGENTS.md`:

1. **Spec** — `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`: problem, hypotheses, measurements, root cause, success criteria
   Example shape: `docs/superpowers/specs/2026-06-08-catalog-perf-wave2-design.md`
2. **Plan** — `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`: phases with task IDs, files, **Verify** after each phase
   Example: `docs/superpowers/plans/2026-06-08-catalog-perf-wave2.md`
3. **Execute** — one phase → verify (`typecheck`, `check:catalog-api`, `check:catalog-ui`, `check:catalog-perf`, CDP/Network) → next
4. **Update plan** — phase status + post-fix metrics in the same plan file

**Skip** spec/plan only for: one-line typo, exact user-directed hotfix, informational answer.

## Email Routing Sync (critical)

Lead field `page` must match **exactly** across client, server, and contract list. Mismatch → wrong mailbox or silent `MAIL_TO` fallback.

| Layer | File | Role |
|-------|------|------|
| Contract | `src/contracts/lead-routing.json` | Canonical label list; typed via `src/contracts/leads.ts` |
| Client slug map | `src/contact-forms.js` `getPageName()` | Default `page` from URL slug |
| Client hardcoded | `src/commercial-offer.js` (`Главная (КП)`), `src/resource-modals.js` (`Отелям (каталог)`, `Документы`, `Документы (помощь)`) | Forms that set `page` explicitly |
| Typed slug map | `src/contracts/leads.ts` `CONTACT_FORM_PAGE_LABEL_BY_SLUG` | Keep aligned with `getPageName()` for shared labels |
| Server | `server.cjs` `PAGE_EMAIL_ROUTING` | Label → recipient arrays; `callback@grassigrosso.com` always CC'd |

**Rules:**
- Labels are Russian display strings with exact punctuation/quotes — e.g. `Страница "Отелям"`, `Главная (КП)`
- Never put `.html` in `getPageName()` slug keys — production paths are clean after 301
- Add a new form page in **all** of: `getPageName()` (and/or hardcoded sender), `PAGE_EMAIL_ROUTING`, `lead-routing.json` (and `leads.ts` slug map when applicable)
- Then run `npm run check:routes` (`scripts/check-routing-contracts.mjs`)
- Note: `Скачать каталог` is already in `getPageName()` / `PAGE_EMAIL_ROUTING`; if used as a submit `page`, also add it to `lead-routing.json` so CI enforces sync

## React / CSS Modules

**Stack contract** (`docs/ui-migration.md`, `AGENTS.md`):
- MPA + Vite HTML entries; React islands via `[data-react-root]` + `src/react-entry.tsx`
- UI: `@base-ui/react` + `src/components/ui/*` + CSS Modules + tokens `src/styles/tokens.css`
- Variants: `cva` + `cn()` from `src/lib/cn.ts` — **no Tailwind**

**CSS Modules:**
- Default import `styles`; camelCase class names in CSS (`.buttonPrimary`, `.sheetBackdrop`, `.coverSlider`)
- Compose: `cn(buttonStyles({ variant, size }), className)` — see `src/components/ui/Button.tsx`
- Module classes are **style-only** — never bind behavior to hashed CSS Module class names

**DOM hooks for legacy JS:**
- Prefer `data-*`: `data-faq-item`, `data-document-card`, `data-document-request-trigger`, `data-filter-group`, `data-value`, `data-catalog-select`, `data-product-slug`, `data-react-page`
- Catalog preserves legacy global classes as the runtime contract (`.catalogue-new-card`, `.catalogue-new-chip`, `#catalogueImageModal`) — keep `id` / `class` / `data-*` stable when editing React catalog markup

**Spatial model:**
- Do not squeeze full-bleed legacy pages into a new container/page-shell without an explicit design decision
- Prefer extending `shared-page-sections.tsx` over duplicating contact/FAQ sections

**Assets:**
- Public URLs must be root-absolute `/...` — never `./public/...` in HTML/React (breaks deploy contract)

## Strapi Admin RU Translations

**Files:**
- Config: `strapi-catalog/src/admin/app.js` — `locales: ['ru', 'en']`, `config.translations.ru` imports `./translations/ru.json`
- Copy: `strapi-catalog/src/admin/translations/ru.json`
- Enum Select fix (Strapi 5.42): `src/admin/extensions/EnumerationInput.jsx` registered via `app.addFields({ type: 'enumeration' })` so option labels use `formatMessage({ id: value })`. Schema/API enum **values** stay technical (`image_only`, …).

**Do not use `registerTrads` on root `app.js`** — Strapi Admin only merges custom strings from `config.translations` (`loadTrads(customisations?.config?.translations)`).

**When adding or renaming Product / single-type / component fields:**
1. Add Russian strings for both Content Manager and Content-Type Builder key families already used in `ru.json`
2. Mirror plain field keys **and** nested `attributes.*` keys when peers do (see firmness/fillings blocks)
3. For every enumeration value: keep the technical value in schema; add **both** namespaced key (`page.document-card.kind.certificate`) **and** flat UI key (`"certificate": "Сертификат"`) so Admin Select can resolve labels
4. Keep **slug** stable when changing display labels — slug is the public filter/API contract
5. Restart/rebuild Strapi admin so `config.translations` and EnumerationInput reload

**Key patterns in `ru.json`:**
- `api::<uid>.<uid>.<field>`
- `content-manager.content-types.api::<uid>.…` and `…attributes.<field>`
- `content-type-builder.content-types.api::<uid>.attributes.<field>`
- Components: `content-manager.components.catalog.<component>.…` / `page.<component>.…`
- Enum options (namespaced): `api::….media_display_mode.slider`, `page.document-card.kind.certificate`
- Enum options (flat UI id=value): `"image_only": "Только картинка"` — required for Select labels on 5.42

**Operator note:** `en` cannot be removed (Strapi fallback). Users pick Russian once: Profile → Experience → Interface language → Русский.

## Catalog / Media Conventions

- Frontend never calls Strapi directly — only `/api/catalog/*` via Node (`server.cjs`)
- AVIF siblings in `strapi-catalog/public/uploads/` (same basename); rewrite via `strapi-catalog/src/api/catalog/utils/prefer-avif.js`
- Hero slides #1…N: no SSR `<picture>` (double download); `<video preload="none">` only — never `preload="metadata"`
- After media/listing changes: `npm run catalog:optimize-media` (if uploads) → smokes → seed/snapshot per `AGENTS.md`

---

*Convention analysis: 2026-08-03*
