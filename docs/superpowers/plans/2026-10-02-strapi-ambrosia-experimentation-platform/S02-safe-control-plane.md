# S02 — Safe control plane

**Status:** pending
**Depends on:** S01
**Requirements:** R001, R004, R010
**Demo:** Through authenticated local APIs, a valid draft is frozen with content-addressed media, a pinned worker design job completes idempotently, Node acknowledges the signed runtime feed, and the revision launches; mutation/retry/outage cannot change a running revision or enroll unsafe traffic.

## Must-haves

- Runtime Strapi DB/uploads are persistent operational data and changed seed content cannot overwrite them.
- Revision bytes, hash, allocation, design inputs/results and experiment media are immutable after launch.
- Strapi lifecycle and job transitions are transactional, audited and idempotent.
- Node uses validated signed feed snapshots and bounded last-known-good only; Strapi is never called synchronously from the public request path.
- Python/Ambrosia is a separately supervised offline process with frozen dependency versions.

## Proof and risk

**Proof level:** real local Strapi plugin server, persistent temp volumes, real Node feed consumer and real pinned Python/Ambrosia design call; Admin UI comes in S03.

**Q3 threat surface:** admin/internal authorization, seed overwrite, SQLite live-copy corruption, upload traversal/symlink/MIME confusion, feed forgery/replay, concurrent launch, duplicate job completion and secret leakage.

**Q4 requirement impact:** creates the authoritative revision/job/feed model. Later slices may extend records but may not bypass immutable state transitions or change the canonical hash.

**Observability:** aggregate storage readiness, feed revision/age/ack state, job queue counts/lease age and worker health without payloads, tokens or identifiers.

## T02.1 — Bootstrap-only operational storage and immutable media

**estimated_steps:** 8
**estimated_files:** 11
**skills_used:** `superpowers:test-driven-development`

**Description:** Prevent production-style runtime data from being replaced by seeds, establish consistent backup/restore and make experiment media content-addressed on persistent uploads.

**Expected Output:**

- Modify `scripts/start-services.sh`
- Create `lib/sqlite-backup.cjs`
- Create `scripts/experiments/backup-runtime-data.mjs`
- Create `scripts/experiments/restore-runtime-data.mjs`
- Modify `lib/uploads-disk-first.cjs`
- Create `scripts/experiments/migrate-uploads.mjs`
- Create `lib/experiments/immutable-media.cjs`
- Create `scripts/check-experiments-storage.mjs`
- Create `scripts/check-experiments-media.mjs`
- Modify `.env.example`
- Modify `package.json`

**Inputs:** [`scripts/start-services.sh`, `lib/uploads-disk-first.cjs`, `contracts/experiments/slots.v1.json`, `docs/superpowers/specs/2026-10-02-strapi-ambrosia-experimentation-platform-design.md`]

**Q5 failure modes:** changed seed over non-empty DB, interrupted backup/restore, invalid manifest, hash collision/same-name conflict, traversal, symlink escape, invalid signature/dimensions and missing volume.
**Q6 load profile:** startup/migration and backup are offline operational paths; media validation is bounded by configured byte/dimension limits.
**Q7 negative tests:** destructive reseed without dual acknowledgement, direct live SQLite copy, incomplete recovery set and every media path/type escape.

**Steps:**

1. Add failing preflight, backup, restore and media fixtures.
2. Default auto-seed replacement off for non-empty runtime data; retain empty-bootstrap behavior.
3. Require explicit destructive acknowledgement plus verified pre-reseed backup.
4. Use SQLite backup API, integrity check, temporary destination and atomic rename.
5. Define canonical persistent uploads root and idempotently copy only missing bundled assets.
6. Validate raster signature/size/dimensions and publish experiments by SHA-256 filename.
7. Build complete manifests for Strapi DB/uploads, leads, experiment DB and worker checkpoints.
8. Document env contracts without performing any remote cutover.

**Verify:** `npm run check:experiments:storage`
**Done when:** a changed seed cannot overwrite operational data and backup/restore/media attack fixtures pass.

## T02.2 — Immutable Strapi lifecycle and signed runtime feed

**estimated_steps:** 9
**estimated_files:** 11
**skills_used:** `superpowers:test-driven-development`

**Description:** Build the server half of a local Strapi Community plugin with frozen revisions, audits, job records and a signed feed/ack lifecycle.

**Expected Output:**

- Modify `strapi-catalog/config/plugins.js`
- Create `strapi-catalog/src/plugins/experiments/package.json`
- Create `strapi-catalog/src/plugins/experiments/strapi-server.js`
- Create `strapi-catalog/src/plugins/experiments/server/src/index.js`
- Create `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment/schema.json`
- Create `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-revision/schema.json`
- Create `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-job/schema.json`
- Create `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-audit/schema.json`
- Create `strapi-catalog/src/plugins/experiments/server/src/services/lifecycle.js`
- Create `strapi-catalog/src/plugins/experiments/server/src/controllers/internal.js`
- Create `scripts/check-experiments-strapi.mjs`

