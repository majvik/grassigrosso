# Strapi + Yandex Metrica Logs API + Ambrosia Experimentation Platform

> GSD-pi milestone source plan. Execute with the fresh `open-gsd/gsd-pi` workflow and `superpowers:executing-plans`; do not use subagents unless the user explicitly authorizes delegation.

**Milestone:** `M001` — local experimentation release candidate
**Status:** approved architecture, re-planned and reviewed, implementation not started
**Spec:** `docs/superpowers/specs/2026-10-02-strapi-ambrosia-experimentation-platform-design.md`
**GSD-pi baseline:** `open-gsd/gsd-pi` `1.20.1`, commit `372fea8015fcd0760476d51103a94ff85d67fb68` (2026-10-02)
**Review:** `docs/superpowers/reviews/2026-10-02-strapi-ambrosia-experimentation-platform-gsd-pi.md`

## Objective

Deliver a self-hosted, Russian-operable A/B experimentation system in which Strapi is the control plane, the existing Node/React application assigns and renders variants before first paint, the accepted lead is the authoritative primary conversion, Yandex Metrica Logs API provides consented secondary behavior, and pinned Ambrosia performs fixed-horizon offline design and final analysis.

The first real adapter is deliberately narrow: `content_patch_v1` may change only the registered text slot `index.hero.title` and the registered same-origin raster image/alt slot `index.hero.poster`. The architecture preserves typed extension points for page composition, navigation, forms, catalog policies, accounts and commerce, but M001 does not implement those product capabilities.

## Authorization boundary

M001 ends at a locally verified release candidate. It does not authorize `git push`, pull requests, remote deployment, Timeweb changes, production data migration, production credentials, traffic enrollment or a content-changing production A/B test.

`M002` is a separate future milestone: production storage cutover, disabled-by-default deployment, rollback drill, production A/A enrollment, seven-day conversion completion, three-day Logs reconciliation and a documented go/no-go. M002 requires a new explicit user authorization and legal/privacy approval.

## Capability requirements

Status meanings: `active` is owned by M001, `future` is intentionally deferred to a named future milestone, and `out` is rejected by the approved architecture.

| ID | Class | Status | Capability / why | Primary owner | Validation |
|---|---|---|---|---|---|
| R001 | operations | active | Runtime Strapi DB and uploads are persistent, bootstrap-only, backed up consistently and recoverable; experiments must not turn CMS data into disposable seed state. | S02 | storage migration and restore drill |
| R002 | safety | active | Only code-registered typed text/image slots are mutable; arbitrary HTML, selectors, JSON paths, SVG and external media are rejected. | S01 | schema negatives and DOM allowlist |
| R003 | runtime | active | A consented subject receives deterministic sticky assignment and the payload is available before the first React render without flicker. | S01 | golden vectors and Chrome first-paint proof |
| R004 | governance | active | Experiment definitions, revisions, allocation, analysis design and media are immutable after launch and reproducible by canonical hash. | S02 | lifecycle, hash and mutation tests |
| R005 | operator | active | A Russian Strapi workflow supports draft, validate, design, preview, launch, stop and archive without a second admin application. | S03 | Strapi Admin browser contract |
| R006 | primary metric | active | A successfully persisted lead is attributed transactionally and is the authoritative binary primary conversion; experiment errors never reject a valid lead. | S04 | lead transaction and queue regression tests |
| R007 | privacy | active | Consent-gated Metrica parameters and identity linking contain no PII or raw stable identifier. | S04 | consent matrix, redaction and capture assertions |
| R008 | data | active | Logs extraction is restart-safe, complete by part, reconciles D-3..D-1 and hashes raw Yandex identifiers before derived persistence. | S05 | fake Logs API interruption suite |
| R009 | statistics | active | Pinned Ambrosia performs frozen design and one fixed-horizon final analysis with SRM hard-stop, quality gates and immutable result. | S06 | synthetic null/effect/SRM fixtures |
| R010 | resilience | active | Strapi, event DB, Metrica, Logs and worker failures fail to control/no-enrollment and never enter the public request dependency chain. | S01, S07 | failure injection and kill-switch drills |
| R011 | operations | active | Aggregate health, redaction, retention, checkpointing, backup and recovery are observable and documented. | S05, S07 | health/retention/recovery tests |
| R012 | qualification | active | A local A/A harness exercises the production code path and quality rules without requiring a convenient p-value. | S07 | deterministic local A/A run |
| R013 | compatibility | active | Existing CMS hydrate allowlists, catalog, forms, email routing, privacy behavior, performance and build remain green. | S01–S07 | repository regression gate |
| R020 | extensibility | future | `page_composition_v1` may add/remove/reorder approved section types through a typed registry. | future M003 | adapter-specific contract and visual gates |
| R021 | extensibility | future | Navigation, form schema and catalog sort/filter/option adapters may be added without replacing assignment or evidence contracts. | future M003 | adapter-specific integration suites |
| R022 | commerce | future | Account, checkout, payment and commerce feature adapters reuse the assignment/result core after those product capabilities exist. | future commerce milestone | security, transaction and legal gates |
| R023 | release | future | Production A/A must pass before any content-changing traffic experiment. | M002 | production evidence bundle and go/no-go |
| R030 | safety | out | Arbitrary operator-authored HTML/CSS/JS, DOM selectors or unrestricted JSON patches. | — | schema rejection |
| R031 | vendor | out | GrowthBook, Varioqub, Bucketeer, Google Analytics or a paid Strapi edition in the critical architecture. | — | dependency/license audit |
| R032 | scope | out | Building accounts, cart, checkout, payment or a generic page builder in M001. | — | scope/diff review |
| R033 | authorization | out | Remote push, deploy or production mutation under this plan. | — | execution log review |

