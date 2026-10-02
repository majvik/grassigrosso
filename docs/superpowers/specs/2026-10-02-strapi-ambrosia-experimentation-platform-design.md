# Strapi + Yandex Metrica Logs API + Ambrosia experimentation platform — design

**Date:** 2026-10-02

**Status:** ready for user review; implementation plan is blocked until this spec is approved

**Target milestone:** first production A/B test of text or image in an existing page slot

**Future direction:** full ecommerce storefront with account, cart, checkout and payments, without replacing the experimentation core

## 1. Agreed product brief

Grassigrosso needs a self-hosted experimentation system that a single responsible content manager can operate from the existing Russian-language Strapi Admin without developer participation for each test.

The first production scope is deliberately narrow:

- A/B only, normally 50/50;
- one meaningful text or image change in an already existing visual slot;
- no arbitrary HTML, CSS selectors, JavaScript or DOM manipulation;
- no adding, removing or reordering sections;
- primary metric: a lead accepted by `POST /api/submit` and persisted by the server (`202` response);
- Yandex Metrica is the only external behavioral analytics system;
- raw behavioral data is obtained through Yandex Metrica Logs API;
- Ambrosia is the statistical engine for design and final analysis;
- no GrowthBook, Varioqub, Bucketeer, Google Analytics or paid Strapi experimentation/release feature.

The same core must later support structural pages, form schemas, catalog policies, account features and commerce outcomes, but those domains are extension contracts in this milestone, not software built prematurely.

## 2. Current-system findings

The design extends existing boundaries rather than introducing a second application:

1. Public pages are Vite multi-page documents with React page layers. Current CMS hydration starts from code-owned fallback content and atomically merges validated Strapi data through `src/pages/use-page-cms.ts`, `src/pages/pages-api.ts` and `src/pages/pages-cms-merge.ts`.
2. CMS data already has strict, schema-derived allowlists. Behavior-bound keys and DOM hooks remain code-owned. Experiments must preserve this rule.
3. The browser reads content through the Node boundary (`GET /api/pages/:slug`), not directly from Strapi. `lib/pages-cms-api.cjs` already supplies validation, memory caching and disk-snapshot fallback.
4. Yandex Metrica is loaded by `src/analytics-consent.ts` only after explicit analytics consent stored by `src/cookie-consent.ts`.
5. `POST /api/submit` persists an accepted lead synchronously in `lib/db.cjs`, then returns `202` before asynchronous email/Telegram delivery. This persistence boundary, not eventual message delivery, is the primary conversion.
6. Strapi currently defaults to SQLite, although `strapi-catalog/config/database.js` already supports PostgreSQL.
7. Production startup currently can replace the runtime Strapi database when the committed seed manifest changes. That model is incompatible with autonomous production editing: an experiment created in Admin could be overwritten by a later deployment.
8. Nginx currently serves production HTML as static files before Node. A reliable no-flicker experiment therefore requires a narrow change to document delivery; an asynchronous DOM replacement after first paint would contaminate variant B with a visible control experience.

## 3. Approaches considered

### A. Own runtime kernel + Strapi control plane + Ambrosia offline adapter — selected

Node performs eligibility and deterministic assignment, Strapi manages experiment definitions and immutable revisions, Yandex collects consented behavioral events, and a separate Python job prepares unit-level datasets for Ambrosia.

This preserves statistical correctness, fits the existing stack and keeps each dependency replaceable.

### B. Use Ambrosia `Splitter` in the request path — rejected

Ambrosia currently documents `Splitter` as a batch splitter over a finite pandas/Spark dataset. It is not an online allocation service for previously unseen visitors. Loading Python and dataframes into page delivery would also couple site availability to an analysis library.

### C. Strapi variants plus client-side randomization — rejected

This is initially smaller, but the variant arrives after first paint, can flicker, is easier to manipulate, makes assignment/exposure loss harder to distinguish and is unsuitable for future checkout or payment behavior.

