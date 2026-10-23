# Medusa distribution baseline

Reviewed: 2026-10-23. This is a technical control, not legal advice.

## Accepted upstream

- Repository: `https://github.com/medusajs/medusa`
- Tag: `v2.21.2`
- Commit: `020565398e436a2bc65777a3b1ad347b4735d6df`
- Node requirement: `^20.19.0 || >=22.12.0`; Grassigrosso target: Node 24.x
- Root MIT/dual-license notice SHA-256: `cf67cc556c17e0b00dc0c74a3d71db8dec9aae98af747a2503803a640fba9bb5`
- Enterprise notice SHA-256: `2e0b6e1a06fc2fbc9d4f6bb57cf61ea707bb470711f8c068acc42b85fd30b5d4`

The exact notices are stored in `docs/commerce/licenses/`. Package integrity and tarball hashes are stored in `medusa-baseline.json` and `medusa-sbom.json`.

## Temporary distribution policy: official packages, Core-only use

The official `@medusajs/medusa@2.21.2` and `@medusajs/framework@2.21.2` tarballs physically contain compiled files listed as Enterprise Materials. Grassigrosso may initially install the unchanged official packages, but must not enable Enterprise feature flags, import Enterprise modules, modify those files, copy them into project-owned modules, or depend on RBAC/SSO/OIDC behavior.

This replaces the impossible `zero files physically present` test with a fail-closed `zero project usage or activation` test. The denylist remains machine-readable in `scripts/commerce/enterprise-paths.json`.

## Planned migration to a filtered source fork

The immutable product, order and payment contracts must not depend on the package origin. A later controlled migration may replace official packages with internally built packages from the same public Core interfaces. That migration requires its own license diff, removal manifest, build proof, database migration review, integration tests and rollback rehearsal.

## Update rule

Every Medusa update requires an explicit review of:

1. tag and commit signature;
2. both license notices and the Enterprise path list;
3. npm package integrity and tarball hashes;
4. newly added package licenses;
5. Enterprise feature flags/imports in Grassigrosso code;
6. release notes, security advisories, migrations and full local gates.

No update command is part of `check:medusa-license`; the check is offline and compares only committed evidence.