### Coverage summary

- Active requirements: 13; every active requirement has a primary slice and executable proof.
- Future requirements: 4; each is attached to a future milestone instead of being partially implemented now.
- Out-of-scope requirements: 4; explicit rejection tests or review gates prevent accidental inclusion.

## Observable milestone success

M001 is complete only when all of the following are true locally:

1. A manager can use the Russian Strapi UI to create a two-variant registered text/image test, receive a frozen Ambrosia design, preview both variants, launch, stop and inspect an immutable final result.
2. A consented fixture subject receives the same assignment across navigation and restart; the assigned text/image is present on first paint without control-content flash.
3. A valid lead returns the existing `202` behavior and is persisted even if experiment metadata is absent or invalid; valid metadata is recorded atomically with that lead.
4. A fake Yandex service can be interrupted at every Logs stage and resumed without lost/duplicated derived observations or raw ID leakage.
5. Null, effect, SRM, delayed-data and underpowered fixtures produce the frozen expected Ambrosia verdicts and never expose a provisional winner.
6. Event store, Strapi, Metrica, Logs and worker failures leave the site serving business traffic in control/no-enrollment mode.
7. The full repository local test/build/performance gate is green, and backup/restore reproduces verified hashes for every operational artifact.

## Risk and proof strategy

| Risk | Severity | Earliest proof | Final proof |
|---|---|---|---|
| Assignment arrives after render and causes flicker/hydration drift | critical | S01 real document + React tracer | S07 full-stack Chrome A/A |
| Mutable Strapi/media state changes a running revision | critical | S02 canonical hash and mutation rejection | S07 recovery/replay |
| Consent revocation races leave enrollment or Metrica active | critical | S04 tombstone-first state matrix | S07 browser failure drill |
| Invalid experiment metadata rejects or slows a real lead | critical | S04 transaction and queue latency tests | S07 E2E failure matrix |
| Retries duplicate jobs, rows, evidence or results | high | S02/S05 lease and idempotency fixtures | S07 restart drill |
| Delayed/missing/duplicated Yandex data creates a false winner | critical | S05 reconciliation fixtures | S06 quality and completeness gates |
| SRM or unit contamination survives into effect estimation | critical | S06 standalone SRM and mart validation | S07 A/A harness |
| Worker/Strapi failure becomes a public availability dependency | critical | S01 control fallback; S02 bounded feed | S07 process crash drills |
| Operational data is overwritten by seed/deploy behavior | critical | S02 storage preflight | S07 backup/restore drill |
| Future flexibility becomes an unsafe generic patch engine | high | S01 closed tagged schemas | milestone scope/dependency audit |

