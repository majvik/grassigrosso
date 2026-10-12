# Production Domain RU Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use subagents for this run.

**Goal:** Make `https://grassigrosso.ru` the sole canonical production web origin while preserving every `@grassigrosso.com` email address and permanently redirecting `.com`/`www` web traffic to apex `.ru`.

**Architecture:** Move canonical URL construction into a small CommonJS helper shared by both branch variants of `server.cjs`, then update build-time SEO origin and code-owned legal content. Apply and verify the change first on `strapi-full-cms`, then independently on the older `main` production branch. Finish by updating Timeweb domain/environment configuration, deploying both branches, and running a live redirect/SEO/CORS matrix.

**Tech Stack:** Node.js/CommonJS, Express, Vite, React/TypeScript on `strapi-full-cms`, static HTML on `main`, Timeweb App Platform, curl/dig live verification.

**Spec:** `docs/superpowers/specs/2026-10-12-production-domain-ru-cutover-design.md`

## Global Constraints

- Public website origin is exactly `https://grassigrosso.ru`.
- `grassigrosso.com`, `www.grassigrosso.com`, and `www.grassigrosso.ru` return `301` to apex `.ru` while preserving path and query.
- Legacy `*.html` URLs canonicalize without `.html` and must not form redirect loops.
- All mailbox addresses, SMTP settings, form recipients, and visible email contact values remain on `@grassigrosso.com`.
- Never perform a blind global `.com → .ru` replacement.
- Work locally first; no push or Timeweb mutation until all branch-local gates pass.
- Do not restore or modify `stash@{0}` (`user work before switching to main for welcome modal hotfix`) during this plan.
- Do not add UI or CMS consumer zones; this is routing/content-origin maintenance only.

## Review Focus

- A legacy `.com/catalog.html?x=1` request must reach `.ru/catalog?x=1` without a loop or dropped query.
- Host headers with a port must normalize correctly and never create a malformed redirect.
- Canonical/OG output must use `.ru` even when no external `SITE_URL` override is supplied.
- CMS/default/snapshot legal content must not reintroduce `.com` as the website address after hydration.
- The migration test must fail if any required `@grassigrosso.com` routing recipient changes to `.ru`.

## Phase Status

- [x] Phase 1 — `strapi-full-cms`: RED contract, implementation, CMS/default synchronization, local verify
- [x] Phase 2 — `main`: equivalent production implementation and local verify
- [ ] Phase 3 — Timeweb domains/environment, dev deploy, production deploy
- [ ] Phase 4 — live verification matrix and post-cutover metrics

---

### Task 1: Add canonical redirect contract on `strapi-full-cms`

**Files:**

- Create: `lib/canonical-domain.cjs`
- Create: `scripts/check-production-domain.mjs`
- Modify: `server.cjs`
- Modify: `package.json`
- Test: `scripts/check-production-domain.mjs`

**Interfaces:**

- Produces: `PRIMARY_HOST = 'grassigrosso.ru'`
- Produces: `buildCanonicalRedirect({ hostHeader, originalUrl }) -> string | null`
- Consumes: Express `req.headers.host` and `req.originalUrl`
- Behavior: returns `null` for an already canonical URL; otherwise returns an absolute `https://grassigrosso.ru/...` location with query preserved and terminal `.html` removed.

- [x] **Step 1: Move the approved spec and plan to `strapi-full-cms`**

  Record the exact two documentation commit hashes from `main`, switch to `strapi-full-cms`, and cherry-pick only those commits. Confirm unrelated `stash@{0}` remains untouched.

- [x] **Step 2: Write the failing redirect/domain contract**

  Add assertions for apex `.ru`, apex `.com`, both `www` hosts, host-with-port, query preservation, `.html` removal, and required `.com` email recipients. Add `check:production-domain` to `package.json`.

- [x] **Step 3: Run the contract and observe RED**

  Run: `npm run check:production-domain`

  Expected: FAIL because `server.cjs` and the build defaults still designate `.com` as the website origin.

- [x] **Step 4: Implement canonical redirect helper and server integration**

  Replace the two production redirect middlewares with one helper-backed canonicalization middleware. Keep development behavior unchanged and preserve Express `301` semantics.

- [x] **Step 5: Run focused redirect tests**

  Run: `npm run check:production-domain`

  Expected: redirect-helper cases pass; SEO/legal assertions may remain RED until Task 2.

- [x] **Step 6: Commit the redirect primitive**

  Commit exact files with message: `fix(domain): canonicalize production traffic on ru`

### Task 2: Migrate `strapi-full-cms` SEO and legal website references

**Files:**

