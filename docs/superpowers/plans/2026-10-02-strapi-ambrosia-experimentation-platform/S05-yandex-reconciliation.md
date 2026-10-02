# S05 — Restart-safe Yandex reconciliation

**Status:** pending
**Depends on:** S02, S04
**Requirements:** R008, R011
**Demo:** Against a local fake Yandex Logs API, the worker prepares, polls, downloads and verifies every part, survives interruption, reconciles D-3..D-1, hashes raw client IDs before derived persistence and exposes redacted health/retention state.

## Must-haves

- Extract only frozen required hit/visit fields for complete previous days.
- Protocol is prepare → poll → list/download every part → verify checksum/rows → atomic publish → delete remote prepared log.
- Checkpoints and stable upserts make every interruption/retry idempotent.
- Raw client IDs exist only in restricted, time-bounded verified raw staging; derived data contains HMAC plus key ID only.
- D-3..D-1 is reimported on every daily reconciliation so delayed Yandex data is included.

## Proof and risk

**Proof level:** protocol-complete local fake server with multi-part payloads, injected faults and process restarts; no real Yandex credentials or network.

**Q3 threat surface:** credential exposure, hostile/corrupt parts, decompression/resource exhaustion, raw identifier leakage, premature remote deletion, path traversal, duplicate/stale data and poisoned checkpoints.

**Q4 requirement impact:** defines the secondary-data availability and lineage contract consumed by S06; field-set/window/hash-key changes require frozen revision metadata and migration.

**Observability:** last successful complete date, current stage, retry/error code, part/row counts, reconciliation window, raw-retention backlog and key ID only.

## T05.1 — Worker checkpoints and fake Logs protocol

**estimated_steps:** 7
**estimated_files:** 10
**skills_used:** `superpowers:test-driven-development`

**Description:** Extend the S02 worker with restart-safe stage checkpoints and a protocol-complete fake Yandex service that can inject every expected transport/state failure.

**Expected Output:**

- Create `experiments-worker/worker/checkpoints.py`
- Create `experiments-worker/worker/yandex_logs.py`
- Create `experiments-worker/tests/fakes/yandex_logs_server.py`
- Create `experiments-worker/tests/test_yandex_protocol.py`
- Create `test/fixtures/experiments/yandex-hits.jsonl`
- Create `test/fixtures/experiments/yandex-visits.jsonl`
- Modify `experiments-worker/worker/config.py`
- Modify `experiments-worker/worker/__main__.py`
- Create `scripts/check-experiments-yandex.mjs`
- Modify `package.json`

**Inputs:** [`experiments-worker/worker/jobs.py`, `experiments-worker/worker/config.py`, `experiments-worker/worker/__main__.py`, `docs/superpowers/specs/2026-10-02-strapi-ambrosia-experimentation-platform-design.md`]

**Q5 failure modes:** prepare/poll timeout, remote failure status, missing/duplicate part, corrupt checksum, truncated body, delete failure, 429/5xx, process death at each stage and credential in exception.
**Q6 load profile:** daily batch only; bounded polling/backoff, download size/part/row limits and streaming verification avoid unbounded memory.
**Q7 negative tests:** inject each Q5 case and assert checkpoint/resume behavior, no atomic publish and no premature remote delete.

**Steps:**

1. Add failing fake-server scenarios before the client.
2. Freeze requested hit/visit field sets and complete-day date validation.
3. Implement prepare/poll/list/download/delete with bounded timeout/backoff.
4. Verify all declared parts, checksums, compression and row schema while staging.
5. Persist monotonic stage checkpoints and input identity atomically.
6. Resume safely after death without re-publishing or losing the remote prepared log.
7. Redact credentials/URLs/query payload from structured errors.

**Verify:** `npm run check:experiments:yandex-protocol`
**Done when:** every interruption resumes deterministically and remote deletion happens only after verified local publish.

## T05.2 — Raw staging, keyed identity derivation and D-3..D-1 reconciliation

**estimated_steps:** 8
**estimated_files:** 9
**skills_used:** `superpowers:test-driven-development`

**Description:** Publish verified raw parts atomically, derive only keyed identities and reconcile delayed rows through stable upserts.

**Expected Output:**

