# Strapi + Yandex Metrica Logs API + Ambrosia Experimentation Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not use subagents unless the user explicitly authorizes delegation. Mark checkboxes and record exact verification results after every task.

**Goal:** Build a self-hosted, Russian-operable experimentation platform that can safely run fixed-horizon A/B tests of registered text and image slots today and extend to structural pages, forms, catalog policies, accounts and commerce through typed adapters later.

**Architecture:** Strapi is the control plane and immutable evidence store; the existing Node server is the online eligibility, assignment, document-rendering and event boundary; React consumes a synchronous experiment bootstrap before first render; the existing leads SQLite database remains authoritative for the primary conversion; Yandex Metrica and Logs API supply consented secondary behavior; an isolated Python worker runs the Logs pipeline and pinned Ambrosia design/analysis outside the request path.

**Tech Stack:** Node.js 22/CommonJS, TypeScript/React/Vite, Express, Strapi 5 Community Edition, SQLite/WAL, Python 3.11, `ambrosia==0.5.3.post1`, pandas/Parquet, Yandex Metrica browser API and Logs API, Docker/nginx.

**Spec:** `docs/superpowers/specs/2026-10-02-strapi-ambrosia-experimentation-platform-design.md`

**Plan status:** approved architecture; implementation not started.

## Execution boundary

This plan has two distinct completion levels:

1. **Local release candidate:** Tasks 1–15 are implemented and all local automated gates are green. This is the only level authorized by the current repository rules.
2. **Production-ready for a content-changing A/B:** a separately authorized production cutover, legal/privacy approval and a completed production A/A gate are also required. Nothing in this plan authorizes `git push`, a pull request, remote deployment, Timeweb changes, production database migration or traffic enrollment.

The first implementation enables only `content_patch_v1` for:

- `index.hero.title` — text;
- `index.hero.poster` — same-origin raster image plus alt text.

All future payload families remain interfaces and schemas only. Do not build accounts, carts, checkout, payments, dynamic page builders or catalog experiments in this milestone.

## Global constraints

- Work locally and preserve unrelated user changes. Never push, deploy or mutate remote environments without a new explicit request.
- Follow test-first development. Each task begins with a failing automated test or fixture and ends with the exact passing commands recorded under `## Execution log`.
- Do not add a second CMS or a second operator frontend. Extend the existing Strapi Admin with a local Community-edition plugin and its design system.
- Do not put Ambrosia, pandas, Logs API requests or synchronous Strapi requests in the public document request path.
- Do not expose selectors, arbitrary JSON paths, HTML, SVG, CSS, JavaScript or external media URLs as experiment inputs.
- Preserve the content priority `code fallback → validated CMS → immutable experiment overlay` and the existing React/DOM hook contracts.
- Treat production Strapi data and uploads as operational data. A changed committed seed must never overwrite a non-empty runtime database automatically.
- Never block or reject a valid business lead because experiment metadata is absent, invalid, expired or unavailable.
- Never send PII, raw subject IDs, raw lead IDs, raw Yandex `clientID` values or account IDs to Metrica, logs or Ambrosia datasets.
- Keep assignment/token/link secrets in key rings addressed by key ID. No secret or raw identifier may enter diagnostics.
- Hide provisional statistical winners. Display only operations/quality state until the fixed horizon and complete observation/reconciliation window.
- No automatic rollout. A human records the business decision after a valid result.
- Every SQLite backup must use a consistent SQLite backup operation; never copy a live database file directly.
- After each phase, update this file with task status, tests added, exact local commands and results. “Checked manually” is supplemental, not a gate.

## Review focus

The review must explicitly try to break these five failure modes:

1. **Consent revocation races leave assignment or Metrica active.** Pinned by Task 9 tests for tombstone-first revocation, version mismatch, failed network sync and next-navigation eligibility.
2. **Retries change assignment or duplicate evidence/results.** Pinned by Tasks 4, 5, 11 and 13 golden-vector, unique-key, lease and idempotency tests.
3. **Strapi/event-store/cache outages accidentally enroll traffic.** Pinned by Tasks 4 and 7 failure-injection tests for control/no-enrollment and the bounded five-minute last-known-good lease.
4. **Media replacement/deletion changes a running revision.** Pinned by Tasks 2 and 5 content-addressed-copy, hash-conflict, traversal and immutable-revision tests.
5. **Delayed, missing or duplicated Yandex data creates a false winner.** Pinned by Tasks 12, 13 and 15 rolling-reconciliation, unit-mart, quality-gate and A/A tests.

## Threat model

| Threat | Boundary | Mitigation | Verification |
|---|---|---|---|
| Forged assignment/lead attribution | Browser → Node | HMAC token, key ID, fixed expiry, subject/revision/consent binding, constant-time verification | Tasks 4 and 10 |
| Cross-site consent/event mutation | Browser → Node | allowed `Origin`, `Sec-Fetch-Site`, same-origin cookies, rate limiting, idempotency | Task 9 |
| Malicious experiment content/XSS | Strapi → HTML/React | code-owned slot registry, tagged payload schema, JCS hash, escaped bootstrap, typed props, no HTML | Tasks 3, 5, 7 and 8 |
| Path traversal or mutable experiment image | Strapi media → persistent disk | signature/MIME/dimension checks, safe realpath, content-addressed immutable copy | Tasks 2 and 5 |
| Unauthorized control-plane mutation | Admin/worker → Strapi | Strapi admin permission, internal bearer secret, signed invalidation, append-only audit | Tasks 5–7 and 11 |
| Replay of preview or activation | Admin → Node | short expiry, one-time JTI, local used-token store, strict cookie, clean redirect | Task 8 |
| Raw Yandex identifier disclosure | Browser/worker/storage/logs | canonical decimal validation, immediate HMAC, redaction, raw extract retention | Tasks 9 and 12 |
| SQLite corruption/race | Node/worker/filesystem | WAL, busy timeout, transactions, unique constraints, consistent backups | Tasks 1, 4, 10 and 14 |
| Statistical manipulation | Operator/analysis | frozen design, fixed horizon, hard deadline, standalone SRM stop, no live winner | Tasks 5, 13 and 15 |