## 4. Selected architecture

```text
                         CONTROL PLANE
                Strapi Admin (Russian, self-hosted)
                             │
                    draft experiment
                             │ validate + launch
                             ▼
                   immutable revision snapshot
                             │
                 cached/snapshotted runtime feed
                             ▼
RUNTIME       Node Experiment Kernel ──────── kill switch
              │ eligibility
              │ deterministic assignment
              │ signed assignment token
              ▼
       HTML bootstrap injection
              │
              ▼
       React CMS merge + typed slot overlay
              │
              ├── local assignment/exposure journal
              ├── signed token on POST /api/submit
              └── Yandex params/goals after analytics consent

ANALYSIS      Logs API extractor + local journal
              │ rolling reconciliation and unit aggregation
              ▼
       one row per randomization unit
              │
              ├── Ambrosia Designer before launch
              ├── SRM and data-quality gates
              └── Ambrosia Tester after fixed horizon
                             │
                             ▼
                    immutable result record
```

Ambrosia is never imported by Vite, Node or Strapi runtime. It runs in a pinned Python environment as an on-demand/scheduled analysis job.

## 5. Stable domain contracts

The platform owns four interfaces. Future features integrate through these interfaces rather than changing the statistical core.

### 5.1 `ExperimentDefinition`

Editable planning data in Strapi:

- `key`: immutable human-readable identifier;
- `name` and hypothesis;
- audience and page scope;
- registered `slot_key`;
- primary, secondary and guardrail metric keys;
- alpha, beta, MDE, alternative and intended allocation;
- conversion window;
- planned sample size per group;
- owner and audit metadata.

The definition is not served directly to visitors.

### 5.2 `ExperimentRevision`

An immutable launch artifact containing:

- `experiment_key`;
- monotonically increasing `revision` and `allocation_version`;
- salt and assignment algorithm version;
- exact variant weights in basis points;
- frozen A and B payloads, including the control value resolved at launch;
- frozen media URLs and alt text;
- complete statistical plan;
- `definition_hash` (SHA-256 of canonical JSON);
- launch timestamp and operator.

Control is snapshotted rather than read live. Editing ordinary page content during a running test therefore cannot silently change only group A.

### 5.3 `Assignment`

```ts
type Assignment = {
  experimentKey: string
  revision: number
  variant: 'A' | 'B'
  subjectKind: 'anonymous_visitor'
  subjectHash: string
  assignedAt: string
  definitionHash: string
  token: string
}
```

`token` is an HMAC-signed, expiry-bounded representation used by exposure and conversion endpoints. It contains no name, phone, email, IP or raw Yandex identifier.

### 5.4 `MetricObservation`

Every metric adapter produces observations keyed by experiment revision and randomization unit. Current adapters produce `lead_submitted`, `cta_clicked`, `form_started` and `catalog_opened`. Future commerce adapters may produce `add_to_cart`, `checkout_started`, `order_created`, `payment_succeeded`, `revenue`, `refund` and `repeat_purchase` without modifying assignment.

## 6. Strapi control plane

### 6.1 Content model

Use Community-edition content types and a local Strapi admin extension. Do not depend on Releases, Review Workflows or other paid features.

- `experiment`: editable definition and current public state;
- `experiment-revision`: immutable launch snapshots;
- `experiment-result`: immutable analysis output and decision;
- `experiment-audit-event`: append-only actor/action/time/detail history;
- repeatable variant components restricted to A and B for v1.

The content manager edits the experiment through Strapi. A small Admin extension adds Russian actions for preview, validate, launch, emergency stop and archive. It is an extension of the existing Admin build, not a second frontend application.

### 6.2 State machine

Public states:

```text
draft → ready → running → enrollment_closed → analyzing → completed → archived
                  └──────── emergency stop ────────→ stopped → archived
```

