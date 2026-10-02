# S07 — Local release qualification

**Status:** pending
**Depends on:** S01–S06
**Requirements:** R010, R011, R012, R013
**Demo:** A clean local stack executes the complete A/A journey and fixed-horizon fixture analysis, survives dependency/process/storage failures, restores from a consistent backup and passes current CMS/catalog/forms/privacy/build/performance gates with Russian runbooks.

## Must-haves

- Runtime image packages but independently supervises Node, Strapi and worker; worker failure cannot terminate business traffic.
- One automated E2E uses the real entrypoints and local fake Yandex service from draft through immutable result.
- A/A accepts/rejects on frozen quality/operational criteria, never on fishing for `p > 0.05`.
- Failure, retention and recovery drills are executable and redaction-safe.
- All existing project gates pass; production remains disabled and untouched.

## Proof and risk

**Proof level:** real local Docker/runtime processes, temporary operational data, real Chrome/CDP, real Strapi/Node/Python/Ambrosia, fake Yandex transport and full repository regression commands.

**Q3 threat surface:** process supervision loops, health leaking secrets/paths, corrupt restore, kill-switch bypass, startup race, stale feed after stop, test accidentally calling real Yandex/remote host and runbooks authorizing deployment.

**Q4 requirement impact:** closes M001 only. Any remote deployment/A/A remains M002 and cannot be inferred from a green local result.

**Observability:** aggregate process/feed/event/worker/Logs state, last recovery/retention result, kill-switch state and traceable local evidence manifest with versions/fixture hashes/commands.

## T07.1 — Independent runtime supervision, retention and recovery

**estimated_steps:** 8
**estimated_files:** 10
**skills_used:** `superpowers:test-driven-development`

**Description:** Package and supervise the worker independently, unify redacted health and prove complete operational backup/restore plus retention behavior.

**Expected Output:**

- Modify `Dockerfile`
- Modify `scripts/start-services.sh`
- Modify `server.cjs`
- Modify `scripts/experiments/backup-runtime-data.mjs`
- Modify `scripts/experiments/restore-runtime-data.mjs`
- Create `scripts/check-experiments-runtime-ops.mjs`
- Modify `scripts/check-docker-runtime-contract.mjs`
- Create `docs/experiments/recovery-runbook.md`
- Create `docs/experiments/privacy-data-map.md`
- Modify `.env.example`

**Inputs:** [`Dockerfile`, `scripts/start-services.sh`, `scripts/experiments/backup-runtime-data.mjs`, `scripts/experiments/restore-runtime-data.mjs`, `experiments-worker/worker/retention.py`, `experiments-worker/worker/health.py`, `experiments-worker/requirements.lock`]

**Q5 failure modes:** worker crash loop, Strapi slow start, missing Python env, graceful-shutdown race, incomplete/corrupt backup, restore over live state, retention during active analysis and secret/raw ID in health/manifest.
**Q6 load profile:** bounded restart backoff; backup/restore/retention are operator jobs outside request path; health is constant-size aggregate state.
**Q7 negative tests:** kill worker/Strapi independently, corrupt each artifact, omit volume/checkpoint, duplicate retention/restore and search outputs for sentinels.

**Steps:**

1. Add failing process/recovery/redaction tests.
2. Install the pinned Python environment in the local image and supervise worker independently from Node/Strapi.
3. Bound restarts/backoff and keep public health `200` when business serving is healthy but offline analysis is degraded.
4. Include Strapi DB/uploads, leads, event DB, worker checkpoint/version/lineage in one verified recovery manifest.
5. Refuse incomplete/corrupt or unsafe live overwrite and create a pre-restore backup.
6. Exercise retention only on terminal/verified artifacts and keep immutable aggregate results.
7. Write exact Russian restore, key rotation, kill-switch and data-retention procedures.
8. Build the local image and execute process/storage drills.

**Verify:** `npm run check:experiments:runtime-ops`
**Done when:** worker/storage failure cannot stop business traffic and a restore reproduces all declared hashes and runnable state.

## T07.2 — Full local E2E, A/A and failure matrix

**estimated_steps:** 9
**estimated_files:** 9
**skills_used:** `superpowers:test-driven-development`, `superpowers:verification-before-completion`

**Description:** Drive the real local boundaries from Russian operator action to final result and systematically exercise the highest-risk failure cases.

**Expected Output:**