## Goal-backward acceptance map

| Milestone outcome | Owning tasks | Proof |
|---|---:|---|
| Russian Strapi workflow can design, preview, launch and stop A/B | 5, 6, 8 | plugin service tests, Admin build/contract test, preview integration |
| Launched revision is immutable and reproducible | 3, 5 | canonical hash fixtures, mutation/delete-path tests, audit records |
| Stable consented assignment before first React render | 4, 7, 8, 9 | golden vectors, HTML/React first-paint test, consent matrix |
| Accepted lead is the authoritative primary conversion | 10 | transactional database and `/api/submit` regression tests |
| Yandex receives only consented non-PII data | 9, 12 | browser adapter, redaction, fake Logs API integration |
| Manager can request design/final Ambrosia jobs | 11, 13 | lease/idempotency tests, synthetic Designer/Tester fixtures |
| Outages and kill switch fail to control | 4, 7, 14, 15 | failure drills and aggregate health checks |
| Existing site remains compatible and fast | 7, 8, 10, 15 | project, CMS, catalog, submit-queue, build and p95 gates |
| Future store can add typed adapters without replacing assignment | 3, 13 | versioned registry/result contracts and adapter boundary tests |

## Dependency graph and phases

```text
Phase 1  Task 1 ── Task 2
                 └──────────────┐
Phase 2  Task 3 ── Task 4       │
                    │           │
Phase 3             ├─ Task 5 ─ Task 6
                    │      └──── Task 7
Phase 4             └────────── Task 8
                               │
Phase 5                  Task 9 ─ Task 10
                               │
Phase 6                  Task 11 ─ Task 12 ─ Task 13 ─ Task 14
                                                          │
Phase 7                                              Task 15
```

Tasks are executed in order. A later phase cannot begin until the prior phase gate is green and its result is recorded. Within a task, keep changes in the named ownership boundary; if an implementation discovery requires a different architecture, pause and amend the approved spec and this plan before coding.

---

## Phase 1 — Operational data preflight

### Task 1: Make the Strapi database bootstrap-only and recoverable

**Files:**

- Modify: `scripts/start-services.sh`
- Create: `lib/sqlite-backup.cjs`
- Create: `scripts/experiments/backup-runtime-data.mjs`
- Create: `scripts/experiments/restore-runtime-data.mjs`
- Modify: `.env.example`
- Modify: `package.json`
- Create: `scripts/check-experiments-storage.mjs`
- Modify: `scripts/check-docker-runtime-contract.mjs`

**Interfaces:**

- `STRAPI_DATABASE_FILENAME` remains the runtime database path.
- `STRAPI_AUTO_APPLY_SEED` defaults to `0`; a seed is copied only when the runtime database is absent/empty.
- Destructive reseed requires both `STRAPI_FORCE_RESEED_ON_START=1` and `STRAPI_FORCE_RESEED_ACK=I_UNDERSTAND_THIS_REPLACES_RUNTIME_DATA`, and creates a verified backup before replacement.
- `backupSqlite(source, destination)` uses the SQLite backup API and integrity-checks the result.
- Backup manifests contain schema version, SHA-256, size and creation time for every artifact.

- [ ] Add failing fixtures proving a changed seed manifest cannot overwrite a non-empty runtime database.
- [ ] Extract seed-decision logic into testable functions or a non-starting `--preflight` mode; keep normal startup behavior unchanged for an empty database.
- [ ] Implement consistent SQLite backup/restore with temporary destination plus atomic rename and `PRAGMA integrity_check`.
- [ ] Refuse restore over live data without an explicit acknowledgement and pre-restore backup.
- [ ] Document the cutover env variables in `.env.example`; remove language implying production content ships by whole SQLite replacement.
- [ ] Run `npm run check:experiments:storage` and `npm run check:docker-runtime-contract`.
- [ ] Commit: `feat(experiments): protect operational Strapi data`

### Task 2: Persist uploads, immutable experiment media and complete backups

**Files:**

- Modify: `lib/uploads-disk-first.cjs`
- Modify: `scripts/start-services.sh`
- Modify: `Dockerfile`
- Create: `scripts/experiments/migrate-uploads.mjs`
- Create: `lib/experiments/immutable-media.cjs`
- Modify: `scripts/experiments/backup-runtime-data.mjs`
- Modify: `scripts/experiments/restore-runtime-data.mjs`
- Create: `scripts/check-experiments-media.mjs`
- Modify: `scripts/check-pages-cms-uploads-disk-first.mjs`
- Modify: `.env.example`

**Interfaces:**

- `STRAPI_UPLOADS_ROOT=/app/data/strapi/uploads` is the canonical runtime media root; local development defaults to `strapi-catalog/public/uploads`.
- Startup copies missing image-bundled uploads to the persistent root, compares hashes and never overwrites a different destination file.
- `strapi-catalog/public/uploads` resolves to the same canonical root in production.
- Experiment media is stored at `/uploads/experiments/<sha256>.<ext>` and addressed by hash; only PNG/JPEG/WebP/AVIF raster signatures are allowed.
- The recovery set is atomic at the runbook level: Strapi DB, uploads, leads DB, experiment DB and worker checkpoints share one manifest.

