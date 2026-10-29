# Showcase site mode — execution plan

**Status:** complete  
**Design:** `docs/superpowers/specs/2026-10-29-showcase-site-mode-design.md`

## Phase 1 — Mode contract

### Tasks

- Add failing unit tests for normalization and capability derivation.
- Implement the shared `lib/site-mode.cjs` contract.
- Inject the effective mode into Vite and expose typed frontend capabilities.

### Verify

- `npm run check:site-mode`
- `npm run typecheck`

### Result

Complete. Added `scripts/check-site-mode.test.mjs` and `lib/site-mode.cjs`. The contract is fail-closed and shared by Vite and Node. Verification:

- `npm run check:site-mode` — PASS (3 tests).
- `npm run typecheck` — PASS.

## Phase 2 — Server fail-closed isolation

### Tasks

- Add a regression harness that starts the server in showcase mode against a controlled catalogue feed.
- Assert health remains available, smart/commerce endpoints return 404, and catalogue output contains no price/commerce fields.
- Load and register smart-selector and commerce modules only in explicit commerce mode.
- Sanitize both live Strapi and snapshot catalogue responses before caching/returning them.

### Verify

- `npm run check:showcase-server`
- `SITE_MODE=commerce npm run check:catalog-smart-select-api`

### Result

Complete. Commercial modules are dynamically loaded only in commerce mode. Showcase returns 404 and strips commercial data recursively before caching/response. Verification:

- `npm run check:showcase-server` — PASS (health, two 404 checks, sanitized controlled Strapi feed).
- `SITE_MODE=commerce npm run check:catalog-smart-select-api` — PASS.
- `npm run check:catalog-api` against the local Strapi/API/Vite stack — PASS.

## Phase 3 — Showcase catalogue UI

### Tasks

- Add DOM regression coverage for the showcase catalogue.
- Restore the hero “Скачать каталог” CTA in showcase mode.
- Remove price display/metadata, price filter, and price sort options from the showcase DOM.
- Preserve the existing explicit commerce rendering path.

### Verify

- `npm run check:showcase-ui`
- `SITE_MODE=showcase npm run build:web`
- `npm run check:showcase-bundle`
- `SITE_MODE=commerce npm run build:web`

### Result

Complete. Showcase restores `/download-catalog`, removes every price surface, and replaces the smart-selector module at build time so its implementation is absent from the browser bundle. Verification:

- `npm run check:showcase-ui` — PASS in local headless Chrome with controlled catalogue data.
- `SITE_MODE=showcase npm run build:web` — PASS (176 modules).
- `npm run check:showcase-bundle` — PASS.
- `SITE_MODE=commerce npm run build:web` — PASS (295 modules); smart selector endpoint present in the commerce bundle.
- `SITE_MODE=commerce npm run check:catalog-card-price` — PASS.
- `SITE_MODE=commerce npm run check:catalog-price-filter` — PASS.

## Phase 4 — Documentation and full local gate

### Tasks

- Document the environment contract, capability matrix, branch flow, and release checklist.
- Update `.env.example` and relevant developer documentation.
- Run all relevant local automated checks and production build.

### Verify

- `npm run check:site-mode`
- `npm run check:showcase-server`
- `npm run check:showcase-ui`
- `npm run check:catalog-api`
- `npm run typecheck`
- `SITE_MODE=showcase npm run build`
- `npm run check:docker-runtime-contract`

### Result

Complete. Added `docs/site-modes.md`, `.env.example` contract, README entry, and persistent agent rules. Full local verification:

- `npm run check:site-mode` — PASS.
- `npm run check:showcase-server` — PASS.
- `npm run check:showcase-ui` — PASS.
- `npm run check:catalog-api` — PASS against local stack.
- `npm run typecheck` — PASS.
- `SITE_MODE=showcase npm run build` — PASS (web + Strapi; Strapi emitted the known sandbox preference-file warning but completed the admin build).
- `npm run check:docker-runtime-contract` — PASS.
- `npm run check:routes` — PASS.

No push, deploy, Timeweb change, or modification of `main` was performed.
