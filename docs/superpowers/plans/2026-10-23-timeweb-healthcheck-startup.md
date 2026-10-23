# Timeweb Healthcheck Startup Plan

1. [x] Inspect the deployment log and establish the platform health window.
2. [x] Trace port binding, `/health` and Strapi startup ordering.
3. [x] Add a failing Docker runtime regression for startup order.
4. [x] Start the public server before waiting for Strapi.
5. [x] Run focused and full local verification.
6. [ ] Commit and push only `strapi-full-cms`.

## Verification evidence

- Deploy log: container started at 12:47:19 and became unhealthy at 12:49:04; image build and pull succeeded.
- Source trace: `server.cjs` binds `0.0.0.0:${PORT}` and `/health` returns 200, but `start-services.sh` calls `wait_for_strapi_port` before `node server.cjs`.
- RED: `npm run check:docker-runtime-contract` failed with `public server must start before the blocking Strapi readiness wait`.
- GREEN (focused): `npm run check:docker-runtime-contract && bash -n scripts/start-services.sh` exited 0.
- GREEN (full gate): `npm run check && npm run check:docker-runtime-contract && npm run check:pages-cms-hydrate-dom && npm run check:personal-data && npm run check:khartsyzk-contact-details && npm run check:catalog-smart-selector && npm run check:catalog-ui && npm run check:modal-system && npm run check:catalog-smart-select-api && npm run check:catalog-firmness-scores && npm run check:medusa-license && npm run check:commerce-runtime && npm run build` exited 0.