## Verification classes

- `contract`: schema, canonicalization and cross-language golden vectors.
- `unit`: pure allocation, token, consent, lifecycle, quality and result rules.
- `integration`: SQLite transactions, Strapi plugin endpoints, job leases, Logs protocol and backups.
- `browser`: local Chrome/CDP first-paint, Admin workflow, consent and form behavior. Reuse the repository's existing Chrome session harness; do not add a duplicate Playwright stack merely for convention.
- `failure`: dependency outage, crash, retry, stale cache, corrupt part, invalid token and kill switch.
- `regression`: existing CMS/catalog/forms/privacy/typecheck/build/performance gates.
- `recovery`: consistent backup, restore, checksum and replay from frozen inputs.

## Runtime boundary map

```text
Strapi Admin (operator)
  -> Strapi experiments plugin (definition, lifecycle, jobs, audit, results)
       -> immutable media in persistent uploads
       -> authenticated job API <-> Python worker
       -> signed runtime feed/invalidation -> Node runtime

Browser document request
  -> Node eligibility + consent mirror + event SQLite
       -> synchronous bootstrap in HTML -> React typed slot overlay
       -> exposure + hashed Yandex identity link
       -> existing /api/submit -> leads SQLite + transactional attribution

Python worker (never in request path)
  -> Strapi jobs/frozen inputs
  -> Yandex Metrica Logs API -> verified raw parts -> hashed unit mart
  -> local assignments/exposures/lead attribution
  -> pinned Ambrosia Designer/Tester -> immutable normalized result -> Strapi
```

Contract ownership is one-way: Strapi owns operator state, Node owns online assignment/evidence, leads SQLite owns the primary conversion, the worker owns extraction/checkpoints/marts, and Ambrosia is hidden behind an internal adapter. No consumer may infer a second competing source of truth.

## Vertical slice roadmap

| Slice | Risk | Depends on | Demoable capability | Requirements | Detailed plan |
|---|---|---|---|---|---|
| S01 — No-flicker tracer | high | — | A registered text/image A/B fixture is deterministically assigned and present before first React paint; failures render control. | R002, R003, R010, R013 | `2026-10-02-strapi-ambrosia-experimentation-platform/S01-no-flicker-tracer.md` |
| S02 — Safe control plane | high | S01 | Persistent Strapi stores a frozen revision/media, the worker computes a design, Node acknowledges the signed feed, and the revision can launch through authenticated APIs. | R001, R004, R010 | `2026-10-02-strapi-ambrosia-experimentation-platform/S02-safe-control-plane.md` |
| S03 — Russian operator loop | medium/high | S02 | An operator completes draft → validate → design → one-time preview → launch → stop in Strapi Admin. | R005, R013 | `2026-10-02-strapi-ambrosia-experimentation-platform/S03-russian-operator-loop.md` |
| S04 — Consent and primary outcome | high | S01, S02 | A consented exposure/link and accepted lead produce privacy-safe evidence; revocation stops analytics; invalid metadata never rejects the lead. | R006, R007, R010, R013 | `2026-10-02-strapi-ambrosia-experimentation-platform/S04-consent-primary-outcome.md` |
| S05 — Yandex reconciliation | high | S02, S04 | A fake multi-part Logs export survives interruption, reconciles D-3..D-1 and produces redacted derived rows/health. | R008, R011 | `2026-10-02-strapi-ambrosia-experimentation-platform/S05-yandex-reconciliation.md` |
| S06 — Ambrosia final analysis | high | S04, S05 | Frozen unit-level fixtures produce deterministic design/quality/final results; SRM and incomplete windows hard-stop conclusions. | R009, R011 | `2026-10-02-strapi-ambrosia-experimentation-platform/S06-ambrosia-final-analysis.md` |
| S07 — Local release qualification | medium/high | S01–S06 | The real local stack passes E2E A/A, outage, recovery, retention, compatibility and performance gates with Russian runbooks. | R010, R011, R012, R013 | `2026-10-02-strapi-ambrosia-experimentation-platform/S07-local-release-qualification.md` |

