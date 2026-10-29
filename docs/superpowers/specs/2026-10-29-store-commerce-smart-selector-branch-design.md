# Store, Prices, and Smart Selector Branch Design

## Problem

Work related to the B2C store, product prices, and the smart mattress selector is currently split between the shared `strapi-full-cms` history, four local-only commits, two newer remote deploy commits, and one untracked commerce report. The work needs a dedicated branch without rewriting or deleting the existing branches.

## Current evidence

- Smart-selector and catalog-price commits already belong to the common `strapi-full-cms` history.
- Local-only commerce commits are `ecebb5a`, `0b85409`, and `003d7f6`.
- Local-only deployment documentation is `8b6c380`.
- Remote-only deployment commits are `ce2d52d` and `39107f8`.
- `docs/commerce/2026-10-26-medusa-integration-client-report.md` is related to the store but is not tracked yet.

## Decision

Create `codex/store-commerce-smart-selector` from the current local `strapi-full-cms` HEAD, merge the current `origin/strapi-full-cms` without rewriting history, and commit the commerce report plus this branch design and plan. This preserves all price and smart-selector history already present in the common ancestor while adding the local commerce foundation and the latest deploy compatibility work.

## Non-goals

- Do not remove commits from `strapi-full-cms`.
- Do not rewrite, reset, force-push, or delete any branch.
- Do not push the new branch without a separate explicit request.
- Do not claim the public store is complete; the branch contains the technical foundation only.

## Success criteria

1. `codex/store-commerce-smart-selector` exists locally and is checked out.
2. The branch contains the smart-selector, price, and commerce commits plus the Timeweb curl fix.
3. The client commerce report is tracked.
4. The original `strapi-full-cms`, `main`, and remote refs are unchanged.
5. Commerce checks, smart-selector checks, typecheck, and production builds pass locally.
