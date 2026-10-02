# S03 — Russian operator loop

**Status:** pending
**Depends on:** S02
**Requirements:** R005, R013
**Demo:** A manager uses only Strapi Admin in Russian to create and validate a registered content test, observe design-job status, preview A/B once, launch after Node acknowledgement, stop it and inspect the audit timeline.

## Must-haves

- Extend Strapi Admin; do not create a second CMS/operator frontend.
- UI fields come from code-owned slot/metric registries and cannot enter arbitrary selectors, paths, HTML or URLs.
- Validation/design/launch/stop are explicit guarded actions with Russian errors and audit feedback.
- Preview token is short-lived, one-time and never changes experiment evidence or analytics.
- Existing Strapi catalog/pages administration remains functional.

## Proof and risk

**Proof level:** real local Strapi Admin build plus automated browser contract using the existing Chrome harness and real S02 APIs.

**Q3 threat surface:** admin permission bypass, stored XSS, arbitrary field injection, preview replay/leak, CSRF/state confusion, double-click launch and UI displaying a running state before Node acknowledgement.

**Q4 requirement impact:** provides only the operator surface over S02 lifecycle. It must not create a second state machine or write immutable content types directly.

**Observability:** visible job/lifecycle timestamps, sanitized failure codes, Node acknowledgement and immutable audit timeline; no raw secrets/tokens after preview redirect.

## T03.1 — Registry-driven Russian draft and validation UI

**estimated_steps:** 7
**estimated_files:** 9
**skills_used:** `superpowers:test-driven-development`

**Description:** Register a local Strapi Admin plugin page that edits only allowed definition fields and submits validation through the S02 service API.

**Expected Output:**

- Create `strapi-catalog/src/plugins/experiments/strapi-admin.js`
- Create `strapi-catalog/src/plugins/experiments/admin/src/index.js`
- Create `strapi-catalog/src/plugins/experiments/admin/src/pluginId.js`
- Create `strapi-catalog/src/plugins/experiments/admin/src/pages/App/index.jsx`
- Create `strapi-catalog/src/plugins/experiments/admin/src/components/ExperimentForm.jsx`
- Create `strapi-catalog/src/plugins/experiments/admin/src/components/VariantEditor.jsx`
- Create `strapi-catalog/src/plugins/experiments/admin/src/api/experiments.js`
- Create `scripts/check-experiments-admin-contract.mjs`
- Modify `package.json`

**Inputs:** [`strapi-catalog/src/plugins/experiments/server/src/services/lifecycle.js`, `strapi-catalog/src/plugins/experiments/server/src/controllers/internal.js`, `contracts/experiments/slots.v1.json`, `contracts/experiments/metrics.v1.json`, `strapi-catalog/config/plugins.js`]

**Q5 failure modes:** registry unavailable, stale draft version, unknown slot/metric, pasted HTML/external URL, missing alt, invalid weights/design fields and insufficient admin permission.
**Q6 load profile:** operator-only low volume; registry/list requests may cache but mutations must use current revision/version.
**Q7 negative tests:** attempt every rejected payload through the UI API boundary and assert no draft mutation/audit ambiguity.

**Steps:**

1. Add failing UI/API contract fixtures for Russian labels, permissions and registry-only controls.
2. Register the local plugin route/menu through Strapi's supported extension point.
3. Build list/detail/draft form with slot-kind-specific text/image controls.
4. Make metrics, allocation and guardrails registry-driven.
5. Surface server validation by stable sanitized code plus Russian explanation.
6. Preserve optimistic-concurrency version and reject stale saves.
7. Build Admin and run catalog/pages admin regression checks.

**Verify:** `npm run check:experiments:admin-contract`
**Done when:** the UI can author a valid registered draft and cannot express an unsafe or unknown payload.

## T03.2 — Design status and one-time preview

**estimated_steps:** 7
**estimated_files:** 10
**skills_used:** `superpowers:test-driven-development`

**Description:** Expose asynchronous design state and a one-time A/B preview that uses the real document/render path but writes no assignment, exposure or Metrica evidence.

**Expected Output:**

