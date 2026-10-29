# Store, Prices, and Smart Selector Branch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Assemble all existing store, product-price, and smart-selector work into one safe local branch.

**Architecture:** Branch from the current local commerce HEAD, merge the latest remote dev history, then commit only the branch documentation and existing commerce client report. Preserve all existing refs and avoid history rewriting.

**Tech Stack:** Git, Node.js, TypeScript, Strapi, Medusa, Vite

**Spec:** `docs/superpowers/specs/2026-10-29-store-commerce-smart-selector-branch-design.md`

## Global Constraints

- Branch name: `codex/store-commerce-smart-selector`.
- No push, deploy, reset, rebase, force-push, or branch deletion.
- Existing branches and remote refs must remain unchanged.
- The new branch must include both local commerce work and current `origin/strapi-full-cms`.

## Review Focus

- Remote-only Timeweb commits must not be lost during branch assembly.
- The untracked commerce report must be included without unrelated files.
- Smart-selector and price history must remain reachable from the new branch.
- Local commerce contract and synchronization files must remain present.
- Verification must distinguish completed technical foundation from unfinished public store UI.

### Phase 1: Capture and assemble history

- [x] Record source branch and commit refs.
- [x] Create and check out `codex/store-commerce-smart-selector` from current HEAD.
- [x] Merge `origin/strapi-full-cms` without rewriting either history.
- [x] Verify required representative commits are ancestors of the new branch.

### Phase 2: Track branch documentation

- [x] Add the existing commerce client report.
- [x] Add this spec and plan.
- [x] Commit the branch assembly documentation locally (`bcd9bdf`).

### Phase 3: Local verification

- [x] Run commerce license, runtime, catalog-contract, readiness, and Medusa integration tests.
- [x] Run smart-selector and price-related catalog checks.
- [x] Run TypeScript checks and production builds for the website, Strapi, and Medusa.
- [x] Record exact commands and results below.

## Verification evidence

- `npm run check:medusa-license` — PASS, 4 tests and Core-only baseline validation.
- `npm run check:commerce-runtime` — PASS with Docker: PostgreSQL, Redis, backup/restore, Russian Admin locale, `/health` 200.
- `npm run check:commerce-catalog-contract` — PASS.
- `npm run check:commerce-readiness` — PASS.
- `npm run test:commerce` — PASS, 5 catalog-sync integration tests.
- `npm run check:catalog-smart-selector` — PASS against `http://127.0.0.1:5174/catalog` with the full local stack.
- `npm run check:catalog-smart-select-api` — PASS.
- `npm run check:catalog-firmness-scores` — PASS.
- `npm run check:catalog-price-filter` — PASS.
- `npm run check:catalog-card-price` — PASS.
- `npm run check:catalog-recommended-section` — PASS.
- `npm run typecheck` — PASS.
- `npm run build` — PASS for Vite and Strapi production builds. Strapi emitted a sandbox-only preference-file warning but completed with exit code 0.
- `npm run build:commerce` — PASS after allowing Medusa CLI access to its local `~/.config/medusa` configuration.
