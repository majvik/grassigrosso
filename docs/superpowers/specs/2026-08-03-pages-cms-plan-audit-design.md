# Pages CMS plan audit — design

## Problem

The GSD v1.1 plan proposes moving five React marketing pages and the download-catalog copy into Strapi. The planned schemas are substantially smaller than the current page data model, so the promised lossless seed and layout-preserving frontend migration cannot be implemented from the plan as written.

## Evidence / root cause

- `page.section` only stores title/subtitle/body and generic title/text/href items.
- Index also contains solution cards, collection media/features, partner media and structured testimonials.
- Hotels also contains stats, hotel categories, product cards with responsive media, discount rows and refresh-program copy.
- Dealers contains stats, offer/requirement/package structures and stable package values used by the form.
- Contacts renders one map target per office, while the plan provides one page-level iframe string.
- Documents relies on stable document identifiers and request hooks, not only display copy and a file.
- The Phase 1 checks prove JSON/schema registration, but do not prove that guessed translation keys are rendered in Strapi Admin.

Root cause: the plan was written from page-level section names rather than an inventory of render inputs and runtime hooks.

## Corrected approach

1. Freeze a per-page content contract from the current TSX and runtime `data-*` hooks.
2. Model structured, layout-specific repeated data explicitly. Reuse shared components only when their fields and semantics genuinely match.
3. Keep behavior contracts in code: form field names, email routing, modal hooks, slider mechanics and layout variants.
4. Store one map embed per office. Accept editor-provided iframe HTML only at the CMS boundary, normalize it to an allowlisted HTTPS map URL in the feed, and never pass arbitrary HTML to React.
5. Validate schema completeness with representative fixtures before feeds or frontend work.
6. Verify Russian labels in the running Admin UI; translation-file key presence is only a static pre-check.
7. Define page feed/proxy/snapshot behavior before hydration, including slug allowlist, cache TTL, empty-response handling and snapshot provenance.

## Success criteria

- Every current editor-facing string/media/repeated item has exactly one CMS field or an explicit, justified code-owned classification.
- Every runtime identifier/hook has an explicit stability rule.
- Representative content for all six page models validates in Strapi.
- Strapi Admin visibly shows Russian type and field labels.
- The execution plan contains typecheck/build/API/UI/fallback verification and measurable parity checks.
- No Phase 2 application code is executed during this plan-audit task.

## Non-goals

- Implementing the CMS schemas, feeds, proxy, snapshots or React consumption.
- Moving form structure or email routing into CMS.
- Making SEO metadata runtime-editable; HTML head metadata remains deploy-time unless separately designed.