- Modify: `.env.example`
- Modify: `vite.config.mjs`
- Modify: `public/sitemap.xml`
- Modify: `public/robots.txt`
- Modify: `404.html`, `index.html`, `catalog.html`, `contacts.html`, `cookies.html`, `dealers.html`, `documents.html`, `download-catalog.html`, `hotels.html`, `personal-data-consent.html`, `privacy.html`, `terms.html`, `unsubscribe.html`
- Modify: `templates/marketing-page.html`
- Modify as applicable: `src/pages/legal-defaults/*.json`, `src/contracts/pages-cms/legal.json`, `src/contracts/pages-cms/global-chrome.json`, `src/site-chrome.ts`, `src/components/pages/*-page-defaults.ts`, `src/components/pages/UnsubscribePage.tsx`
- Regenerate as applicable: `scripts/fixtures/pages-cms/*.json`, `public/pages-*.snapshot.json`, `public/site-chrome.snapshot.json`
- Test: `scripts/check-production-domain.mjs`

**Interfaces:**

- Consumes: `SITE_URL` from Vite build environment.
- Produces: `.ru` canonical/OG output and `.ru` code-owned legal website references.
- Preserves: every string matching an actual mailbox address on `@grassigrosso.com`.

- [x] **Step 1: Extend the RED contract to runtime/public content**

  Assert `.ru` in default `SITE_URL`, sitemap, robots, legal site URLs, and generated output. Assert required `.com` mailboxes remain present and no `@grassigrosso.ru` recipient appears.

- [x] **Step 2: Run the expanded contract and observe RED**

  Run: `npm run check:production-domain`

  Expected: FAIL listing remaining website-origin `.com` references, without treating email addresses as failures.

- [x] **Step 3: Update code-owned SEO and legal sources**

  Change only website-origin uses to `.ru`. Keep email text, `mailto:`, JSON-LD email, SMTP, and routing recipients on `.com`.

- [x] **Step 4: Synchronize CMS defaults/fixtures/snapshots**

  Use existing project generators instead of hand-editing derived files where a generator exists:

  - `npm run pages:sync-defaults-fixtures`
  - `npm run pages-cms:check-legal-fixtures`
  - `npm run pages-cms:generate-legal-ssr`
  - `npm run pages-cms:check-legal-parity`

  If live snapshot exports are required by changed sources, start the local stack and run `npm run pages:export-snapshot` plus `npm run site-chrome:export-snapshot`; do not fabricate snapshot payloads.

- [x] **Step 5: Run full local gates for the dev branch**

  Run exactly:

  - `npm run check:production-domain`
  - `npm run typecheck`
  - `npm run check:routes`
  - `npm run check:personal-data`
  - `npm run check:pages-cms-contract`
  - `npm run check:pages-cms-hydrate`
  - `npm run pages-cms:check-legal-fixtures`
  - `npm run pages-cms:check-legal-parity`
  - `npm run build`

  Expected: all exit `0`; build output canonical/OG values use `.ru` and contains no rendered website-address `.com` outside email addresses.

- [x] **Step 6: Update this plan with commands/results and commit**

  Mark Phase 1 complete only after recording exact results in Post-cutover Metrics. Commit source, generated files, tests, and plan update atomically with message: `fix(domain): migrate dev web origin to ru`.

### Task 3: Apply the equivalent migration to `main`

**Files:**

- Cherry-pick or copy docs only: this spec and plan
- Create: `lib/canonical-domain.cjs`
- Create: `scripts/check-production-domain.mjs`
- Modify: `server.cjs`
- Modify: `package.json`
- Modify: `.env.example`, `vite.config.mjs`, `public/sitemap.xml`, `public/robots.txt`
- Modify: `404.html`, `index.html`, `catalog.html`, `contacts.html`, `cookies.html`, `dealers.html`, `documents.html`, `download-catalog.html`, `hotels.html`, `privacy.html`, `terms.html`, `unsubscribe.html`, `templates/marketing-page.html`
- Test: `scripts/check-production-domain.mjs`

**Interfaces:**

- Same helper contract as Task 1, implemented against the older `main` server layout.
- No React/CMS source is introduced into `main`.

- [x] **Step 1: Switch to `main` without restoring unrelated stashed work**

  Confirm `git status --short --branch` contains no tracked changes from Phase 1.

- [x] **Step 2: Add/port the contract first and observe RED**

  Run: `npm run check:production-domain`

  Expected: FAIL before implementation on `main`.

- [x] **Step 3: Implement the helper, server redirect, SEO, sitemap/robots, and legal-site changes**

  Port behavior rather than wholesale files. Preserve the older branch's existing routes, assets, email values, and build structure.

- [x] **Step 4: Run production-branch gates**

  Run exactly:

  - `npm run check:production-domain`
  - `npm run check:download-catalog-sales`
  - `npm run check:submit-queue-fast`
  - `npm run build`

  Expected: all exit `0`. Existing Vite parse warnings may be recorded, but the build must exit `0`. Inspect `dist/index.html`, `dist/privacy.html`, `dist/terms.html`, `dist/sitemap.xml`, and `dist/robots.txt` for `.ru` website origin and preserved `.com` emails.

- [x] **Step 5: Update this plan with exact results and commit**

  Mark Phase 2 complete only after local gates are recorded. Commit with message: `fix(domain): migrate production web origin to ru`.