- [ ] Add failing tests for first migration, repeated migration, same-name hash conflict, traversal, symlink escape and missing persistent volume.
- [ ] Make `createUploadsDiskFirstMiddleware` accept the canonical env root while preserving its current safe-realpath behavior.
- [ ] Implement idempotent migration and immutable content-addressed copy; validate decoded signature, byte limit and dimensions before publish.
- [ ] Extend backup/restore manifests to include uploads and reject incomplete/mismatched sets.
- [ ] Build the image and verify the runtime root exists with restrictive permissions without changing remote infrastructure.
- [ ] Run `npm run check:experiments:media`, `npm run check:pages-cms-uploads-disk-first`, `npm run check:docker-runtime-contract`, and `docker build -t grassigrosso-experiments:local .`.
- [ ] Commit: `feat(experiments): persist and freeze experiment media`

**Phase 1 gate:** storage tests pass; a non-empty database survives a changed seed; upload migration is idempotent; a backup/restore drill reproduces all checksums. Record commands and results before Phase 2.

---

## Phase 2 — Shared contracts and deterministic online kernel

### Task 3: Freeze registries, payload schemas and canonical revision hashes

**Files:**

- Create: `contracts/experiments/slots.v1.json`
- Create: `contracts/experiments/metrics.v1.json`
- Create: `contracts/experiments/content-patch-v1.schema.json`
- Create: `contracts/experiments/revision-v1.schema.json`
- Create: `contracts/experiments/result-v1.schema.json`
- Create: `lib/experiments/contracts.cjs`
- Create: `lib/experiments/revision-contract.cjs`
- Create: `src/experiments/contracts.ts`
- Create: `test/fixtures/experiments/revision-golden.json`
- Create: `test/fixtures/experiments/invalid-payloads.json`
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `scripts/check-experiments-contracts.mjs`
- Modify: `Dockerfile`

**Interfaces:**

- Slot entries declare `key`, `pageSlug`, `valuePath`, optional `altPath`, `kind`, constraints, consumer ID and `enabled`.
- v1 enables exactly `index.hero.title` and `index.hero.poster`.
- Metric entries declare source, binary aggregation, unit, conversion window and whether they are primary/secondary capable.
- `canonicalizeRevision(revisionWithoutHash)` follows RFC 8785/JCS; `definitionHash` is lowercase SHA-256 hex over its UTF-8 bytes.
- Payload envelope is `{ kind: 'content_patch_v1', slotKey, value }`; `page_composition_v1`, `navigation_model_v1`, `form_schema_v1`, `catalog_policy_v1` and `feature_config_v1` are reserved contract names but rejected by the v1 runtime.

- [ ] Write failing contract tests for unknown slots, wrong types, extra properties, HTML/script content, SVG/external URLs, non-10,000 weights and noncanonical experiment keys.
- [ ] Add the versioned registries/schemas and shared CommonJS validator/hasher.
- [ ] Generate TypeScript types from or checked against the same schemas; do not maintain an independent handwritten allowlist.
- [ ] Add golden JCS bytes/hash fixtures that Node, browser validation and the later Python adapter must match.
- [ ] Copy `contracts/` into the runtime image and prove the Strapi and Node processes resolve the same files.
- [ ] Run `npm run check:experiments:contracts` and `npm run typecheck`.
- [ ] Commit: `feat(experiments): define versioned experiment contracts`

### Task 4: Implement assignment, tokens, cookies and the local event store

**Files:**

- Create: `lib/experiments/key-rings.cjs`
- Create: `lib/experiments/assignment.cjs`
- Create: `lib/experiments/tokens.cjs`
- Create: `lib/experiments/cookies.cjs`
- Create: `lib/experiments/event-store.cjs`
- Create: `lib/experiments/diagnostics.cjs`
- Create: `test/fixtures/experiments/assignment-vectors.json`
- Create: `scripts/check-experiments-kernel.mjs`
- Modify: `.env.example`
- Modify: `package.json`

**Interfaces:**

- Assignment input is exactly `v1\n<key>\n<revision>\n<allocation_version>\n<canonical UUID>`; bucket is unsigned big-endian `digest[0..7] mod 10000`.
- Signed subject cookie stores an opaque UUID and key ID; it is `HttpOnly; Secure` in production and `SameSite=Lax`.
- Assignment token contains experiment key/revision/variant, subject hash, definition hash, assigned time, fixed expiry and signing key ID; expiry is always `assigned_at + conversion_window`.
- `ExperimentEventStore` exposes `assignOnce`, `recordExposure`, `linkAnalyticsIdentity`, `recordDiagnostic`, `usePreviewJti`, aggregate health and retention methods. Each identity-link row stores `analytics_link_key_id`; no row stores the raw Yandex identifier.
- SQLite path defaults to `/app/data/experiments/events.db` in production, uses WAL/busy timeout/0600 and unique idempotency constraints.

- [ ] Add failing golden-vector, bucket-boundary, malformed-cookie, wrong-key, expired-token, sliding-expiry and cross-revision tests.
- [ ] Implement deterministic allocation and key-ring parsing without logging secret values.
- [ ] Implement token/cookie verification with constant-time signature comparison and explicit error codes safe for aggregate diagnostics.
- [ ] Create assignment, exposure, identity-link, used-preview-JTI and diagnostic tables plus indexes and uniqueness rules.
- [ ] Prove repeated requests return the original assignment/token expiry and repeated exposure/link writes are idempotent.
- [ ] Inject event-store failures and prove callers can choose control/no-enrollment rather than random fallback.
- [ ] Run `npm run check:experiments:kernel`.
- [ ] Commit: `feat(experiments): add deterministic assignment kernel`

**Phase 2 gate:** all schemas and golden vectors pass; a repeated subject/revision is sticky; event-store failure cannot create assignment; no raw identifiers appear in test database/log captures.

---

## Phase 3 — Strapi control plane

### Task 5: Build the local Strapi plugin and immutable lifecycle

**Files:**

