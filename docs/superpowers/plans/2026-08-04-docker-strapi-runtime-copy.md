# Docker Strapi runtime copy hotfix — plan

1. Add a static Docker runtime contract gate with negative probes.
2. Remove the duplicate explicit Strapi build and unnecessary build-stage Strapi prune.
3. Install Strapi dependencies from the existing lockfile-backed install path in the runtime stage using BuildKit npm cache. Lockfile normalization is a separate follow-up because current `npm ci` rejects the historical lock.
4. Copy Admin build, dist, source/config/scripts/types, public uploads and database seed explicitly.
5. Build locally, inspect the image for seed/uploads/Admin/runtime modules, boot it on isolated ports and run API/media smoke.
6. Run typecheck/build and commit/push only the hotfix files to `strapi-full-cms` after verification.

Production deployment remains a separate user action.