### Task 4: Configure Timeweb and deploy in controlled order

**Files:**

- Modify external state only: Timeweb custom domains and environment variables.
- Push: `strapi-full-cms`, then `main` only after their local gates pass.

**Interfaces:**

- Build variable: `SITE_URL=https://grassigrosso.ru`
- Runtime allowlist: `CORS_ALLOWED_ORIGINS` includes `https://grassigrosso.ru`
- Preserved variables: all SMTP/mail values on `.com`
- Custom domains: apex and `www` for both `.ru` and `.com`, with valid TLS.

- [ ] **Step 1: Capture current Timeweb values without exposing secrets**

  Record domain attachments, primary-domain selection, `SITE_URL`, and origin allowlist. Do not copy secret values into the plan or terminal output.

- [ ] **Step 2: Update domain/environment configuration**

  Set `.ru` as primary, attach/repair both `www` aliases, set `SITE_URL`, add `.ru` to CORS, and leave email/SMTP variables unchanged.

- [ ] **Step 3: Push and verify dev deployment**

  Push `strapi-full-cms`, wait for build completion, then verify dev `/health`, homepage, canonical/OG, and absence of the retired modal.

- [ ] **Step 4: Push and verify production deployment**

  Push `main`, wait for build completion, and do not declare completion from CI status alone; proceed to Task 5 live checks.

### Task 5: Run live cutover verification and record metrics

**Files:**

- Modify: `docs/superpowers/plans/2026-10-12-production-domain-ru-cutover.md`

**Interfaces:**

- Consumes the deployed domain matrix.
- Produces final evidence and rollback decision.

- [ ] **Step 1: Verify response matrix**

  Check apex/`www`, `.com`/`.ru`, clean/`.html`, nested paths, query preservation, `/health`, sitemap, and robots. Every old-domain response must be `301`, not `302` or a `200` duplicate.

- [ ] **Step 2: Verify built SEO and legal output**

  Fetch live home, catalog, privacy, terms, sitemap, and robots. Confirm canonical/OG/legal site addresses use `.ru`; confirm displayed email contacts remain `.com`.

- [ ] **Step 3: Verify CORS without submitting a lead**

  Send an `OPTIONS /api/submit` preflight with `Origin: https://grassigrosso.ru`. Expect success and `Access-Control-Allow-Origin: https://grassigrosso.ru`. Do not send a real form submission.

- [ ] **Step 4: Verify TLS**

  Confirm valid TLS handshakes for all four hostnames. Any `www` TLS error leaves Phase 4 incomplete.

- [ ] **Step 5: Record final evidence**

  Fill Post-cutover Metrics below with timestamps, status codes, locations, canonical origins, CORS result, build identifiers, and any warnings. Mark Phases 3–4 complete only if every success criterion in the spec is satisfied.

## Post-cutover Metrics

This section is intentionally a results ledger. Append exact observed values; do not replace expected values with unverified claims.

| Gate | Result | Evidence |
| --- | --- | --- |
| `strapi-full-cms` contract/typecheck/checks/build | PASS — 2026-10-12 13:17 MSK | `check:production-domain` 7/7; `typecheck`, `check:routes`, `check:personal-data`, `check:pages-cms-contract`, `check:pages-cms-hydrate`, legal fixtures/parity, `check:pages-cms-phase-6b`, and `SITE_URL=https://grassigrosso.ru npm run build` all exited 0. CMS fixtures were seeded locally, the versioned seed was synchronized (`ca1ac7fa13a1…`), and pages/site-chrome snapshots were exported from `source=strapi`. Dist uses `.ru` for website origins while `.com` mailbox values remain present. |
| `main` contract/checks/build | PASS — 2026-10-12 13:21 MSK | `check:production-domain` 7/7, `check:download-catalog-sales`, `check:submit-queue-fast`, and `SITE_URL=https://grassigrosso.ru npm run build` exited 0. Existing parse5 `noscript` warnings remained non-fatal. `dist/index.html`, legal pages, sitemap, and robots use `.ru`; rendered mailbox values remain `.com`. |
| Dev deployment | Pending | Build ID/time and `/health` |
| Production deployment | Pending | Build ID/time and `/health` |
| `.com → .ru` redirects | Pending | Status/location matrix |
| apex/`www` TLS | Pending | Four-host handshake results |
| canonical/OG/sitemap/robots | Pending | Live fetched values |
| `.ru` CORS preflight | Pending | Response headers |
| `.com` email preservation | Pending | Contract test and live contact values |

## Plan Self-review

- Spec coverage: every fixed decision maps to Tasks 1–5.
- Type consistency: the same CommonJS helper interface is used in both branches.
- Review Focus coverage: redirect, query, host normalization, CMS hydration, and email invariants each have an automated or live check.
- Scope: no email migration, DNS deletion, UI work, or CMS consumer additions.
- Rollback: use `git revert` plus Timeweb `SITE_URL`/CORS restoration; keep domain attachments to preserve TLS and recovery access.