Slices are executed in order. Each slice must end with a working vertical behavior, its exact automated evidence and an updated execution log. A horizontal/layer-only completion does not satisfy a slice.

## Horizontal completeness checklist

Every slice review must explicitly address:

- contracts and versioning;
- persistent state, migrations and rollback;
- auth/origin/consent and redaction boundaries;
- idempotency, retry and restart behavior;
- control/no-enrollment fallback;
- aggregate observability without identifiers;
- negative and failure-path tests;
- compatibility with current CMS hydrate allowlists and DOM hooks;
- local-only verification and recovery impact;
- documentation/runbook change when the operational contract changes.

## Execution rules

1. Use test-first implementation. Each task begins with a failing automated test or fixture and ends only after its task `Verify` command passes.
2. Keep each task within its declared file boundary. If it exceeds 11 touched files or 9 implementation steps, split it before editing.
3. Verification commands are package scripts or test commands—never shell pipelines, inline `node -e`, command substitution or manual-only claims.
4. Record exact test commands, results, durations and commits in this file after every completed slice.
5. Preserve unrelated user changes. No task may push, deploy or mutate external environments.
6. Do not expose arbitrary HTML/CSS/JS/selectors/paths; do not send PII or raw IDs to Metrica, logs, diagnostics or Ambrosia.
7. Never block a valid lead because experiment metadata is invalid or an experiment dependency is down.
8. Hide provisional results; only a fixed-horizon final result may carry a verdict, and rollout remains a human decision.
9. If implementation invalidates the approved architecture or a capability requirement, pause and amend the spec and milestone plan before continuing.

## Milestone definition of done

- [ ] All seven vertical slice demos and task verification commands pass locally.
- [ ] All R001–R013 validations have stored evidence; no active requirement is orphaned.
- [ ] Threats and highest risks have negative/failure tests, not only happy-path checks.
- [ ] Backup/restore and deterministic replay reproduce artifact hashes and normalized results.
- [ ] No raw subject, lead, account or Yandex client identifier appears in logs, databases or derived files outside the explicitly time-bounded verified raw staging area.
- [ ] Existing CMS, catalog, form/email routing, privacy, typecheck, build and performance gates pass.
- [ ] Scope/dependency audit finds no generic patch engine, accounts/commerce implementation, Google Analytics, paid/closed A/B service or remote mutation.
- [ ] Russian operator, privacy/data, recovery and future M002 A/A runbooks are complete.
- [ ] Production remains disabled and untouched; M002 is still a separate authorization decision.

## Final local verification gate

Run from a clean-checkout-compatible local state. A skipped or unavailable command is a failed gate and leaves the milestone `in_progress` or `blocked`.

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
npm run check:experiments:phase
```

Service-dependent checks use the local Strapi/Node/Vite stack, temporary paths and fake Yandex service. Browser/CDP inspection supplements but never replaces automated assertions.

## Future M002 — not authorized

M002 may be planned only after M001 is green. Its minimum slices are:

1. persistent production storage cutover and verified rollback with experiments disabled;
2. production A/A enrollment, planned sample/hard deadline, seven-day conversion completion and three-day reconciliation;
3. evidence review, legal/privacy sign-off and explicit go/no-go for the first content-changing test.

No M002 task is executable under this document.

## Execution log

| Slice | Status | Tests added and exact local results | Commit(s) |
|---|---|---|---|
| S01. No-flicker tracer | pending | — | — |
| S02. Safe control plane | pending | — | — |
| S03. Russian operator loop | pending | — | — |
| S04. Consent and primary outcome | pending | — | — |
| S05. Yandex reconciliation | pending | — | — |
| S06. Ambrosia final analysis | pending | — | — |
| S07. Local release qualification | pending | — | — |
| M002. Production cutover + A/A | not authorized | Requires a separate explicit user request | — |
