# Pages CMS media/Admin and dealers marquee hotfix plan

## Phase A — Media record repair and contract

Status: complete.

- Normalize Pages CMS upload URLs in local/seed SQLite to the committed canonical filename.
- Clear unavailable generated formats so Admin uses the valid original.
- Extend media integrity gate to scan the versioned seed database, not snapshots only.
- Verify the repair is idempotent and all referenced files exist.

## Phase B — Dealers marquee lifecycle

Status: complete.

- Initialize geography effects only after React page mounting.
- Extend the DOM gate to assert that the hydrated marquee actually moves.

## Phase C — Regression and delivery

Status: complete locally; delivery to `strapi-full-cms` follows this verified hotfix.

- Run focused media, hydrate DOM, typecheck, build, and relevant Pages CMS gates.
- Commit and push only the hotfix; do not include Phase 7 planning files.
