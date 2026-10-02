# S04 — Consent and authoritative primary outcome

**Status:** pending
**Depends on:** S01, S02
**Requirements:** R006, R007, R010, R013
**Demo:** A consented assigned browser records one exposure, links a canonical Yandex client ID only as an HMAC, submits an existing site form, and receives `202` with atomic lead attribution; revocation immediately stops Metrica and invalid/missing experiment data still preserves the lead.

## Must-haves

- Signed server consent mirror and client tombstone make eligibility explicit; revocation is tombstone-first.
- Exposure and identity link require valid consent, origin, subject and assignment token, with idempotency/rate limits.
- Raw Yandex `clientID`, subject/lead/account IDs and PII never enter logs, derived stores or Metrica params.
- Lead persistence and valid attribution are one transaction; invalid attribution degrades to diagnostic, never lead rejection.
- Existing form page naming, email routing, queue latency and consent proof remain unchanged.

## Proof and risk

**Proof level:** real local browser, event/leads SQLite and form endpoints; Metrica is captured by a deterministic spy adapter.

**Q3 threat surface:** CSRF/cross-origin posts, stale consent, forged/replayed token, subject mismatch, raw ID leakage, enumeration/rate abuse, duplicate submit and attribution causing business-data rollback.

**Q4 requirement impact:** fixes the primary unit/outcome semantics used by S06. Changes to subject, assignment token, conversion window or binary collapse require a revisioned contract.

**Observability:** aggregate consent state/reason, exposure/link/attribution acceptance and rejection codes, queue latency and redaction assertions without identifiers.

## T04.1 — Tombstone-first consent mirror and eligibility

**estimated_steps:** 7
**estimated_files:** 10
**skills_used:** `superpowers:test-driven-development`

**Description:** Synchronize the current cookie-consent UI with a signed server grant and make next-navigation enrollment fail closed under races or version drift.

**Expected Output:**

- Create `lib/experiments/origin-guard.cjs`
- Create `lib/experiments/consent.cjs`
- Create `src/experiments/consent-client.ts`
- Modify `lib/experiments/router.cjs`
- Modify `src/cookie-consent.ts`
- Modify `src/analytics-consent.ts`
- Modify `src/main.js`
- Create `scripts/check-experiments-consent.mjs`
- Modify `.env.example`
- Modify `package.json`

**Inputs:** [`src/cookie-consent.ts`, `src/analytics-consent.ts`, `src/main.js`, `lib/experiments/router.cjs`, `lib/experiments/tokens.cjs`]

**Q5 failure modes:** grant/revoke network failure, stale mirror, policy-version mismatch, forged cookie, two tabs racing, clock skew, cross-origin request and revocation during active page.
**Q6 load profile:** rare consent mutation; document eligibility performs bounded signature/version checks only.
**Q7 negative tests:** unset/denied/stale/failed grant/failed revoke/tombstone states and next-navigation outcomes.

**Steps:**

1. Add the failing consent state matrix.
2. Validate `Origin`/`Sec-Fetch-Site`, policy version and allowed state on the endpoint.
3. Sign a short server grant without PII and bind it to current policy version.
4. Write `analytics_opt_out=1` before revocation I/O and stop Metrica immediately.
5. Clear the tombstone only after a successful grant response.
6. Evaluate changed eligibility only on the next document request; never switch control to variant mid-page.
7. Assert logs/cookies expose no secret or raw subject.

**Verify:** `npm run check:experiments:consent`
**Done when:** every race/version state has deterministic fail-closed behavior and the current consent UI remains responsive.

## T04.2 — Idempotent exposure and privacy-safe Yandex link

**estimated_steps:** 7
**estimated_files:** 9
**skills_used:** `superpowers:test-driven-development`

**Description:** Record the rendered registered slot and connect the Yandex visitor identity using immediate keyed hashing, while sending only declared non-PII experiment params/goals.

**Expected Output:**