Preview is a mode, not a state. It never creates assignments, exposures or Metrica events.

Rules:

- one responsible Strapi user may launch after validation and preview;
- `running` revisions are immutable at both controller and document-service/lifecycle boundaries;
- changing content, weights, metric plan or audience requires a new revision;
- a stopped revision cannot be resumed; restart means a new revision;
- emergency stop immediately serves control and closes enrollment;
- v1 permits one running confirmatory experiment per page; the data model retains an `exclusion_scope` field for future safe concurrency;
- launch is refused when control/variant payloads fail the slot schema, when A and B are not exactly 5,000 basis points each, or when the Ambrosia design fields are incomplete. Unequal allocation is a future protocol change, not a v1 setting.

### 6.3 Runtime source of truth

Production Strapi becomes operational source of truth. Seed application is bootstrap-only for an empty database; it must not overwrite a non-empty runtime database automatically. Before this switch, take and verify a backup of the current production database.

SQLite is acceptable for the first low-write experimentation milestone on a persistent single-instance volume. PostgreSQL is required before multi-instance Strapi or the commerce milestone, but the commerce database remains separate from Strapi in all cases.

## 7. Slot and variant model

The source of truth for testable locations is a versioned code-owned registry shared by validation and frontend application. Each entry declares:

- stable key such as `index.hero.title`;
- page slug;
- JSON path in the canonical page model;
- type: `text` or `image`;
- validation constraints;
- React consumer identifier;
- whether the slot is currently enabled for experiments.

The first milestone enables only the slots needed by the first real test. Expanding the registry is a normal reviewed code change. Strapi cannot invent selectors or paths.

Variant payloads use a tagged envelope:

```json
{
  "kind": "content_patch_v1",
  "slotKey": "index.hero.title",
  "value": { "text": "..." }
}
```

Image values contain only a same-origin Strapi upload URL and alt text. Raw HTML, URLs outside the configured media origin, scriptable SVG, styling, event handlers and layout properties are rejected.

The overlay order is fixed:

```text
code fallback → validated ordinary CMS content → immutable experiment overlay
```

The experiment overlay is reapplied after any later CMS hydrate so normal content fetching cannot erase the assigned variant.

## 8. Runtime assignment and first paint

### 8.1 Eligibility and identity

- The existing analytics choice is mirrored into a minimal server-readable first-party consent cookie when the user changes it.
- A visitor becomes experiment-eligible only on a document request where analytics consent was already granted. Granting consent on the current page takes effect on the next navigation/reload, avoiding a mid-page control-to-variant switch.
- Only an eligible visitor receives a random opaque first-party experiment subject cookie.
- Unset or denied analytics consent always receives control and is excluded from assignment and analysis.
- The consent/identifier design and retention wording require a legal/privacy review before production activation.

### 8.2 Assignment algorithm

For an eligible visitor, Node computes:

```text
message = UTF8("v1\n" + experiment_key + "\n" + revision + "\n" +
               allocation_version + "\n" + subject_id)
digest  = HMAC-SHA256(EXPERIMENT_ASSIGNMENT_SECRET, message)
bucket  = unsigned_big_endian_uint64(digest[0..7]) mod 10000
```

`experiment_key` is restricted to lowercase ASCII letters, digits and hyphens; `subject_id` is a canonical UUID. This removes delimiter and normalization ambiguity between implementations.

The bucket is mapped to the frozen basis-point ranges. The same inputs always return the same variant. Changing weights requires a new `allocation_version` and revision; an existing visitor is never silently reassigned inside a revision.

Golden test vectors lock the algorithm so refactors cannot change historical allocation.

### 8.3 No-flicker document path

Nginx continues serving versioned assets and uploads directly, but extensionless HTML/document routes are proxied to Node. Node reads the built HTML, resolves the active cached revision, performs assignment and injects a small escaped JSON bootstrap before the module entrypoint.