**Inputs:** [`contracts/experiments/revision-v1.schema.json`, `contracts/experiments/slots.v1.json`, `lib/experiments/immutable-media.cjs`, `strapi-catalog/config/plugins.js`, `strapi-catalog/scripts/prepare-dist.cjs`]

**Q5 failure modes:** invalid transition, launch without design, post-launch mutation/delete, concurrent launch, hash/media mismatch, duplicate audit/job, forged internal token and stale Node acknowledgement.
**Q6 load profile:** low-volume operator/job traffic; feed reads are cacheable and bounded; lifecycle writes use short transactions.
**Q7 negative tests:** every invalid state edge, unknown registry key, reused experiment key, revision downgrade and authorization failure.

**Steps:**

1. Add failing lifecycle/auth/concurrency fixtures through the real plugin server.
2. Define experiment, immutable revision, leased job and append-only audit schemas.
3. Validate against shared registries and canonicalize before persistence.
4. Freeze media hashes, metric/design inputs and allocation in a launchable revision.
5. Implement explicit draft/validating/designed/launching/running/stopped/archived transitions.
6. Implement authenticated claim/heartbeat/complete/fail job endpoints with idempotency keys.
7. Emit signed runtime feed snapshots and require matching Node revision/hash acknowledgement before `running`.
8. Reject post-launch updates/deletes and concurrent conflicting launches transactionally.
9. Keep payload/audit logs redacted and register the check script.

**Verify:** `npm run check:experiments:strapi`
**Done when:** only a designed, acknowledged immutable revision can run and retries cannot fork lifecycle/audit state.

## T02.3 — Pinned design worker and real feed handoff

**estimated_steps:** 8
**estimated_files:** 11
**skills_used:** `superpowers:test-driven-development`

**Description:** Add the isolated Python worker, execute a real pinned Ambrosia `Designer` job and replace S01 fixture input with a signed Strapi feed plus safe last-known-good behavior.

**Expected Output:**

- Create `experiments-worker/pyproject.toml`
- Create `experiments-worker/requirements.lock`
- Create `experiments-worker/worker/__main__.py`
- Create `experiments-worker/worker/config.py`
- Create `experiments-worker/worker/strapi_client.py`
- Create `experiments-worker/worker/jobs.py`
- Create `experiments-worker/worker/ambrosia_adapter.py`
- Create `experiments-worker/tests/test_design_job.py`
- Modify `lib/experiments/runtime-feed.cjs`
- Create `scripts/check-experiments-control-plane.mjs`
- Modify `package.json`

**Inputs:** [`strapi-catalog/src/plugins/experiments/server/src/controllers/internal.js`, `strapi-catalog/src/plugins/experiments/server/src/services/lifecycle.js`, `lib/experiments/runtime-feed.cjs`, `test/fixtures/experiments/revision-golden.json`]

**Q5 failure modes:** claim race, lease expiry, duplicate completion, input-hash mismatch, worker crash, invalid Ambrosia output, signature/replay failure, Strapi outage and feed lease expiry.
**Q6 load profile:** single/low-concurrency worker; Node feed refresh occurs out of band and serves in-memory validated snapshots.
**Q7 negative tests:** crash/restart at each job state, two workers racing, changed frozen input and stale/forged/unknown-key feed.

**Steps:**

1. Pin Python 3.11 dependencies and `ambrosia==0.5.3.post1` with reproducible hashes.
2. Add failing fake-Strapi lease/retry/idempotency tests.
3. Implement authenticated claim, heartbeat, checkpoint and normalized completion.
4. Wrap `Designer(...).run(to_design='size', method='theory', stabilizing_method='asin')` behind internal models.
5. Verify Node/Python canonical hash agreement before processing.
6. Validate signed feeds off-request, atomically swap snapshots and acknowledge exact revision/hash.
7. Bound last-known-good to five minutes; after expiry serve control/no-enrollment.
8. Prove API draft → design → launch/ack → rendered tracer and outage fallbacks.

**Verify:** `npm run check:experiments:control-plane`
**Done when:** the real backend/worker/Node handoff is deterministic, restart-safe and unavailable dependencies cannot enroll new traffic.

## Integration closure

- Run `npm run check:experiments:storage`, `npm run check:experiments:media`, `npm run check:experiments:strapi`, `npm run check:experiments:control-plane`, `npm run check:docker-runtime-contract` and a local image build.
- Perform a temporary-data backup/restore and compare manifest hashes.
- Demo authenticated API draft/design/launch, exact Node acknowledgement, immutable mutation rejection and Strapi/worker outage control fallback.
- Record exact evidence in the milestone log before S03.