- Create `src/experiments/analytics.ts`
- Create `src/experiments/behavior-events.ts`
- Modify `src/experiments/index-page-overlay.ts`
- Modify `lib/experiments/router.cjs`
- Modify `lib/experiments/event-store.cjs`
- Create `lib/experiments/identity.cjs`
- Create `scripts/check-experiments-analytics.mjs`
- Modify `src/analytics-consent.ts`
- Modify `package.json`

**Inputs:** [`lib/experiments/consent.cjs`, `src/experiments/consent-client.ts`, `lib/experiments/event-store.cjs`, `src/analytics-consent.ts`, `src/experiments/index-page-overlay.ts`]

**Q5 failure modes:** duplicate beacon, exposure before slot commit, wrong subject/revision, invalid decimal clientID, raw ID logged before hashing, missing Metrica, revoked consent and retry storm.
**Q6 load profile:** at most one exposure/link per subject/revision/variant; endpoint indexes and rate limits must bound duplicates.
**Q7 negative tests:** preview/control/no-consent paths produce neither endpoint nor `ym` call; malformed/cross-origin/replayed inputs leave no row.

**Steps:**

1. Add failing endpoint, browser-spy, idempotency and redaction tests.
2. Require valid assignment token, server grant, subject match and origin guard.
3. Emit exposure only after the registered React slot commits.
4. Accept only canonical unsigned decimal clientID and immediately HMAC `<counter_id>:<clientID>` with stored key ID.
5. Store only the hash/key ID and emit only declared experiment params/secondary goals.
6. Bound retries/rate and make both writes idempotent.
7. Search captured logs/databases/network params for raw test identifiers.

**Verify:** `npm run check:experiments:analytics`
**Done when:** consented evidence is idempotent and all non-consented/control/preview and malformed paths are silent.

## T04.3 — Transactional lead attribution without business regression

**estimated_steps:** 8
**estimated_files:** 9
**skills_used:** `superpowers:test-driven-development`

**Description:** Attach signed assignment tokens to existing form submissions and persist verified attribution with the accepted lead without changing business routing or failure semantics.

**Expected Output:**

- Modify `lib/db.cjs`
- Create `lib/experiments/lead-attribution.cjs`
- Modify `server.cjs`
- Modify `src/contact-forms.js`
- Modify `src/experiments/analytics.ts`
- Create `scripts/check-experiments-leads.mjs`
- Modify `scripts/check-submit-queue-fast.mjs`
- Modify `scripts/check-personal-data.mjs`
- Modify `package.json`

**Inputs:** [`lib/db.cjs`, `server.cjs`, `src/contact-forms.js`, `lib/experiments/tokens.cjs`, `lib/experiments/consent.cjs`, `lib/experiments/event-store.cjs`, `scripts/check-submit-queue-fast.mjs`]

**Q5 failure modes:** invalid/expired/duplicate token, event-store unavailable, transaction rollback, repeated lead, missing assignment, metadata bloat and post-202 Metrica failure.
**Q6 load profile:** token count is capped; verification is bounded; queue latency regression threshold remains the existing check's contract.
**Q7 negative tests:** every invalid experiment case still persists the valid lead and routes the email exactly as before.

**Steps:**

1. Add failing migration/transaction/token/fallback tests.
2. Add attribution table with lead FK cascade and unique `(lead_id, experiment_key, revision)`.
3. Verify tokens before the transaction and pass only normalized trusted rows.
4. Extend lead+consent insert to write valid attribution atomically.
5. Attach only bootstrap assignment tokens to every existing form path.
6. On invalid/missing experiment input, emit aggregate diagnostic and continue normal lead acceptance.
7. Send `lead_submitted` to Metrica only after `202`; local attribution remains authoritative.
8. Prove email routing, consent proof, deletion cascade and queue latency regressions.

**Verify:** `npm run check:experiments:leads`
**Done when:** valid attribution is atomic, invalid experiment state never harms a lead and existing form behavior is unchanged.

## Integration closure

- Run consent, analytics, leads, submit-queue and personal-data checks plus typecheck/build.
- Browser-demo grant → assignment → exposure/link → accepted lead and revoke/failure variants.
- Capture logs, stores and network fixtures and prove raw test IDs/PII are absent.
- Record exact results before S05.