React reads the bootstrap synchronously before its first render and applies the experiment overlay to the fallback content. This avoids showing A before B. HTML remains `Cache-Control: no-cache`; assets retain current long-lived caching.

If the experiment store or revision is unavailable/invalid before response generation, Node serves control without an assignment. It never chooses a random fallback variant.

### 8.4 Assignment and exposure semantics

- The server journals the assignment at document delivery; this is the intent-to-treat cohort used for the primary analysis.
- The browser sends an idempotent exposure beacon after the registered React slot commits. Exposure is a delivery-quality diagnostic, not a post-randomization filter for the primary result.
- The signed token accompanies `POST /api/submit`. A valid token creates a `lead_experiment_attribution` row in the existing leads database in the same transaction as lead persistence. The analysis adapter turns that row into the authoritative `lead_submitted` observation.
- Missing, expired or invalid experiment metadata never blocks a real lead; the lead is accepted without experimental attribution and a security/quality event is logged.

## 9. Yandex Metrica integration

Metrica remains consent-gated. After its existing `init`, the analytics adapter sends compact visit parameters containing only:

- experiment key;
- revision;
- variant;
- definition hash prefix.

It also sends goals for secondary behavioral actions and a client confirmation of `lead_submitted` after the server returns `202`. The local lead observation remains authoritative for the primary metric because browser analytics can be blocked or fail to load.

No PII, raw experiment subject ID, lead ID, email, phone or account ID is sent to Metrica.

After Metrica initializes, the browser obtains its `clientID` and sends it with the signed assignment token to a same-origin linking endpoint. Node immediately transforms it with a separate HMAC analytics-link secret and stores only the resulting hash next to the local subject hash. The Logs pipeline applies the same HMAC to `ym:pv:clientID` / `ym:s:clientID` before joining and does not retain the raw identifier. This bridge lets secondary Metrica behavior and the authoritative local lead outcome become one visitor-level row without disclosing the local experiment identifier to Yandex.

The Logs API extractor:

- requests only required hit/visit fields;
- downloads the previous day, never assumes current-day completeness;
- reimports a rolling three-day window because Yandex reports that most visits settle within three days;
- upserts by stable Yandex hit/visit identifiers;
- deletes prepared log files from the API after successful verified download to stay within the 10 GB quota;
- stores raw extracts and derived parquet files outside git;
- exposes last successful sync and reconciliation window in local health output.

## 10. Ambrosia analysis contract

Pin `ambrosia==0.5.3.post1` in an isolated Python package/container. Its public classes are wrapped by our own adapter, so application schemas never depend on Ambrosia dataframe column names. An upgrade requires the synthetic statistical fixture suite to pass before the pin changes.

### 10.1 Before launch: `Designer`

The first release includes a measurement-only calibration period before the first real A/B test. If usable historical visitor-to-lead data is unavailable, collect at least two complete business cycles with control-only instrumentation.

For each proposed test, the analysis job uses historical unit-level data to calculate sample size or achievable MDE with:

- primary metric: binary `lead_submitted`;
- alpha: `0.05`;
- power: `0.80` (`beta = 0.20`);
- alternative: two-sided;
- equal group sizes for v1;
- minimum conversion window: seven days after first assignment.

The calculated per-group sample size is copied into the immutable revision. A test cannot launch without this design result. If expected duration is operationally unreasonable, the decision is to change the hypothesis/MDE or not run the test—not to substitute CTA clicks as the primary metric silently.

### 10.2 During the test

The system displays operational counts and SRM/data-loss diagnostics only. It does not display a provisional winner or permit significance-based early stopping. Variant content and traffic weights stay frozen.

Enrollment closes after the planned sample size and minimum business-cycle requirement are both met. Final analysis waits for the seven-day conversion window and the three-day Logs API reconciliation window.

### 10.3 Final dataset

Ambrosia receives one row per randomization unit per revision, never raw hits or sessions:

