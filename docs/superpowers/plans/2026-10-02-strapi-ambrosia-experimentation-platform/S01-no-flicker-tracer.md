# S01 — No-flicker vertical tracer

**Status:** pending
**Depends on:** none
**Requirements:** R002, R003, R010, R013
**Demo:** With a local signed fixture feed, a consented browser receives a stable A/B assignment and sees the registered hero text/poster on the initial rendered frame; invalid/unavailable state yields the untouched control page.

## Must-haves

- Closed, versioned contracts enable exactly `index.hero.title` and `index.hero.poster`.
- Assignment, subject cookie and assignment token are deterministic, signed and non-sliding.
- Node injects an escaped bootstrap before the React entrypoint; React applies only typed registered props.
- No client fetch is required to decide the initial variant.
- Missing consent, invalid feed/token, event-store failure and kill switch all render control/no-enrollment.

## Proof and risk

**Proof level:** real local document/React entrypoints with fixture control-plane input, real SQLite event store and automated Chrome/CDP capture. Strapi UI and Yandex are not yet required.

**Q3 threat surface:** untrusted feed fields, forged cookies/tokens, XSS through bootstrap serialization, path/selector escape, external media, cross-revision replay and diagnostics leaking identifiers.

**Q4 requirement impact:** establishes the stable online contract reused by every later slice. A breaking assignment or bootstrap change requires explicit contract versioning and golden-vector migration.

**Observability:** aggregate counters for eligibility reason, assigned/control outcome, feed age, bootstrap validation failure and event-store health; no subject/token/secret values.

## T01.1 — Closed contracts and deterministic kernel

**estimated_steps:** 7
**estimated_files:** 10
**skills_used:** `superpowers:test-driven-development`

**Description:** Define the code-owned registries and implement cross-runtime canonical revision hashing, allocation, key rings, tokens and cookies from golden fixtures.

**Expected Output:**

- Create `contracts/experiments/slots.v1.json`
- Create `contracts/experiments/metrics.v1.json`
- Create `contracts/experiments/content-patch-v1.schema.json`
- Create `contracts/experiments/revision-v1.schema.json`
- Create `lib/experiments/contracts.cjs`
- Create `lib/experiments/assignment.cjs`
- Create `lib/experiments/tokens.cjs`
- Create `lib/experiments/cookies.cjs`
- Create `test/fixtures/experiments/revision-golden.json`
- Create `scripts/check-experiments-kernel.mjs`

**Inputs:** [`src/components/pages/IndexPage.tsx`, `src/react-entry.tsx`, `docs/superpowers/specs/2026-10-02-strapi-ambrosia-experimentation-platform-design.md`]

**Q5 failure modes:** noncanonical UUID, weight sum other than 10,000, unknown slot, HTML/script content, SVG/external URL, malformed key ring, wrong key ID, expired or cross-revision token.
**Q6 load profile:** allocation and validation execute on every eligible document request; operations must be bounded CPU/memory and contain no I/O.
**Q7 negative tests:** every Q5 case plus bucket boundaries, extra schema properties and sliding-expiry attempts.

**Steps:**

1. Add failing schema, golden-hash, allocation and token tests.
2. Register only the two v1 hero slots and reject reserved future payload kinds.
3. Implement RFC 8785/JCS canonical bytes and SHA-256 revision hash.
4. Implement assignment input `v1\n<key>\n<revision>\n<allocation_version>\n<uuid>` and unsigned big-endian bucket modulo 10,000.
5. Implement key-ring parsing, constant-time signature verification, opaque subject cookie and fixed-expiry token.
6. Add aggregate-safe error codes and prove test logs contain no secrets/identifiers.
7. Register the verification package script without changing runtime behavior.

**Verify:** `npm run check:experiments:kernel`
**Done when:** golden vectors are stable, invalid payloads/tokens fail closed and the enabled slot set is exactly two.

## T01.2 — Event store, document bootstrap and typed React overlay

**estimated_steps:** 8
**estimated_files:** 11
**skills_used:** `superpowers:test-driven-development`

**Description:** Connect a fixture runtime feed to real Node document rendering and React slot consumption without introducing an asynchronous first-render decision.

**Expected Output:**

- Create `lib/experiments/event-store.cjs`
- Create `lib/experiments/runtime-feed.cjs`
- Create `lib/experiments/bootstrap.cjs`
- Create `lib/experiments/router.cjs`
- Create `src/experiments/bootstrap.ts`
- Create `src/experiments/slots.ts`
- Create `src/experiments/index-page-overlay.ts`
- Modify `server.cjs`
- Modify `src/react-entry.tsx`
- Modify `src/components/pages/IndexPage.tsx`
- Modify `package.json`