- Create `scripts/check-experiments-e2e.mjs`
- Create `scripts/check-experiments-failures.mjs`
- Create `scripts/check-experiments-aa.mjs`
- Create `scripts/check-experiments-phase.mjs`
- Create `test/fixtures/experiments/aa-run.json`
- Create `docs/experiments/operator-runbook.md`
- Create `docs/experiments/aa-launch-checklist.md`
- Modify `package.json`
- Modify `docs/superpowers/plans/2026-10-02-strapi-ambrosia-experimentation-platform/S07-local-release-qualification.md`

**Inputs:** [`scripts/check-experiments-admin-ui.mjs`, `scripts/check-experiments-first-paint.mjs`, `scripts/check-experiments-leads.mjs`, `scripts/check-experiments-results.mjs`, `experiments-worker/tests/fakes/yandex_logs_server.py`, `scripts/lib/catalog-chrome-session.mjs`]

**Q5 failure modes:** test escaping to real network, nondeterministic clocks/IDs, false pass after skipped stage, A/A p-value criterion, stale assignment after stop, delayed Logs, kill-switch race and valid lead failure.
**Q6 load profile:** deterministic small functional cohort plus explicit bounded load probes; production-scale inference is not claimed.
**Q7 negative tests:** Strapi outage, expired feed lease, event DB locked/unavailable, invalid token, Metrica down, worker crash, Logs delayed/corrupt, emergency stop and global kill switch.

**Steps:**

1. Build hermetic temp DB/volume/port orchestration and deny unexpected external network.
2. Automate draft → design → preview A/B → launch/ack → consented assignment → first paint → exposure/link → accepted lead → Logs reconciliation → final result → stop/archive.
3. Run identical immutable A/A payloads through the exact same path and quality code.
4. Require no SRM/cross-variant unit, exposure ≥95%, secondary link ≥80% when interpreted and loss delta ≤2 pp.
5. Treat significant A/A as investigate/repeat, never as a searched-for pass/fail winner; do not require `p > 0.05`.
6. Execute every failure mode and assert business traffic/control behavior.
7. Record versions, fixture/input/output hashes, commands and durations without secrets.
8. Write Russian operator and separately authorized M002 A/A checklist with rollback/go-no-go ownership.
9. Run the harness twice to prove cleanup, restart and idempotency.

**Verify:** `npm run check:experiments:e2e`
**Done when:** complete happy/failure/A/A flows are automated, deterministic and never touch remote systems.

## T07.3 — Repository compatibility and milestone evidence gate

**estimated_steps:** 6
**estimated_files:** 5
**skills_used:** `superpowers:verification-before-completion`

**Description:** Aggregate experiment checks, run every relevant current-project gate and close requirement/threat/scope evidence without broadening authorization.

**Expected Output:**

- Create `scripts/check-experiments-all.mjs`
- Modify `package.json`
- Modify `README.md`
- Modify `docs/superpowers/plans/2026-10-02-strapi-ambrosia-experimentation-platform.md`
- Modify `docs/superpowers/plans/2026-10-02-strapi-ambrosia-experimentation-platform/S07-local-release-qualification.md`

**Inputs:** [`package.json`, `scripts/check-experiments-phase.mjs`, `docs/experiments/operator-runbook.md`, `docs/experiments/recovery-runbook.md`, `docs/experiments/privacy-data-map.md`, `docs/experiments/aa-launch-checklist.md`]

**Q5 failure modes:** swallowed child failure, skipped service-dependent gate, stale evidence, unrelated failing regression, untested active requirement/threat and documentation implying production readiness.
**Q6 load profile:** full qualification time is recorded; individual timeout is explicit and a timeout fails rather than skips.
**Q7 negative tests:** force a child check failure/timeout and assert aggregate nonzero plus missing-evidence report.

**Steps:**

1. Add an aggregate runner that preserves child exit codes, timeouts and readable local logs.
2. Run all experiment contract/unit/integration/browser/failure/recovery checks.
3. Run typecheck, general check, CMS hydrate/media, submit queue, build, catalog API/UI/perf and Docker build gates.
4. Map R001–R013 and each critical risk to concrete passing evidence; leave any missing proof open.
5. Audit dependencies/scope for forbidden vendors, generic patch engine, commerce implementation or remote mutation.
6. Update milestone and slice logs with exact commands/results/commits; mark M001 complete only if every gate is green.

**Verify:** `npm run check:experiments`
**Done when:** the entire local gate is green with complete evidence, or the milestone remains explicitly `in_progress`/`blocked` with exact failing commands.

## Integration closure

- Run the master plan's complete local verification gate from a clean-checkout-compatible state.
- Verify the evidence manifest, backups and normalized result hashes on a second run.
- Review all R001–R013, critical risks and horizontal checklist items.
- Stop at the local release candidate. Do not push, deploy, configure production or enroll traffic.