- Create `experiments-worker/worker/raw_store.py`
- Create `experiments-worker/worker/identity.py`
- Create `experiments-worker/worker/reconciliation.py`
- Create `experiments-worker/tests/test_raw_store.py`
- Create `experiments-worker/tests/test_reconciliation.py`
- Create `test/fixtures/experiments/identity-golden.json`
- Modify `experiments-worker/worker/yandex_logs.py`
- Modify `experiments-worker/worker/config.py`
- Modify `scripts/check-experiments-yandex.mjs`

**Inputs:** [`experiments-worker/worker/yandex_logs.py`, `experiments-worker/worker/checkpoints.py`, `lib/experiments/identity.cjs`, `lib/experiments/event-store.cjs`, `test/fixtures/experiments/yandex-hits.jsonl`, `test/fixtures/experiments/yandex-visits.jsonl`]

**Q5 failure modes:** noncanonical clientID, wrong hash key, key rotation mismatch, cross-counter collision, duplicate/late/corrected rows, path escape, partial publish and raw value in derived/log output.
**Q6 load profile:** D-3..D-1 bounded rolling re-read; stream/chunk rows and use indexed stable Yandex hit/visit IDs for upsert.
**Q7 negative tests:** duplicate order permutations, delayed/corrected data, mixed key IDs and sentinel raw IDs searched across files/log captures.

**Steps:**

1. Add failing raw-path, identity-golden and reconciliation fixtures.
2. Publish verified parts by date/type/run under restrictive permissions using temp rename.
3. Canonicalize unsigned decimal clientID and HMAC `<counter_id>:<clientID>` with recorded key ID immediately during derivation.
4. Join only through matching stored analytics hash/key ID; persist no raw ID in derived rows.
5. Reimport D-3..D-1 and upsert by stable source row IDs.
6. Make repeated runs/order changes produce byte-equivalent normalized derived output.
7. Assert sentinel raw values are absent outside staging.
8. Expose only aggregate date/row/coverage reconciliation metadata.

**Verify:** `npm run check:experiments:yandex-reconciliation`
**Done when:** delayed/duplicate/corrected fixtures converge to one deterministic derived dataset with cross-language identity agreement.

## T05.3 — Retention and aggregate pipeline health

**estimated_steps:** 6
**estimated_files:** 8
**skills_used:** `superpowers:test-driven-development`

**Description:** Delete verified raw staging on schedule, preserve lineage/checkpoints and report degraded secondary data without affecting online traffic.

**Expected Output:**

- Create `experiments-worker/worker/retention.py`
- Create `experiments-worker/worker/health.py`
- Create `experiments-worker/tests/test_retention.py`
- Create `experiments-worker/tests/test_health.py`
- Modify `experiments-worker/worker/__main__.py`
- Modify `server.cjs`
- Create `scripts/check-experiments-yandex-operations.mjs`
- Modify `.env.example`

**Inputs:** [`experiments-worker/worker/checkpoints.py`, `experiments-worker/worker/raw_store.py`, `experiments-worker/worker/reconciliation.py`, `experiments-worker/worker/config.py`, `server.cjs`]

**Q5 failure modes:** deleting unverified/active raw data, partial delete, clock skew, retention rerun, health leaking paths/IDs and pipeline degradation changing public health/assignment behavior.
**Q6 load profile:** scheduled low-frequency scan with bounded batches; health reads small aggregate checkpoint state.
**Q7 negative tests:** incomplete mart, active run, future timestamp, missing path, permission error and redaction sentinels.

**Steps:**

1. Add failing retention eligibility/idempotency and health-redaction fixtures.
2. Implement dry-run plan and audited apply with seven-day verified-raw policy.
3. Preserve checksums, lineage, aggregate counts and checkpoints after raw deletion.
4. Report stage freshness/retry/backlog through worker health.
5. Merge degradation into Node aggregate health without changing public `200` when the site is healthy.
6. Prove Logs/worker outages never change current serving state or enroll extra traffic.

**Verify:** `npm run check:experiments:yandex-operations`
**Done when:** raw retention is safe/repeatable and secondary-pipeline health is useful without identifiers or availability coupling.

## Integration closure

- Run the protocol, reconciliation and operations checks twice from clean and interrupted checkpoints.
- Verify deterministic derived hashes and search every captured output for raw sentinel IDs/credentials.
- Demo a three-day rolling run with late rows, corrupt part, crash/resume and successful retention.
- Record exact evidence before S06.
