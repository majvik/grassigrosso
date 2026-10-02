# GSD-pi plan review — Strapi + Yandex Logs + Ambrosia

**Date:** 2026-10-02
**Plan:** `docs/superpowers/plans/2026-10-02-strapi-ambrosia-experimentation-platform.md`
**Outcome:** content review `CONVERGED`; canonical GSD runtime materialization `BLOCKED` by absent model provider
**Review mode:** fresh upstream GSD-pi source plus three fresh simulated reviewer cycles, as permitted when external reviewers are unavailable

## Upstream provenance

- Repository: `https://github.com/open-gsd/gsd-pi`
- Reviewed source commit: `372fea8015fcd0760476d51103a94ff85d67fb68`
- Commit date/subject: `2026-10-02T02:07:18-05:00 fix(gsd): stop recording read-only gsd_exec_search as execution evidence (#2514)`
- Source package and npm latest at review time: `1.20.1`
- Source CLI proof: `node scripts/dev-cli.js --version` returned `1.20.1`

The repository was cloned to a temporary directory and installed with its locked workspace dependencies. The source CLI was used rather than the older project-local GSD conventions. The post-install refreshed local `~/.gsd/agent` resources while preserving user-owned skills; it did not mutate or publish project code.

## Actual GSD execution attempt

The project was cloned to an isolated temporary checkout at commit `6d78afc` and the fresh source CLI was started in headless `new-milestone` mode with the approved design spec as context.

Observed runtime facts:

- GSD created only its temporary headless context/runtime state in the isolated checkout.
- It logged `v2 init failed, falling back to v1 string-matching`.
- Model discovery returned `No models available. Set API keys in environment variables.`
- The run was cancelled cleanly after it could not dispatch planning work: exit code `11`, zero model cost, zero tool calls.
- The real project checkout received no `.gsd` database/projection and no remote action occurred.

Therefore this review does not pretend that GSD's LLM orchestrator produced or canonically imported the plan. The structural review below applies the exact current upstream prompts/templates/rules in simulated independent cycles. A later configured GSD run should import this source plan and create its canonical `.gsd` state rather than hand-writing `.gsd` projections.

## Upstream criteria applied

- Milestone is 4–10 risk-first, vertical, demoable slices; each slice is 1–7 tasks and should fit roughly 1–3 days.
- Capability requirements use stable `R###` IDs, class/status/why/owner/validation and complete traceability.
- Roadmap defines observable success, real risks, earliest/final proof, verification classes, boundary map and milestone DoD.
- Slice plans define must-haves, Q3 threat surface, Q4 requirement impact, proof level, observability and integration closure.
- Task plans define estimates, files, inputs, expected outputs, Q5 failure modes, Q6 load, Q7 negative tests, implementation steps, one executable verification and done condition.
- A task at 10+ estimated steps or 12+ files must be split.
- Verification is a simple executable command/package script, not a shell pipeline or manual-only statement.
- Runtime-boundary work includes a real-entrypoint integration slice and failures are proven, not assumed.

## Cycle 1 — structure and goal-backward coverage

**Reviewer:** simulated fresh GSD roadmap/checker context.
**Verdict:** concerns found.

### High concerns

1. The approved plan's seven phases were horizontal layers: storage, contracts, control plane, rendering, telemetry, worker, qualification. Early phases could be “complete” without a user-visible or end-to-end capability.
2. Outcomes were mapped to task numbers but there was no stable `R###` capability contract, ownership/validation traceability or future/out-of-scope requirement ledger.
3. The local release candidate and future production A/A were separated in prose but still lived in one phase/task system, which weakened truthful milestone completion.
4. No concrete runtime-boundary map stated the single source of truth for definitions, assignments, leads, derived logs and results.

### Medium concerns

1. Browser proof existed only late in the plan; no-flicker was not the earliest high-risk vertical proof.
2. Existing Chrome/CDP infrastructure was not explicitly selected over adding a duplicate browser framework.

### Corrections

- Replaced phases with seven vertical slices ordered by risk and demoability.
- Added R001–R013 active, R020–R023 future and R030–R033 rejected capabilities with primary owners/validation.
- Defined M001 local release candidate and separate unauthorized M002 production cutover/A/A.
- Added observable success, risk/proof table, verification classes, boundary map, horizontal completeness and DoD.
- Made S01 a real document/React/SQLite no-flicker tracer and selected the existing Chrome/CDP harness.
- Synchronized the design spec's delivery-slice and acceptance wording with the vertical M001/M002 boundary; architecture contracts were not changed.

## Cycle 2 — task executability, threats and verification

**Reviewer:** simulated fresh GSD slice/task checker context with no retained Cycle 1 verdict.
**Verdict:** concerns found.

### High concerns

1. The original 15 tasks lacked `estimated_steps`, `estimated_files`, declared inputs/outputs and Q5/Q6/Q7 analysis.
2. Seven tasks named at least 12 files; the largest named 23, beyond the upstream context-risk threshold.
3. Most verification was phase-level prose rather than one exact task command and done condition.
4. The global threat table did not force threat/negative-test analysis at each slice/task boundary.

### Medium concerns

1. Logs and Ambrosia concerns were combined with worker packaging/operations, making statistical correctness and runtime supervision hard to review independently.
2. The plan did not explicitly ban a test harness from reaching real Yandex endpoints.

### Corrections

- Added seven detailed slice files with three tasks each.
- Every task now has estimates, ≤11 declared files, ≤9 steps, inputs, expected output, Q5/Q6/Q7, one package-script verification and a done condition.
- Each slice now has explicit threat surface, requirement impact, proof level, observability and integration closure.
- Split Logs protocol/reconciliation/retention from mart/Ambrosia/result publication and from final process/recovery qualification.
- Made the E2E harness hermetic and required unexpected external network to fail.

## Cycle 3 — integration closure and authorization truthfulness

**Reviewer:** simulated fresh independent GSD convergence cycle with the revised documents only.
**Verdict:** no blocking or high-confidence plan defect found.

Checked specifically:

- all active requirements have a primary owner and executable proof;
- each slice ends with a vertical demo, not a layer artifact;
- the Node/Strapi/browser/Python/Yandex/SQLite entrypoints close in S02, S04–S06 and the real full-stack S07;
- consent revocation, assignment/event retries, immutable media, delayed Logs and SRM have explicit negative/failure proofs;
- current leads/email/CMS/catalog/privacy/performance behavior has regression ownership;
- future structural/commerce flexibility is preserved through typed adapters but not implemented prematurely;
- production actions remain outside the authorized milestone;
- no task exceeds upstream size warnings and no verification command uses a forbidden inline shell construct.

## Residual conditions

These are execution gates, not unresolved architecture choices:

1. Configure a supported model/provider before asking the fresh GSD CLI to import/materialize this plan in canonical `.gsd` state.
2. During implementation, verify actual dependency APIs and lock hashes before accepting Ambrosia/Yandex integration tasks; planning syntax is not execution proof.
3. Slices remain `pending` until their new tests and all relevant existing local gates pass; this review does not claim the system is implemented.
4. M002 remains forbidden until a separate explicit user request and legal/privacy approval.

## Review conclusion

The revised source plan converges against the fresh GSD-pi planning templates and plan-review criteria: it is goal-backward, risk-first, vertically sliced, traceable and executable within bounded task contexts. The only blocked part is running GSD's own model-backed orchestration/canonical import on this host because no provider is configured. No workaround credentials were invented and no remote project action was taken.