```text
subject_hash
experiment_key
revision
variant
assigned_at
exposed
lead_submitted        0|1
cta_clicked           0|1
form_started          0|1
catalog_opened        0|1
device_category       optional planned segment
traffic_source        optional planned segment
```

Repeated events are collapsed according to the predeclared metric definition. A visitor submitting multiple forms still contributes `lead_submitted = 1`.

### 10.4 Quality gates and `Tester`

Before effect estimation:

- verify revision hash and date window;
- deduplicate by randomization unit;
- reject cross-variant units;
- run Ambrosia SRM with expected ratios A=0.5/B=0.5 and `alpha=0.0005`;
- compare assignment-to-exposure and assignment-to-Metrica-link loss by variant; either absolute A/B loss-rate difference above 2 percentage points invalidates the run;
- require the planned sample and completed observation window.

The primary binary metric is analyzed using the method selected and recorded during design. Secondary metrics are one declared family and use Ambrosia's multiple-testing correction (Holm by platform convention). Results include group sizes, rates, absolute and relative effect, confidence interval, raw/adjusted p-values, MDE comparison and a decision of `winner`, `loser`, `inconclusive` or `invalid`.

An SRM failure, revision mixture, incomplete window or either loss-rate delta above the 2-percentage-point limit makes the run `invalid`; it cannot be promoted as a winner.

### 10.5 A/A gate

Before the first content-changing experiment, run an A/A revision through the complete production pipeline. It must demonstrate stable 50/50 allocation, no SRM, no cross-variant units, symmetric assignment-to-exposure loss and no false content difference. This is a deployment gate, not an optional smoke test.

## 11. Storage boundaries

### Current milestone

- Strapi DB: definitions, immutable revisions, audit trail and summarized results;
- dedicated local experiment SQLite DB: assignments, exposures, Metrica identity-link hashes and analysis-run bookkeeping;
- existing leads SQLite DB: lead and consent records plus `lead_experiment_attributions`, inserted transactionally when a valid token exists;
- filesystem outside git: encrypted/restricted Logs API extracts and parquet analysis marts.

Node accesses assignment/exposure storage through an `ExperimentEventStore` interface. The analysis input adapter reads both stores and emits one canonical observation table. SQLite uses WAL, idempotency keys and unique constraints. This is sufficient for current traffic and one process.

### Future scale

Move the event-store adapter to PostgreSQL when traffic, multi-instance deployment or the account/commerce milestone requires it. Ambrosia can continue consuming pandas data; Spark/ClickHouse is an optional later adapter, not a v1 dependency.

Strapi never becomes the database for passwords, sessions, carts, orders, payments or refunds.

## 12. Failure and rollback behavior

| Failure | Required behavior |
|---|---|
| Strapi unavailable | Use validated last-known-good runtime revision snapshot; otherwise control/no enrollment |
| Revision payload invalid | Control/no enrollment; alert; never partial apply |
| Experiment event DB unavailable before document response | Control/no enrollment |
| Exposure beacon fails | Retry idempotently; assignment remains in intent-to-treat cohort; flag loss rate |
| Metrica unavailable after prior consent | Local assignment and business flow continue; missing identity-link/exposure rates are surfaced by the quality gate |
| Consent unset or denied | No Metrica calls, subject cookie or enrollment; control and normal business flow continue |
| Invalid assignment token on form | Accept valid lead, omit attribution, record diagnostic |
| Ambrosia/Logs job fails | Runtime test continues only until planned enrollment cap; no result is declared; job retries from checkpoint |
| Emergency stop | New document requests receive control immediately after runtime cache invalidation; old revision remains auditable |

Global environment kill switch `EXPERIMENTS_ENABLED=0` overrides Strapi and forces control without deleting definitions or results.

## 13. Privacy and security requirements