**Inputs:** [`contracts/experiments/slots.v1.json`, `contracts/experiments/revision-v1.schema.json`, `lib/experiments/assignment.cjs`, `lib/experiments/tokens.cjs`, `server.cjs`, `src/react-entry.tsx`, `src/components/pages/IndexPage.tsx`]

**Q5 failure modes:** SQLite lock/unavailable, stale/malformed feed, missing consent mirror, escaped `</script>` payload, duplicate assignment, restart, unknown page/slot and React hydration mismatch.
**Q6 load profile:** one bounded SQLite assignment transaction on first eligibility; repeat documents reuse sticky evidence; no synchronous Strapi/Yandex/worker calls.
**Q7 negative tests:** force each dependency/validation failure and assert untouched control DOM plus no assignment cookie/evidence.

**Steps:**

1. Add failing event-store idempotency and document serialization fixtures.
2. Create WAL/busy-timeout event tables with uniqueness for assignment and diagnostics.
3. Load a validated local fixture feed behind the same interface as the future signed feed.
4. Evaluate kill switch, consent fixture, feed validity and sticky assignment in Node.
5. Serialize only validated typed payload and public assignment metadata into an escaped bootstrap before the React entry script.
6. Read bootstrap synchronously in `react-entry.tsx` and overlay only the existing hero title/poster props.
7. Preserve CMS priority `code fallback → validated CMS → immutable experiment overlay` and existing DOM hooks.
8. Add aggregate diagnostics and failure-to-control assertions.

**Verify:** `npm run check:experiments:runtime`
**Done when:** repeated/restarted requests are sticky, first React render uses the assigned props, and all failure paths render control.

## T01.3 — Automated first-paint and compatibility proof

**estimated_steps:** 6
**estimated_files:** 6
**skills_used:** `superpowers:verification-before-completion`

**Description:** Prove the tracer in the repository's existing local Chrome harness and pin the no-extra-consumer CMS rule.

**Expected Output:**

- Create `scripts/check-experiments-first-paint.mjs`
- Create `scripts/check-experiments-contracts.mjs`
- Modify `scripts/lib/catalog-chrome-session.mjs`
- Modify `scripts/check-pages-cms-hydrate-dom.mjs`
- Modify `package.json`
- Modify `docs/superpowers/plans/2026-10-02-strapi-ambrosia-experimentation-platform/S01-no-flicker-tracer.md`

**Inputs:** [`lib/experiments/event-store.cjs`, `lib/experiments/runtime-feed.cjs`, `lib/experiments/bootstrap.cjs`, `src/experiments/index-page-overlay.ts`, `scripts/lib/catalog-chrome-session.mjs`, `scripts/check-pages-cms-hydrate-dom.mjs`]

**Q5 failure modes:** control flash before overlay, network fetch before decision, image requested twice, unauthorized new DOM zone, refresh changes variant and browser disabled-JS path breaks baseline.
**Q6 load profile:** fixture run covers cold and warm navigation; capture request count and bootstrap/render timestamps without setting a production SLA yet.
**Q7 negative tests:** control, A, B, invalid feed, no consent, kill switch and event-store failure scenarios.

**Steps:**

1. Extend the reusable Chrome helper only where necessary; do not duplicate a browser framework.
2. Capture the first DOM snapshot before post-load async work and assert assigned content is already present.
3. Assert no runtime assignment/content fetch is required and no duplicate poster request occurs.
4. Extend the DOM allowlist gate so exactly the existing hero slots may change.
5. Run typecheck/CMS/build regressions and record exact results.
6. Demonstrate A, B and fail-to-control fixtures locally.

**Verify:** `npm run check:experiments:first-paint`
**Done when:** the automated first-frame proof is green and existing CMS/DOM contracts remain unchanged outside the two slots.

## Integration closure

- Run `npm run check:experiments:kernel`, `npm run check:experiments:runtime`, `npm run check:experiments:first-paint`, `npm run check:pages-cms-hydrate-dom`, `npm run typecheck` and `npm run build`.
- Record tests, exact commands, duration and commit(s) in the milestone execution log.
- Demo the real local index document in A, B, no-consent, invalid-feed and event-store-failure modes.
- Do not proceed to S02 unless the no-flicker and fail-to-control evidence is automated.
