---
id: M001
title: "Migration"
status: complete
completed_at: 2026-10-02T16:36:51.453Z
key_decisions:
  - Keep GSD out of application dependencies and install the CLI globally.
  - Use exact current open-gsd/gsd-pi GitHub HEAD rather than the lagging npm build.
  - Move operational CMS contracts to src/contracts/pages-cms instead of importing archived planning state.
  - Commit source-side and shareable GSD artifacts before recording the final validation receipt.
  - Preserve intentional Markdown hard-break bytes under .gsd with a path-scoped Git whitespace rule.
  - Keep auto-push, PR creation, remote actions, and automatic verification fixes disabled.
key_files:
  - .gsd/PROJECT.md
  - .gsd/PREFERENCES.md
  - .gsd/migration/MIGRATION.md
  - .gitattributes
  - src/contracts/pages-cms/wave-1.json
  - src/contracts/pages-cms/legal.json
  - src/contracts/pages-cms/global-chrome.json
lessons_learned:
  - Legacy planning documents can contain runtime inputs; migration must run build/typecheck before retiring the legacy tree.
  - Source-side and Git attribute changes must be committed before milestone validation because GSD pins the exact verification source revision.
  - The npm package version can match GitHub while its gitHead still lags current main, so provenance must include an exact commit hash.
---

# M001: Migration

**Migrated the completed Pages CMS milestone from legacy .planning state into the DB-backed GSD-pi project format.**

## What Happened

The official migration imported seven completed slices and seven completed tasks, preserved the complete legacy evidence archive and backup, and validated all 28 historical requirements. Operational Pages CMS contracts were moved out of the retired .planning tree. Source repairs and shareable GSD state were committed before this final receipt, so runtime verification and source-bound closeout are current.

## Success Criteria Results

- 7/7 slices and 7/7 tasks imported complete.
- 28/28 requirements validated.
- Canonical validation receipt passed on the final committed source revision.
- Typecheck, routes, CMS contract, legal feeds, global chrome, and production build gates passed.
- git diff --check passes with a scoped .gsd Markdown whitespace rule that preserves archived bytes.

## Definition of Done Results

The project uses DB-backed .gsd state, shareable projections and safe local preferences; legacy evidence remains archived; runtime-only GSD files are ignored; no remote action occurred.

## Requirement Outcomes

All 28 migrated requirements are validated with no active, deferred, blocked, or out-of-scope items.

## Deviations

The published npm tag was behind current GitHub main, so the CLI was built and installed from exact upstream commit 372fea8015fcd0760476d51103a94ff85d67fb68. Operational CMS contracts were relocated after the migration gate exposed a legacy runtime dependency on .planning. Earlier closeout receipts were explicitly reopened and refreshed after doctor correctly detected later source changes.

## Follow-ups

Create the approved Strapi + Ambrosia + Yandex Metrica Logs API experimentation milestone through the supported GSD new-milestone workflow when execution begins.