- Modify: `strapi-catalog/config/plugins.js`
- Create: `strapi-catalog/src/plugins/experiments/package.json`
- Create: `strapi-catalog/src/plugins/experiments/strapi-server.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/index.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment/schema.json`
- Create: `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-revision/schema.json`
- Create: `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-result/schema.json`
- Create: `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-analysis-job/schema.json`
- Create: `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-audit-event/schema.json`
- Create: `strapi-catalog/src/components/experiment/variant.json`
- Create: `strapi-catalog/src/plugins/experiments/server/src/services/definition.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/services/lifecycle.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/services/immutable-media.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/services/jobs.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/services/runtime-feed.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/controllers/admin.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/controllers/internal.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/routes/admin.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/routes/content-api.js`
- Create: `strapi-catalog/src/plugins/experiments/server/src/policies/internal-token.js`
- Create: `scripts/check-experiments-strapi.mjs`
- Modify: `strapi-catalog/scripts/prepare-dist.cjs`
- Modify: `package.json`

**Interfaces:**

- `experiment` freezes the code-owned key, hypothesis, page/slot scope, state, primary/secondary/guardrail metric keys, alpha/beta/MDE and practical threshold, conversion/minimum/maximum windows, coverage/loss gates, planned group size, owner, nullable unique `active_scope_key` and future `exclusion_scope`.
- `experiment-revision` stores monotonically increasing revision/allocation versions, algorithm/canonicalization versions, all key IDs, exact 5,000/5,000 weights, resolved A/B payloads, statistical plan, media hashes, definition hash and launch actor/time.
- `experiment-result`, `experiment-analysis-job` and `experiment-audit-event` store normalized immutable result/decision, idempotent leased work and append-only evidence respectively.
- State machine is `draft → ready → running → enrollment_closed → analyzing → completed → archived`, plus terminal `stopped → archived`.
- `running` enrolls new subjects and serves sticky assignments; `enrollment_closed` refuses new subjects but serves an existing assignment through its frozen conversion window; analyzing/completed/stopped/archived serve control.
- Normal enrollment closes only after both 14 complete calendar days and planned per-group sample are reached, or at the frozen hard deadline. Deadline-before-sample records `inconclusive_underpowered` and can never declare a winner.
- Launch runs in one transaction: validate, snapshot resolved control/A/B and statistical plan, freeze immutable media, assign revision/hash/key IDs, claim unique `active_scope_key`, append audit and publish runtime feed generation.
- Stop/launch commands require idempotency keys. A stopped revision never resumes.
- Revisions/results/audit records reject update/delete through plugin controllers, Content Manager and Document Service middleware.
- Authenticated worker endpoints support atomic job claim/lease/heartbeat/success/failure and immutable result creation.
- Authenticated runtime feed returns only validated currently serveable revisions, generation and lease metadata.

- [ ] Add failing state-transition, duplicate-launch, duplicate-page-scope, 50/50, missing-design, bad-slot/media and immutable-write-path tests.
- [ ] Register the plugin locally instead of adding more experiment logic to `strapi-catalog/src/index.js`.
- [ ] Implement all content types and services with Strapi transactions and database uniqueness as the final concurrency guard.
- [ ] Apply immutable document-service middleware before any Content Manager path can mutate/delete evidence.
- [ ] Implement launch/stop audit records and content-addressed media snapshotting.
- [ ] Implement job lease/idempotency and runtime-feed/internal auth; redact secrets and payload-sensitive fields from errors.
- [ ] Run `npm run check:experiments:strapi` and `npm run build:strapi`.
- [ ] Commit: `feat(experiments): add immutable Strapi control plane`

### Task 6: Add the Russian Strapi operator workflow

**Files:**