- no PII in assignment tokens, Metrica parameters, experiment logs or Ambrosia datasets;
- HMAC secrets exist only in environment/secrets storage and support rotation by key ID;
- admin mutation endpoints require Strapi admin authentication and explicit plugin permissions;
- preview tokens are signed, short-lived and excluded from analytics;
- all event endpoints are same-origin, rate-limited and idempotent;
- experiment content is rendered through typed React props; no `dangerouslySetInnerHTML` path;
- local raw logs and subject-level marts are access-restricted and receive an explicit retention policy;
- cookie/privacy documents and consent behavior must be reviewed before production activation;
- deletion tooling must remove `lead_experiment_attributions` and identifiable subject observations associated with a lead when legally required without corrupting aggregate result records.

## 14. Future ecommerce compatibility

The future store integrates without changing the first milestone's assignment model:

1. Anonymous marketing experiments retain `anonymous_visitor` as their unit for their entire revision, even if the visitor logs in later. A user is never reassigned mid-test.
2. Account-only experiments declare `account` as a different randomization unit and enroll only authenticated users.
3. A separate identity-link service may map anonymous visitors to accounts for attribution, but raw account identifiers do not enter Metrica or Ambrosia marts.
4. Cart, checkout and payment decisions are resolved server-side. Client-provided variant values are never trusted for price, discount, availability or payment logic.
5. The canonical source for `payment_succeeded`, revenue and refunds is the commerce database/payment webhook ledger, not Metrica.
6. New payload adapters are introduced explicitly:
   - `section_graph_v1` for add/remove/reorder section tests;
   - `form_schema_v1` for form/field tests;
   - `catalog_policy_v1` for ranking, filters and product options;
   - `feature_config_v1` for account/checkout functionality.
7. Each adapter receives its own schema, server-side validator, preview, rollback and automated test suite. `content_patch_v1` is not stretched into an untyped universal JSON mechanism.

## 15. Observability and operator experience

The Strapi experiment screen shows:

- validation/preview readiness;
- current immutable revision/hash;
- running or stopped status;
- assigned A/B counts and SRM warning;
- assignment-to-exposure loss;
- planned versus reached sample size;
- enrollment/window status;
- last Logs API sync;
- final result only after a valid analysis run;
- audit history and emergency stop.

It must not show a live provisional winner. Operational health may update frequently; statistical conclusions remain hidden until the fixed-horizon analysis.

Node health diagnostics expose only aggregate counts/config age and never subject identifiers.

## 16. Verification strategy

Implementation is test-first and locally verified. Required automated coverage includes:

### Contracts and allocation

- schema allowlist accepts registered text/image slots and rejects unknown paths/types;
- canonical revision hashing is deterministic;
- golden HMAC allocation vectors and boundary buckets;
- 50/50 weights total exactly 10,000;
- same subject/revision is sticky;
- a new revision cannot alter an old assignment;
- allocation input encoding and first-eight-byte interpretation match golden vectors across supported runtimes;
- preview/control/non-consented paths create no enrollment.

### Strapi lifecycle

- valid draft → ready → running transition;
- launch snapshots both control and variant;
- running revision mutation is rejected through every write path;
- duplicate active page experiment is rejected;
- stop is terminal and audited;
- Russian labels/actions load in the Admin build.

### Rendering

- A and B first paint contain their assigned content without control-to-B flicker;
- later ordinary CMS hydrate preserves the experiment overlay;
- media URL/alt validation;
- critical DOM hooks and baseline consumer-zone allowlist remain unchanged;
- Strapi/runtime outage falls back to control or last-known-good revision as specified.

### Events and lead conversion

- assignment/exposure idempotency;
- valid token inserts `lead_experiment_attribution` in the same transaction as the `202` lead and exports `lead_submitted=1`;
- invalid/missing token never rejects an otherwise valid lead;
- repeated lead submissions collapse to one binary unit metric;
- raw Yandex `clientID` is never persisted and hashed identity linking is reproducible;
- consent states prevent disallowed Metrica/enrollment behavior.

