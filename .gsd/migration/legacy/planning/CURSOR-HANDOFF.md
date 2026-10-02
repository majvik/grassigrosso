# Cursor handoff — Pages CMS v1.1

**Prepared:** 2026-08-03
**Branch:** `catalogue`
**Baseline commit:** `f84c6f1 docs: harden local CMS implementation plan`
**Remote actions:** none; do not push, open/update PRs or deploy

## Objective

Continue the local implementation of editable marketing pages in Strapi without losing current React content, layout or runtime hooks.

## Mandatory operating rules

Read `AGENTS.md` before any action. In particular:

- Work strictly locally.
- Do not run `git push`, create/update a PR, deploy, or mutate Timeweb/dev/prod.
- New/changed behavior requires automated tests; bugs require regression tests.
- Manual Admin/browser smoke supplements tests and cannot replace them.
- Do not mark a task or phase complete until the full relevant local gate is green and commands/results are recorded in the plan.
- Local commits are allowed. Keep commits scoped and do not include generated local artifacts.

## Current state

- Phase 1 is committed: `page.hero`, `page.section`, `page.faq-item`, `page.list-item`, RU translation keys and generated Strapi component types.
- Phase 2 application code has not started.
- The original Phase 2 schema was rejected as lossy after comparison with current TSX.
- The corrected Phase 2 plan is awaiting explicit execution approval in `.planning/phases/02-wave-1-single-types/02-01-PLAN.md`.
- Existing application behavior and email-routing contracts have not been changed.

## Read in this order

1. `AGENTS.md`
2. `.planning/PROJECT.md`
3. `.planning/REQUIREMENTS.md`
4. `.planning/ROADMAP.md`
5. `.planning/STATE.md`
6. `.planning/phases/02-wave-1-single-types/02-RESEARCH.md`
7. `.planning/phases/02-wave-1-single-types/02-01-PLAN.md`
8. `docs/superpowers/specs/2026-08-03-pages-cms-plan-audit-design.md`
9. Current page sources under `src/components/pages/`

## First implementation gate

Do not create Phase 2 schemas first. The first artifact must be:

`.planning/phases/02-wave-1-single-types/02-CONTENT-CONTRACT.md`

It must inventory every editor-facing render input for Index, Hotels, Dealers, Contacts, Documents and Download Catalog:

| Page | Section | Current source | CMS field/type | Code-owned reason | Stable runtime hook | Fallback | Fixture value |
|------|---------|----------------|----------------|-------------------|---------------------|----------|---------------|

No unresolved rows are allowed before schema implementation. Pay special attention to:

- Index collections, media, testimonials and document request keys.
- Hotels stats, categories, products/media, discount rows and refresh program.
- Dealers packages and stable option values used by form behavior.
- Contacts per-office map tabs/embed inputs.
- Documents stable ids and request-vs-download behavior.
- Download Catalog form behavior, slide contract and PDF delivery.

## Test-first preparation required for Phase 2

Before or together with schema implementation, add a persistent automated schema-contract test harness that checks:

- every expected component/single-type schema exists and parses;
- component UIDs, nesting, media allowed types and required fields;
- representative fixture shape for all six pages;
- complete CM + CTB RU translation coverage;
- preservation of existing download-catalog attributes;
- absence of forbidden Phase 3/4 scope in a Phase 2 diff.

Add the test as an npm script so the gate is reproducible, not a one-off shell command.

## Local baseline verification already completed

From repository root:

```text
npm run typecheck
PASS — tsc --noEmit

npm run build
PASS — Vite build + Strapi build + prepare-dist

Phase 1 schema/RU assertion
PASS — four schemas, section→list-item, hero image constraint, 16 CM + 16 CTB keys
```

These results only validate the baseline. Cursor must rerun relevant checks after its changes and add tests for all new behavior.

## Expected local verification for Phase 2

At minimum, record exact results for:

1. New persistent schema-contract test command.
2. Representative fixture validation.
3. `npm run typecheck`.
4. `npm run build`.
5. Isolated local Strapi schema boot.
6. Existing download-catalog feed/API regression check.
7. Automated RU translation coverage assertion.
8. Local Admin UI smoke as additional evidence.

If a required check cannot run, leave the phase incomplete and document the blocker.

## Git handoff

- Stay on branch `catalogue` unless the user explicitly asks otherwise.
- Commit locally in scoped increments; never push.
- Before each commit: `git diff --check`, relevant automated tests, and inspect `git status --short`.
- Root `.tmp/`, Python bytecode, `dist/`, Strapi build/cache/tmp and runtime databases are local artifacts and must not be committed.
