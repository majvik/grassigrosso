# Pages CMS Phase 7 — Global Site Chrome execution plan

**Status:** Phases A–D complete locally; Phase E next
**Design:** `docs/superpowers/specs/2026-08-04-pages-cms-global-chrome-design.md`

## Phase A — Contract and coverage freeze — complete

1. Create `.planning/phases/07-global-site-chrome/07-CONTENT-CONTRACT.md` and machine-readable JSON.
2. Mechanically extract all header/mobile/footer occurrences from root HTML and template.
3. Produce a row for every text, href, image and repeated item; no blank/unowned rows.
4. Diff page variants and resolve intentional differences, especially contacts CTA and 404/unsubscribe.
5. Classify cookie banner, consent text and JSON-LD as CMS-owned, code-owned or deferred with rationale.
6. Freeze G1–G18, exact key sets, href/media validators and fallback content.

**Verify:** contract harness only; no schema/runtime writes. Negative probes for missing consumer, duplicate key, unknown field, unsafe href and HTML-like value.

**Result:** `check:pages-cms-phase-7a` PASS — 13 consumers, 41 rows, unowned 0, negatives 9. Baseline drifts recorded for the contacts CTA and Hotels/Dealers footer catalog link; canonical values are frozen without runtime changes.

## Phase B — Admin schemas and feed — complete locally

1. Add `chrome.link`, `chrome.navigation-group`, `chrome.header`, `chrome.footer`.
2. Add single type `site-chrome` with Russian display names and complete CM/CTB translations.
3. Add explicit deep-populate descriptor and strict serializer.
4. Add public `site-chrome-feed` with `{data}` envelope and no arbitrary fields.
5. Verify save/reload in local Admin and dual Strapi boot.

**Verify:** `check:pages-cms-phase-7b`; schema normalization, RU completeness and built-in negatives. Existing catalog/page schemas must remain unchanged outside Admin metadata.

**Result:** 4 `chrome.*` components + `site-chrome` single type, explicit deep populate, strict canonical serializer, public `{data}` feed, complete generated CM/CTB RU map. `check:pages-cms-phase-7b`, typecheck, development boot and production boot on isolated SQLite PASS; 15 negatives.

## Phase C — Seed, Node API and snapshots

1. Generate fixture from the approved canonical fallback.
2. Seed only local `.tmp` idempotently with backup/rollback and no catalog mutation.
3. Add `GET /api/site-chrome` with cache/stale/snapshot sources.
4. Add atomic exporter and manifest/hash verification for `site-chrome.snapshot.json`.
5. Include media integrity and Strapi-down degraded checks.

**Verify:** seed×2 logical digest, injected rollback, snapshot corruption/missing media negatives, unknown API route 404, catalog remains 43 products.

**Result:** canonical fixture, local `.tmp` seed×2, injected post-chrome rollback, catalog guard (43 products), dedicated Node endpoint with `strapi | memory-cache | disk-snapshot`, atomic snapshot + sha256 manifest and tracked logo uploads. `check:pages-cms-phase-7c` PASS. No `strapi:sync-seed` and no push.

## Phase D — Full first paint and atomic hydrate

1. Introduce typed defaults/validator/client for site chrome.
2. Generate marked header/mobile/footer regions into every contracted HTML input.
3. Hydrate text/href/media only into baseline slots; never construct new chrome from CMS.
4. Preserve mobile menu delegation/focus/close behavior across atomic updates.
5. Ensure desktop and mobile navigation always derive from the same validated array.

**Verify:** delayed, success, 404/422/503/network/timeout/invalid JSON/invalid payload on every page; desktop/mobile geometry parity; one menu source; no raw HTML; all links and hooks exact.

**Result:** strict typed runtime validator and one in-flight `/api/site-chrome` client hydrate only existing slots. Desktop/mobile share one validated navigation array; no `innerHTML`; baseline drifts fixed in Contacts and Hotels/Dealers. Contracted 13-consumer slot gate, typecheck, routes, build and browser desktop/mobile smoke PASS.

## Phase E — Acceptance and release preparation

1. Add `check:pages-cms-phase-7` and `:record` without tracked writes in normal mode.
2. Run typecheck, build, routes, Pages CMS 1–6, catalog API/UI/perf and degraded media gates.
3. Browser Admin save/reload evidence and public desktop/mobile smoke.
4. Prove listener/uploads/porcelain restoration and zero untracked/ignored CMS uploads.
5. Only after review: local commit; then separately approve `strapi:sync-seed`, snapshot publication and branch push.

**Stop condition:** Phase 7 is incomplete until all automated tests pass. No push/deploy merely because implementation appears visually correct.
