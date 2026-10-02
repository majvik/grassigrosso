# GSD-pi project migration plan

**Goal:** Replace the repository's legacy GSD v1 project state with a verified DB-backed project running exact current `open-gsd/gsd-pi` GitHub `main`, without adding application dependencies or performing any remote action.

**Spec:** `docs/superpowers/specs/2026-10-02-gsd-pi-project-migration-design.md`

## Phase 1 — Fresh CLI preflight

- [x] Reconfirm upstream HEAD and npm latest for `@opengsd/gsd-pi`.
- [x] Snapshot `git status`, legacy `.planning/` inventory and current package manifests.
- [x] Build and install the official scoped CLI from exact upstream commit `372fea8015fcd0760476d51103a94ff85d67fb68`, with optional Chromium/RTK downloads disabled.
- [x] Verify `command -v gsd`, `gsd --version`, installed runtime checksum parity and unchanged root `package.json`/`package-lock.json`.

**Verify:** `gsd --version`

## Phase 2 — Supported project migration

- [x] Start the installed GSD TUI from the repository root and run `/gsd migrate`.
- [x] Inspect the generated preview before writing; confirm 1 milestone, 7 slices, 7 tasks and the expected repository target.
- [x] Confirm the write under the user's explicit request to update project GSD.
- [x] Use deterministic doctor/query plus canonical validation/completion operations; no model provider is required for the historical import.
- [x] Preserve the retained migration backup and generated legacy archive/audit.

**Verify:** run `/gsd doctor` in the GSD TUI and `gsd headless query` from the repository root.

## Phase 3 — Repository integration and evidence

- [x] Inspect `.gsd/`, `.gsd-backups/`, generated `.gitignore` changes and legacy `.planning/` preservation.
- [x] Confirm runtime-only files are ignored and team-shareable projections are visible to Git as intended.
- [x] Compare imported milestone/slice/task/requirement counts with the migration preview and old roadmap.
- [x] Relocate operational Pages CMS contracts out of archived `.planning/` and update all active consumers.
- [x] Run local application and GSD gates; confirm no application package dependency change.
- [x] Record exact commands/results below.
- [x] Commit the local source-side migration repairs; do not push or deploy.

**Verify:** `git diff --check`

## Execution log

| Phase | Status | Evidence |
|---|---|---|
| 1. Fresh CLI preflight | complete | Upstream `main` and installed runtime match `372fea8015fcd0760476d51103a94ff85d67fb68`; CLI reports `1.20.1`; root package manifests unchanged. |
| 2. Supported project migration | complete | Migration audit: 15 decisions, 1 milestone, 7/7 slices, 7/7 tasks, 28/28 requirements; canonical validation and completion receipts recorded. |
| 3. Repository integration | complete | Operational contracts are independent of `.planning`; targeted application gates pass; source-side migration repairs are committed locally. Canonical GSD receipts are refreshed only after this final source commit. |

## Verification evidence

| Command | Result |
|---|---|
| `gsd --version` | PASS — `1.20.1`, built from exact upstream commit above |
| `gsd headless query` | PASS — M001 complete, 28/28 requirements validated, no active milestone |
| `/gsd doctor fix` | PASS — 0 structural errors; only local environment warnings for ports 1337/3000 and Docker daemon |
| `npm run typecheck` | PASS |
| `npm run check:routes` | PASS — 12 routes, 9 form labels |
| `npm run check:pages-cms-contract` | PASS — strict schemas, 140 rows |
| `npm run check:pages-cms-phase-6b` | PASS — development + production Strapi boot and all page feeds |
| `npm run check:pages-cms-phase-7a` | PASS — 13 consumers, 41 rows |
| `npm run check:pages-cms-phase-7d` | PASS — baseline slots and atomic runtime contract |
| `npm run build` | PASS — web and Strapi production builds |
| `git diff --check` | PASS |

## Migration repair note

The first post-migration `typecheck` and `build` failed because production code imported `02-content-contract.json` from the retired `.planning/` tree. The failing gates were preserved as the regression proof. Operational contracts now live under `src/contracts/pages-cms/`, their documentation/results under `docs/pages-cms/`, and active source/scripts contain no `.planning` dependency.