- Create `strapi-catalog/src/plugins/experiments/admin/src/components/DesignPanel.jsx`
- Create `strapi-catalog/src/plugins/experiments/admin/src/components/PreviewPanel.jsx`
- Modify `strapi-catalog/src/plugins/experiments/admin/src/pages/App/index.jsx`
- Modify `strapi-catalog/src/plugins/experiments/server/src/services/lifecycle.js`
- Create `strapi-catalog/src/plugins/experiments/server/src/services/preview.js`
- Create `lib/experiments/preview.cjs`
- Modify `lib/experiments/router.cjs`
- Create `scripts/check-experiments-preview.mjs`
- Modify `.env.example`
- Modify `package.json`

**Inputs:** [`strapi-catalog/src/plugins/experiments/server/src/content-types/experiment-job/schema.json`, `strapi-catalog/src/plugins/experiments/server/src/services/lifecycle.js`, `lib/experiments/router.cjs`, `src/experiments/index-page-overlay.ts`]

**Q5 failure modes:** expired/replayed JTI, variant/revision substitution, leaked query token, wrong admin permission, preview cookie surviving session and preview emitting analytics/evidence.
**Q6 load profile:** preview is operator-only and short-lived; used-JTI persistence is bounded and retained briefly.
**Q7 negative tests:** replay, expiry, wrong revision/variant/origin and instrumentation spies proving zero assignment/exposure/link/ym calls.

**Steps:**

1. Add failing job-status and preview misuse tests.
2. Show queued/running/failed/completed design state and frozen normalized output.
3. Issue a short-expiry signed preview JTI bound to admin, revision and variant.
4. Consume the JTI once, set a strict short-lived preview cookie and redirect to a clean URL.
5. Render through the production overlay path while bypassing evidence and analytics.
6. Clear preview state on expiry/exit and display sanitized Russian failures.
7. Prove preview A/B and replay/expiry behavior in Chrome.

**Verify:** `npm run check:experiments:preview`
**Done when:** preview is faithful to runtime content but cannot enroll a subject or create analytical evidence.

## T03.3 — Launch, stop and audit browser flow

**estimated_steps:** 6
**estimated_files:** 7
**skills_used:** `superpowers:verification-before-completion`

**Description:** Complete the guarded lifecycle UI and prove the manager workflow end to end.

**Expected Output:**

- Create `strapi-catalog/src/plugins/experiments/admin/src/components/LifecycleActions.jsx`
- Create `strapi-catalog/src/plugins/experiments/admin/src/components/AuditTimeline.jsx`
- Modify `strapi-catalog/src/plugins/experiments/admin/src/pages/App/index.jsx`
- Modify `strapi-catalog/src/plugins/experiments/admin/src/api/experiments.js`
- Create `scripts/check-experiments-admin-ui.mjs`
- Modify `scripts/lib/catalog-chrome-session.mjs`
- Modify `package.json`

**Inputs:** [`strapi-catalog/src/plugins/experiments/admin/src/pages/App/index.jsx`, `strapi-catalog/src/plugins/experiments/admin/src/api/experiments.js`, `strapi-catalog/src/plugins/experiments/admin/src/components/PreviewPanel.jsx`, `strapi-catalog/src/plugins/experiments/server/src/services/lifecycle.js`, `scripts/lib/catalog-chrome-session.mjs`]

**Q5 failure modes:** double action, stale state, launch before design/ack, stop when already stopped, Node acknowledgement timeout and audit fetch failure.
**Q6 load profile:** human action rate; UI polling must be bounded/backed off and stop on terminal state.
**Q7 negative tests:** invalid action buttons absent/disabled and server still rejects forged requests regardless of UI state.

**Steps:**

1. Add failing state/action/timeline component and browser assertions.
2. Render actions strictly from server-provided allowed transitions.
3. Require explicit confirmation showing revision/hash/allocation for launch and stop.
4. Keep `launching` visible until exact Node acknowledgement; never optimistically show `running`.
5. Display append-only audit actor/action/time/hash and sanitized failure codes.
6. Automate draft → design → preview A/B → launch → stop → archive against local services.

**Verify:** `npm run check:experiments:admin-ui`
**Done when:** the complete Russian operator journey works and forged/stale transitions remain rejected server-side.

## Integration closure

- Run Admin contract, preview and Admin UI checks plus `npm run check:experiments:strapi`, Strapi build and relevant catalog/pages admin regressions.
- Demo the full Russian flow and confirm preview leaves zero analytical evidence.
- Record exact commands/results and screenshots only as supplemental evidence.