### Logs and Ambrosia

- extractor prepare/poll/download/verify/delete flow against a fake HTTP service;
- three-day reconciliation is restart-safe and idempotent;
- unit aggregation cannot place one subject in both variants;
- synthetic null, known-effect, SRM, incomplete-window and multiple-metric fixtures;
- pinned Ambrosia adapter output is normalized into the internal result schema;
- full A/A acceptance gate.

### Project gates

- `npm run typecheck`;
- relevant experiment contract/integration/browser checks added to `package.json`;
- existing `npm run check`;
- `npm run build`;
- existing pages CMS, catalog API/UI and submit-queue checks affected by the integration;
- no push, remote deployment or Timeweb mutation without a separate explicit request.

## 17. Delivery slices

The implementation plan will decompose the milestone into independently verifiable slices:

1. Operational preflight: runtime Strapi source-of-truth/backup policy and baseline measurement readiness.
2. Shared experiment schemas, slot registry, revision hash and deterministic kernel.
3. Strapi experiment models, Russian Admin workflow, preview and immutable launch/stop lifecycle.
4. Dynamic HTML bootstrap, no-flicker React overlay and local assignment/exposure store.
5. Transactional lead attribution and consent-gated Yandex instrumentation.
6. Logs API extraction, unit mart and pinned Ambrosia Designer/Tester adapter.
7. End-to-end A/A validation, failure drills, operator documentation and first-test launch gate.

Each slice must leave the existing site functional and has its own automated test gate. No real A/B content test launches until slices 1–7 pass locally and the A/A production-readiness procedure is approved.

## 18. Acceptance criteria for the first milestone

The platform is ready for its first content-changing test only when:

1. An authorized content manager can create A/B text or image variants, preview both and launch/stop them in Russian Strapi Admin.
2. A running revision cannot change in place and is reproducible from its hash and audit record.
3. Eligible returning visitors receive a stable assignment before first React render; non-consented visitors remain control and untracked. Statistical conclusions explicitly apply to the analytics-consented population rather than all visitors.
4. A successful server-side lead is attributed from a signed assignment without weakening form acceptance or consent handling.
5. Yandex receives only consented, non-PII experiment parameters and the Logs API pipeline reconciles delayed data.
6. Ambrosia designs the sample size, detects SRM/data-quality failures and produces the fixed-horizon result from one row per visitor.
7. The A/A gate passes and kill-switch/outage scenarios fall back safely.
8. Existing CMS, catalog, forms, privacy behavior and performance checks remain green.
9. No commerce/account/payment component has been built, while their future outcome and randomization-unit adapters are explicitly supported by the stable contracts above.

## 19. Primary references

- Ambrosia repository and Apache-2.0 license: <https://github.com/MTSWebServices/Ambrosia>
- Ambrosia documentation (`Designer`, batch `Splitter`, `Tester`, preprocessing): <https://ambrosia.readthedocs.io/en/latest/>
- Ambrosia fixed-horizon design tutorial: <https://ambrosia.readthedocs.io/en/latest/pandas_examples/03_pandas_designer.html>
- Ambrosia batch-splitting limitation: <https://ambrosia.readthedocs.io/en/latest/pandas_examples/05_pandas_splitter.html>
- Yandex Metrica A/B visit-parameter example: <https://yandex.ru/support/metrica/ru/data/visit-params-example>
- Yandex Metrica Logs API limits and delayed visit completion: <https://yandex.ru/dev/metrika/ru/logs/>
- Logs API hit fields, including client, goal, ecommerce and parsed parameters: <https://yandex.ru/dev/metrika/ru/logs/fields/hits>
- Logs API visit fields: <https://yandex.ru/dev/metrika/ru/logs/fields/visits>
- Yandex Metrica offline data import for future server-side commerce attribution: <https://yandex.ru/support/metrica/ru/data/offline-params>