- Create: `strapi-catalog/src/plugins/experiments/strapi-admin.js`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/index.jsx`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/pluginId.js`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/pages/ExperimentsPage.jsx`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/components/ExperimentEditor.jsx`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/components/ExperimentStatus.jsx`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/components/AnalysisJobs.jsx`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/utils/view-model.js`
- Create: `strapi-catalog/src/plugins/experiments/admin/src/translations/ru.json`
- Modify: `strapi-catalog/src/admin/app.js`
- Create: `scripts/check-experiments-admin.mjs`
- Modify: `package.json`

**Interfaces:**

- Explicit plugin permission gates view/edit, preview/design, launch, stop and archive.
- Russian actions are `Предпросмотр A/B`, `Рассчитать дизайн`, `Проверить`, `Запустить`, `Экстренно остановить`, `Архивировать`.
- Screen shows immutable revision/hash, operational A/B counts, SRM/data-quality flags, coverage, planned/reached sample, window state, last Logs sync, final result and audit history.
- It never renders a live provisional winner; activation remains `pending` until Node acknowledges the feed generation.

- [ ] Add failing pure view-model tests for allowed actions in every state and for suppression of provisional outcomes.
- [ ] Register the plugin menu/permissions and use the existing Strapi design system rather than a new frontend bundle.
- [ ] Implement typed form controls restricted to registry slots, two variants and frozen design fields.
- [ ] Implement preview/design/launch/stop calls with idempotency keys, visible errors and confirmation for emergency stop.
- [ ] Compile Russian translations and verify no English-only blocking action remains.
- [ ] Run `npm run check:experiments:admin` and `npm run build:strapi`.
- [ ] Commit: `feat(experiments): add Russian Strapi workflow`

**Phase 3 gate:** a local Strapi instance can create a valid draft, design job and immutable revision through authenticated plugin APIs; illegal transitions and every evidence mutation path fail; Admin compiles in Russian.

---

## Phase 4 — No-flicker delivery and preview

### Task 7: Add the runtime feed, signed invalidation and dynamic document boundary

**Files:**

- Create: `lib/experiments/runtime-feed.cjs`
- Create: `lib/experiments/control-plane-signature.cjs`
- Create: `lib/experiments/document-middleware.cjs`
- Create: `lib/experiments/router.cjs`
- Create: `lib/experiments/bootstrap-serialize.cjs`
- Modify: `server.cjs`
- Modify: `nginx.conf`
- Create: `scripts/check-experiments-render.mjs`
- Create: `scripts/check-experiments-perf.mjs`
- Modify: `scripts/check-routing-contracts.mjs`
- Modify: `package.json`

**Interfaces:**

- Node refreshes authenticated Strapi feed in the background with 15-second fresh TTL and persists a validated last-good snapshot with a five-minute maximum lease for new enrollment.
- `POST /internal/experiments/cache/invalidate` verifies raw-body HMAC, timestamp skew and idempotent event ID, refreshes feed and acknowledges the target generation.
- `EXPERIMENTS_ENABLED=0` or invalid/expired feed/event-store error yields control without assignment.
- Document middleware runs before `express.static`, maps extensionless routes to built HTML, assigns only eligible visitors, injects escaped JSON before the module entrypoint and returns `Cache-Control: no-cache`.
- nginx proxies document routes to Node but continues serving versioned `/assets/*`, `/uploads/*` and other media directly; `.html` canonical redirects remain intact.

- [ ] Add failing local HTTP tests for A/B injection, serialization attacks, no-store failures, kill switch, stale leases, invalid feed and static-asset bypass.
- [ ] Implement background refresh/snapshot and signed invalidation; no document request may await Strapi.
- [ ] Implement safe bootstrap injection escaping `<`, `>`, `&`, U+2028/U+2029 and closing-script sequences.
- [ ] Mount document middleware before static HTML and keep APIs/admin/uploads routing unchanged.
- [ ] Update nginx route precedence and extend routing contract tests for clean URLs and direct immutable assets.
- [ ] Benchmark warm cached document generation and fail when experiment processing exceeds 20 ms p95 or triggers network I/O.
- [ ] Run `npm run check:experiments:render`, `npm run check:experiments:perf`, and `npm run check:routes`.
- [ ] Commit: `feat(experiments): inject assignments before first paint`

### Task 8: Apply the typed React overlay and one-time preview flow

**Files:**

- Create: `src/experiments/types.ts`
- Create: `src/experiments/bootstrap.ts`
- Create: `src/experiments/apply-overlay.ts`
- Create: `src/experiments/slot-exposure.ts`
- Create: `src/experiments/preview.ts`
- Modify: `src/pages/use-page-cms.ts`
- Modify: `src/components/pages/IndexPage.tsx`
- Modify: `src/components/pages/index-page-defaults.ts`
- Modify: `lib/experiments/router.cjs`
- Modify: `lib/experiments/event-store.cjs`
- Modify: `strapi-catalog/src/plugins/experiments/server/src/controllers/admin.js`
- Create: `scripts/check-experiments-hydrate.mjs`
- Create: `scripts/check-experiments-preview.mjs`
- Modify: `package.json`

**Interfaces:**

- `readExperimentBootstrap()` is synchronous and consumes the injected payload once without trusting arbitrary paths.
- `applyExperimentOverlay(slug, base, assignment)` validates against the shared registry and returns a new typed value.
- `usePageCms` initializes from overlay(fallback), then applies overlay(merge(fallback, CMS)) after every successful hydrate.
- Registered consumers expose stable `data-experiment-slot` hooks; no CSS-module class is a behavioral hook.
- Preview activation uses a signed one-time token, local used-JTI transaction, 15-minute `HttpOnly; Secure; SameSite=Strict` cookie and 303 redirect to a clean page URL. Preview creates no assignment, exposure, link or Metrica event.

- [ ] Add failing tests proving variant B is present on initial render and remains after delayed CMS hydrate with no new section/consumer zone.
- [ ] Implement the typed bootstrap/overlay for the two enabled index slots only.
- [ ] Add commit-driven idempotent exposure hook points without sending a beacon yet.
- [ ] Implement Admin-issued preview activation and local preview session; reject replay, expiry, wrong revision and open redirect.
- [ ] Test A, B, control and preview DOM output, image URL/alt validation and unchanged baseline section/hook allowlist.
- [ ] Run `npm run check:experiments:hydrate`, `npm run check:experiments:preview`, `npm run check:pages-cms-hydrate`, `npm run check:pages-cms-hydrate-dom`, and `npm run typecheck`.
- [ ] Commit: `feat(experiments): preserve variant through React hydrate`

**Phase 4 gate:** both v1 slot types render before first React paint, CMS hydration cannot erase them, preview is clean and non-enrolling, control is served on every injected failure, p95 gate passes.

---

## Phase 5 — Consent, telemetry and authoritative lead conversion

### Task 9: Mirror consent and collect exposure/Yandex identity safely

**Files:**

- Create: `lib/experiments/origin-guard.cjs`
- Create: `lib/experiments/consent.cjs`
- Modify: `lib/experiments/router.cjs`
- Create: `src/experiments/consent-client.ts`
- Create: `src/experiments/analytics.ts`
- Create: `src/experiments/behavior-events.ts`
- Modify: `src/cookie-consent.ts`
- Modify: `src/analytics-consent.ts`
- Modify: `src/main.js`
- Modify: `.env.example`
- Create: `scripts/check-experiments-consent.mjs`
- Create: `scripts/check-experiments-analytics.mjs`
- Modify: `package.json`

**Interfaces:**

- `POST /api/experiments/consent` validates same-origin metadata and policy/version, sets/clears the signed server grant and subject/preview cookies.
- Browser writes `analytics_opt_out=1` before revocation I/O and stops Metrica immediately. Only a successful grant clears it.
- Eligibility is evaluated only on a subsequent document request; no mid-page control-to-variant switch occurs.
- `POST /api/experiments/exposure` and `/link-yandex` require a valid assignment token, consent mirror, subject match, origin guard, rate limit and idempotency key.
- Yandex `clientID` must be canonical unsigned decimal, is HMACed as `<counter_id>:<clientID>` immediately and is never stored/logged raw.
- Metrica receives only experiment key/revision/variant/hash prefix and declared secondary goals after consent.

- [ ] Add a failing consent-state matrix covering unset, granted, denied, version mismatch, failed grant, failed revocation and stale signed mirror plus tombstone.
- [ ] Implement signed server mirror and client tombstone-first synchronization while keeping the consent UI responsive.
- [ ] Wire the registered slot commit to an idempotent same-origin exposure beacon.
- [ ] Add the Metrica visit params, secondary goals and post-init clientID link; preserve existing lazy initialization.
- [ ] Capture application logs and databases in tests and assert the raw clientID/subject ID never appears.
- [ ] Verify non-consented/control/preview paths call neither the event endpoints nor `ym`.
- [ ] Run `npm run check:experiments:consent`, `npm run check:experiments:analytics`, `npm run check:personal-data`, and `npm run typecheck`.
- [ ] Commit: `feat(experiments): enforce consented exposure analytics`

### Task 10: Attribute persisted leads in the same transaction

**Files:**

- Modify: `lib/db.cjs`
- Create: `lib/experiments/lead-attribution.cjs`
- Modify: `server.cjs`
- Modify: `src/contact-forms.js`
- Modify: `src/experiments/analytics.ts`
- Create: `scripts/check-experiments-leads.mjs`
- Modify: `scripts/check-submit-queue-fast.mjs`
- Modify: `package.json`

**Interfaces:**

- Add `lead_experiment_attributions` with lead FK cascade and unique `(lead_id, experiment_key, revision)`.
- `insertLeadWithConsent(lead, consent, attributions = [])` writes lead, consent and valid attributions in one transaction.
- Forms send the bootstrap assignment token(s), never cookie values or unsigned variant fields.
- Server verifies consent, signed subject cookie, token expiry/revision/hash and stored assignment before building attribution rows.
- Invalid/missing experiment data records an aggregate diagnostic but the valid lead still persists and returns `202`.
- Browser sends Metrica `lead_submitted` only after `202`; local attribution remains authoritative.

- [ ] Add failing migration, transaction rollback, duplicate-token, expired-token, invalid-signature and missing-token tests.
- [ ] Implement the attribution table and extend lead bundle deletion/retention to cascade it.
- [ ] Verify tokens before the database transaction and pass only normalized trusted rows to `insertLeadWithConsent`.
- [ ] Attach tokens to all form submission paths without changing email routing, consent proof or queue latency.
- [ ] Collapse repeated submissions to one binary unit observation in the export contract while preserving each real lead record.
- [ ] Run `npm run check:experiments:leads`, `npm run check:submit-queue-fast`, and `npm run check:personal-data`.
- [ ] Commit: `feat(experiments): persist authoritative lead attribution`

**Phase 5 gate:** every consent state has an automated outcome; no raw Yandex ID is retained; exposure/link writes are idempotent; valid leads stay fast and accepted with or without valid experiment metadata.

---

## Phase 6 — Logs API and Ambrosia worker

### Task 11: Create the isolated Python worker and retryable job protocol

**Files:**

- Create: `experiments-worker/pyproject.toml`
- Create: `experiments-worker/requirements.in`
- Create: `experiments-worker/requirements.lock`
- Create: `experiments-worker/worker/__init__.py`
- Create: `experiments-worker/worker/__main__.py`
- Create: `experiments-worker/worker/config.py`
- Create: `experiments-worker/worker/strapi_client.py`
- Create: `experiments-worker/worker/jobs.py`
- Create: `experiments-worker/worker/checkpoints.py`
- Create: `experiments-worker/tests/test_jobs.py`
- Create: `experiments-worker/tests/test_contracts.py`
- Create: `scripts/check-experiments-worker.mjs`
- Modify: `package.json`
- Modify: `.env.example`

**Interfaces:**

- Python 3.11 and every dependency are pinned with hashes; Ambrosia is exactly `0.5.3.post1`.
- CLI supports `worker`, `design --job-id`, `analyze --job-id`, `sync-logs --date`, `retention` and `health`.
- Worker claims an authenticated Strapi job with lease, renews heartbeat, resumes from checkpoint and completes/fails idempotently by frozen input hash.
- Failure/backoff never changes runtime serving state or starts a second result for the same job/revision.
- Python validates the same JCS revision golden fixture before processing any job.

- [ ] Add failing fake-Strapi tests for claim races, lease expiry, retry, duplicate completion, frozen-input mismatch and restart checkpoint.
- [ ] Create the isolated package/locked environment and shared contract loader.
- [ ] Implement job loop, authenticated client, bounded exponential backoff and checkpoint state outside git.
- [ ] Emit structured aggregate health without assignment IDs, raw clientID or secrets.
- [ ] Run `npm run check:experiments:worker`.
- [ ] Commit: `feat(experiments): add isolated analysis worker`

### Task 12: Implement restart-safe Yandex Logs extraction and reconciliation

**Files:**

- Create: `experiments-worker/worker/yandex_logs.py`
- Create: `experiments-worker/worker/raw_store.py`
- Create: `experiments-worker/worker/reconciliation.py`
- Create: `experiments-worker/worker/identity.py`
- Create: `experiments-worker/tests/fakes/yandex_logs_server.py`
- Create: `experiments-worker/tests/test_yandex_logs.py`
- Create: `experiments-worker/tests/test_reconciliation.py`
- Create: `test/fixtures/experiments/yandex-hits.jsonl`
- Create: `test/fixtures/experiments/yandex-visits.jsonl`
- Modify: `experiments-worker/worker/config.py`
- Modify: `.env.example`

**Interfaces:**

- Extractor requests only frozen required hit/visit fields for complete previous days.
- Workflow is prepare → poll → enumerate/download every part → checksum/row verification → atomic publish → remote prepared-log delete.
- Reconciliation reimports D-3 through D-1, upserts by stable Yandex hit/visit ID and is safe after interruption at every stage.
- Raw `clientID` is canonicalized and HMACed with the matching analytics-link key ID before a derived row is persisted; log filters redact it.
- Prepared remote logs are deleted only after verified local publish; local raw files are deleted within seven days after verified mart creation.

- [ ] Add fake-server failures for preparing, polling, missing part, corrupt checksum, duplicate rows, delete failure and process restart.
- [ ] Implement the minimal Logs API client and restricted raw storage layout under `/app/data/experiments/logs`.
- [ ] Implement three-day idempotent reconciliation and stable upserts.
- [ ] Prove the hash matches Node golden vectors and raw IDs are absent from derived files/log output.
- [ ] Persist last successful sync/reconciliation window for aggregate health.
- [ ] Run the Python Logs/reconciliation suite through `npm run check:experiments:worker`.
- [ ] Commit: `feat(experiments): reconcile Yandex Logs safely`

### Task 13: Build the unit mart and pinned Ambrosia design/analysis adapter

**Files:**

- Create: `experiments-worker/worker/local_sources.py`
- Create: `experiments-worker/worker/mart.py`
- Create: `experiments-worker/worker/quality.py`
- Create: `experiments-worker/worker/ambrosia_adapter.py`
- Create: `experiments-worker/worker/results.py`
- Create: `experiments-worker/tests/test_mart.py`
- Create: `experiments-worker/tests/test_ambrosia_adapter.py`
- Create: `experiments-worker/tests/test_quality_gates.py`
- Create: `test/fixtures/experiments/stat-null.parquet`
- Create: `test/fixtures/experiments/stat-effect.parquet`
- Create: `test/fixtures/experiments/stat-srm.parquet`
- Create: `test/fixtures/experiments/stat-incomplete.parquet`
- Modify: `experiments-worker/worker/jobs.py`

**Interfaces:**

- Mart emits exactly one row per `(experiment_key, revision, subject_hash)` and includes every assigned unit; missing primary conversion after the full window is `0`.
- Cross-variant units, revision/hash mixture or incomplete observation window invalidate analysis before effect estimation.
- Design calls `Designer(...).run(to_design='size', method='theory', stabilizing_method='asin')` and persists per-group sample, implied absolute effect and expected duration.
- Design uses usable historical unit-level visitor-to-lead data. When it does not exist, the runbook requires a control-only 14-day calibration, then the seven-day conversion window and three-day Logs reconciliation window before design.
- Enrollment analysis enforces both the planned per-group sample and 14 complete calendar days. A frozen maximum deadline produces `inconclusive_underpowered` if the planned sample is not reached; final analysis waits for the last subject's conversion window plus reconciliation.
- Quality calls standalone `ambrosia.tools.srm.check_srm` over the complete assignment cohort with alpha `0.0005` before filtering; detected SRM hard-stops estimation.
- Primary calls `Tester.run(method='binary', effect_type='absolute', interval_type='newcombe', alternative='two-sided', correction_method=None)`.
- Secondary binary family uses the same method/interval with `correction_method='holm'`; coverage below 80% suppresses only Metrica-derived secondary results when primary gates remain valid.
- Exposure must be at least 95% per variant and A/B exposure/link loss deltas must not exceed two percentage points.
- Result separates verdict (`positive|negative|no_evidence|underpowered|invalid`) from recommendation (`winner|loser|hold`).

- [ ] Add synthetic fixtures for null, known positive/negative, practical-threshold miss, SRM, differential loss, low symmetric link coverage, underpowered deadline, repeated events and cross-variant contamination.
- [ ] Build the canonical unit mart from assignments/exposures, lead attributions and reconciled hashed Yandex rows.
- [ ] Wrap Ambrosia behind internal input/result models; no Strapi schema may expose library-specific dataframe columns.
- [ ] Implement fixed-horizon/design/quality/result rules exactly as frozen in the revision.
- [ ] Verify secondary Holm behavior cannot change the primary verdict and no result is auto-promoted.
- [ ] Normalize and write immutable design/final result records through the Strapi job contract.
- [ ] Run `npm run check:experiments:worker` twice from clean checkpoints to prove determinism/idempotency.
- [ ] Commit: `feat(experiments): analyze fixed-horizon tests with Ambrosia`

### Task 14: Package, supervise, retain and observe without coupling availability

**Files:**

- Modify: `Dockerfile`
- Modify: `scripts/start-services.sh`
- Modify: `server.cjs`
- Create: `experiments-worker/worker/retention.py`
- Create: `experiments-worker/tests/test_retention.py`
- Create: `scripts/check-experiments-runtime.mjs`
- Modify: `scripts/check-docker-runtime-contract.mjs`
- Modify: `.env.example`
- Modify: `README.md`

**Interfaces:**

- The first deployment image contains the pinned Python virtual environment, but the worker is a separate supervised process with its own log/health/checkpoint paths.
- Worker exit/restart cannot terminate Node or Strapi; public `/health` remains 200 when the site is healthy and reports worker degradation only in aggregate.
- Enrollment still closes at planned sample/hard deadline even when analysis is unavailable; no result is fabricated.
- Retention deletes verified raw data within 7 days, subject rows/marts 180 days after completion, and lead attribution with lead-bundle deletion; aggregate revisions/results remain.
- Backup/restore includes worker checkpoint and version metadata.

- [ ] Add failing process tests for worker crash, Strapi delayed start, missing Python env, health redaction and graceful shutdown.
- [ ] Retain Python in the runtime image and start/restart the worker independently with bounded backoff.
- [ ] Add aggregate Node health for feed age, event store, worker, last Logs sync and kill-switch state.
- [ ] Implement dry-run and apply modes for retention with immutable audit summary.
- [ ] Extend runtime/backup contract checks and document local recovery commands.
- [ ] Run `npm run check:experiments:runtime`, `npm run check:docker-runtime-contract`, and rebuild the local image.
- [ ] Commit: `feat(experiments): operate the analysis worker safely`

**Phase 6 gate:** the fake Logs pipeline survives interruption and duplication; synthetic Ambrosia fixtures are deterministic; quality failures cannot produce a winner; worker failure leaves the site serving control/business traffic; retention and recovery tests pass.

---

## Phase 7 — End-to-end qualification and launch gate

### Task 15: Prove the complete local flow and prepare the separately authorized A/A cutover

**Files:**

- Create: `scripts/check-experiments-e2e.mjs`
- Create: `scripts/check-experiments-failures.mjs`
- Create: `scripts/check-experiments-aa.mjs`
- Create: `scripts/check-experiments-phase.mjs`
- Create: `docs/experiments/operator-runbook.md`
- Create: `docs/experiments/recovery-runbook.md`
- Create: `docs/experiments/privacy-data-map.md`
- Create: `docs/experiments/aa-launch-checklist.md`
- Modify: `package.json`
- Modify: `README.md`
- Modify: this plan's `## Execution log`

**Interfaces:**

- `npm run check:experiments` aggregates every experiment unit/integration check; `npm run check:experiments:phase -- --record` records versions, fixture hashes and command results without secrets.
- Local E2E launches Strapi, Node/Vite and a fake Yandex service against temporary databases/directories; it never uses production tokens or endpoints.
- A/A fixture uses identical A/B content hashes, full assignment cohort and the same quality/statistical code as production. Acceptance does not require `p > 0.05`.
- Production checklist is a human-controlled gate with rollback: backup/restore verification, env/key rings, legal/privacy approval, storage cutover, kill switch, A/A duration/window/reconciliation, and explicit go/no-go.

- [ ] Build an E2E scenario: draft → design → preview A/B → launch/ack → consented stable assignment → first-paint overlay → exposure/link → accepted lead → Logs reconciliation → final result → stop/archive.
- [ ] Build failure drills for Strapi outage, expired feed lease, event DB lock/unavailable, invalid token, Metrica outage, worker crash, delayed Logs, kill switch and emergency stop.
- [ ] Prove the A/A harness requires identical immutable payload hashes, no SRM/cross-variant units, exposure ≥95%, link ≥80% for secondary use and loss deltas ≤2 pp; a significant A/A triggers investigation/repeat state rather than winner/failure fishing.
- [ ] Write Russian operator and recovery runbooks, data map/retention table and exact production A/A checklist. Mark legal/privacy review and deployment authorization as external required approvals.
- [ ] Run the complete local gate below from a clean checkout-compatible state and record duration/results.
- [ ] Review the five `## Review focus` failures against their named tests and inspect the final diff for out-of-scope commerce or duplicate CMS UI.
- [ ] Commit: `test(experiments): qualify local release candidate`

## Final local verification gate

Run all commands locally. A skipped command is a failed gate unless this plan records the concrete blocker and remains `in_progress`.

```bash
npm ci
npm ci --prefix strapi-catalog --no-audit --fund=false
npm run check:experiments
npm run typecheck
npm run check
npm run check:pages-cms
npm run check:pages-cms-hydrate
npm run check:pages-cms-hydrate-dom
npm run check:pages-cms-media-integrity
npm run check:submit-queue-fast
npm run build
npm run check:catalog-api
CATALOG_UI_BASE_URL=http://127.0.0.1:5174 npm run check:catalog-ui
CATALOG_PERF_BASE_URL=http://127.0.0.1:3000 npm run check:catalog-perf
docker build -t grassigrosso-experiments:local .
npm run check:experiments:phase -- --record
```

Service-dependent commands must use the local Strapi/Node/Vite stack and temporary data or backed-up local fixtures. Manual browser inspection of the Strapi workflow and A/B first paint supplements these commands but does not replace them.

## Production A/A gate — not authorized by this plan

After the local release candidate is green, stop and request explicit authorization before any external action. The later production task must:

1. verify and restore-test a production backup of Strapi DB/uploads, leads DB and experiment data;
2. switch production to operational persistent Strapi/uploads without auto-reseed;
3. configure non-development key rings, internal auth, Yandex Logs credentials, volume permissions and kill switch;
4. obtain legal/privacy approval for consent mirror, identifiers, Metrica parameters and retention;
5. deploy with `EXPERIMENTS_ENABLED=0`, run smoke/rollback drills, then explicitly enable only the A/A revision;
6. complete its planned enrollment, seven-day conversion window and three-day reconciliation window;
7. apply the A/A quality gate without requiring a nonsignificant p-value or repeatedly sampling for a convenient result;
8. authorize the first content-changing test only after a documented go decision.

## Execution log

Update this section during implementation. Each completed phase must list tests added, exact commands, result summaries and post-fix metrics.

| Phase | Status | Tests/commands/results | Commit(s) |
|---|---|---|---|
| 1. Operational data preflight | pending | — | — |
| 2. Contracts and kernel | pending | — | — |
| 3. Strapi control plane | pending | — | — |
| 4. No-flicker delivery | pending | — | — |
| 5. Consent and conversion | pending | — | — |
| 6. Logs and Ambrosia worker | pending | — | — |
| 7. Local qualification | pending | — | — |
| Production cutover + A/A | not authorized | Requires separate explicit request | — |

## Self-review checklist

- [x] Every approved-spec acceptance criterion maps to at least one task and automated proof.
- [x] The current system's real integration points and exact files are named.
- [x] Test-first steps cover contracts, state, security, failure behavior, statistics and performance.
- [x] The five highest-risk failure modes are pinned to explicit tasks/tests.
- [x] Operational storage cutover precedes self-service experiment media or definitions.
- [x] Ambrosia remains an offline adapter and Yandex remains the only external behavioral analytics provider.
- [x] Future commerce scale is preserved through versioned adapters without building commerce now.
- [x] Local implementation and separately authorized production/A/A gates are not conflated.
- [x] No task permits push, deploy, remote mutation or paid/closed-source dependency.
