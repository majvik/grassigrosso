# S06 — Fixed-horizon Ambrosia final analysis

**Status:** pending
**Depends on:** S04, S05
**Requirements:** R009, R011
**Demo:** Frozen assignment/exposure/lead/Yandex fixtures build one row per experimental unit; null/effect data produce deterministic normalized results, while SRM, contamination, incomplete observation and underpowered deadline states suppress any winner.

## Must-haves

- Unit mart includes every assigned subject exactly once and collapses the primary outcome to binary.
- Design and analysis parameters are frozen in the launched revision.
- Enrollment closes only on planned per-group sample or hard deadline, and analysis waits for every conversion/reconciliation window.
- Standalone SRM check and data-quality gates execute before effect estimation.
- Only immutable final normalized results expose verdict/recommendation; no live/provisional winner or auto-rollout.

## Proof and risk

**Proof level:** real pinned Ambrosia calls over synthetic Parquet fixtures plus real local-source adapters; exact normalized output is golden-tested across clean reruns.

**Q3 threat surface:** selective cohort filtering, cross-variant/revision contamination, duplicate events, missing-zero bias, peeking, late-data omission, secondary multiplicity error and library/API drift.

**Q4 requirement impact:** freezes the statistical contract. Changing unit, primary metric, MDE, alpha/beta, horizon, windows, correction or quality thresholds requires a new immutable revision, never an edit in place.

**Observability:** input/hash/version lineage, cohort/variant counts, coverage, SRM statistic/status, window completeness, quality reasons and terminal job state; no unit identifiers in Strapi/Admin.

## T06.1 — Canonical unit mart and quality gates

**estimated_steps:** 8
**estimated_files:** 10
**skills_used:** `superpowers:test-driven-development`

**Description:** Build the frozen subject-level analysis table from online evidence, authoritative leads and reconciled Yandex rows, then stop invalid cohorts before estimation.

**Expected Output:**

- Create `experiments-worker/worker/local_sources.py`
- Create `experiments-worker/worker/mart.py`
- Create `experiments-worker/worker/quality.py`
- Create `experiments-worker/tests/test_mart.py`
- Create `experiments-worker/tests/test_quality.py`
- Create `test/fixtures/experiments/stat-null.parquet`
- Create `test/fixtures/experiments/stat-effect.parquet`
- Create `test/fixtures/experiments/stat-srm.parquet`
- Create `test/fixtures/experiments/stat-incomplete.parquet`
- Modify `experiments-worker/worker/config.py`

**Inputs:** [`lib/experiments/event-store.cjs`, `lib/db.cjs`, `lib/experiments/lead-attribution.cjs`, `experiments-worker/worker/reconciliation.py`, `contracts/experiments/revision-v1.schema.json`]

**Q5 failure modes:** missing assigned units, duplicate/repeated events, subject in two variants, revision/hash mix, invalid assignment token lineage, incomplete last-subject window, low/differential exposure/link coverage and inconsistent timestamps.
**Q6 load profile:** offline bounded by one revision cohort; use columnar/chunked reads and fail explicitly above configured resource limit.
**Q7 negative tests:** permutation/duplicate invariance, missing conversions become zero only after full window, contamination hard-stop and secondary-only suppression under symmetric low link coverage.

**Steps:**

1. Add failing null/effect/SRM/incomplete/duplicate/contamination fixtures.
2. Load only records matching exact experiment/revision/definition hash and planned time bounds.
3. Emit one row per assigned subject and binary primary `1` if any valid attributed lead exists, otherwise `0` after the full window.
4. Collapse declared secondary events by frozen metric rules.
5. Hard-stop cross-variant, mixed revision/hash, impossible timestamp and incomplete observation data.
6. Require exposure ≥95% per variant and loss delta ≤2 percentage points.
7. Suppress only Metrica-derived secondary metrics when link coverage <80% symmetrically; never suppress primary.
8. Produce deterministic lineage/input hash and aggregate quality report.

**Verify:** `npm run check:experiments:mart`
**Done when:** every assigned unit appears exactly once and invalid/incomplete cohorts cannot reach estimation.

## T06.2 — Pinned Ambrosia design, SRM and final estimator

**estimated_steps:** 8
**estimated_files:** 7
**skills_used:** `superpowers:test-driven-development`

**Description:** Complete the Ambrosia adapter for standalone SRM and primary/secondary final inference with fixed-horizon rules and normalized internal results.

**Expected Output:**

- Modify `experiments-worker/worker/ambrosia_adapter.py`
- Create `experiments-worker/worker/results.py`
- Create `experiments-worker/tests/test_ambrosia_adapter.py`
- Create `experiments-worker/tests/test_results.py`
- Modify `experiments-worker/worker/jobs.py`
- Modify `experiments-worker/requirements.lock`
- Create `scripts/check-experiments-analysis.mjs`

**Inputs:** [`experiments-worker/worker/mart.py`, `experiments-worker/worker/quality.py`, `experiments-worker/worker/ambrosia_adapter.py`, `experiments-worker/requirements.lock`, `experiments-worker/tests/test_design_job.py`]

**Q5 failure modes:** Ambrosia API/version drift, SRM after filtering, wrong alternative/interval/correction, analyzing before horizon, sample missed at deadline, NaN/invalid output, retry creating a second result and secondary changing primary verdict.
**Q6 load profile:** one final analysis per immutable revision plus explicit replay; no per-request or continuous-peeking analysis.
**Q7 negative tests:** SRM hard-stop, underpowered deadline, incomplete window, practical-threshold miss, known positive/negative/null and secondary multiplicity fixtures.

**Steps:**

1. Pin/verify exact Ambrosia package and add golden normalized result fixtures.
2. Preserve design call `Designer(...).run(to_design='size', method='theory', stabilizing_method='asin')` and stored per-group sample/effect/duration.
3. Enforce planned per-group sample plus 14 complete calendar days, or frozen maximum deadline.
4. Wait for the last subject's seven-day conversion plus three-day Logs reconciliation window.
5. Run `ambrosia.tools.srm.check_srm` on the complete assignment cohort with alpha `0.0005` before filtering.
6. Run primary `Tester` binary/absolute/Newcombe/two-sided/no correction and secondary family with Holm.
7. Normalize verdict (`positive|negative|no_evidence|underpowered|invalid`) separately from recommendation (`winner|loser|hold`).
8. Make completion immutable/idempotent by frozen input hash and prove byte-equivalent reruns.

**Verify:** `npm run check:experiments:analysis`
**Done when:** expected fixtures match exactly and no quality/horizon failure can emit a winner.

## T06.3 — Immutable result publication and operator interpretation

**estimated_steps:** 7
**estimated_files:** 9
**skills_used:** `superpowers:test-driven-development`

**Description:** Persist one immutable normalized result through the job API and show a Russian final summary without exposing live estimates or library-shaped data.

**Expected Output:**

- Create `strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-result/schema.json`
- Create `strapi-catalog/src/plugins/experiments/server/src/services/results.js`
- Modify `strapi-catalog/src/plugins/experiments/server/src/controllers/internal.js`
- Create `strapi-catalog/src/plugins/experiments/admin/src/components/ResultPanel.jsx`
- Modify `strapi-catalog/src/plugins/experiments/admin/src/pages/App/index.jsx`
- Modify `experiments-worker/worker/strapi_client.py`
- Create `scripts/check-experiments-results.mjs`
- Modify `scripts/check-experiments-admin-ui.mjs`
- Modify `package.json`

**Inputs:** [`experiments-worker/worker/results.py`, `experiments-worker/worker/strapi_client.py`, `strapi-catalog/src/plugins/experiments/server/src/controllers/internal.js`, `strapi-catalog/src/plugins/experiments/admin/src/pages/App/index.jsx`]

**Q5 failure modes:** duplicate/conflicting completion, result/revision hash mismatch, provisional upload, library-specific columns, retry overwrite and UI implying automatic rollout.
**Q6 load profile:** one small terminal write/read per revision; no raw mart rows in Strapi.
**Q7 negative tests:** conflicting result hash, nonterminal analysis, SRM/invalid/underpowered states and UI snapshot proving no winner/rollout language where forbidden.

**Steps:**

1. Add failing immutable publication and Russian UI interpretation tests.
2. Store normalized aggregates, lineage hashes, versions, gates, verdict and recommendation only.
3. Bind result to exact revision/definition/design/input hashes and accept one idempotent completion.
4. Reject overwrite, conflicting retry and nonterminal/provisional submission.
5. Display sample/window/coverage/SRM/gates and final status in Russian.
6. Separate statistical verdict from human business decision; provide no automatic activation button.
7. Re-run Admin lifecycle tests for stopped/archived result access.

**Verify:** `npm run check:experiments:results`
**Done when:** exactly one reproducible final record exists and the operator cannot mistake invalid/provisional data for a winner.

## Integration closure

- Run mart, analysis and result checks twice from clean checkpoints and compare normalized hashes.
- Demo null, positive, negative, SRM, incomplete, underpowered and secondary-low-coverage states in the real Admin result panel.
- Prove primary verdict is invariant to secondary inclusion/correction and no provisional result is stored/displayed.
- Record exact evidence before S07.
