# Timeweb Healthcheck Startup Design

## Problem

The Docker image builds successfully, but Timeweb marks the new container unhealthy about 105 seconds after startup. `scripts/start-services.sh` does not launch the public server on port 3000 until Strapi has opened port 1337. A cold Strapi start may legitimately exceed the platform health window because the script allows 180 seconds per attempt and up to three attempts.

## Root cause

- The Docker healthcheck correctly requests `GET /health` on port 3000.
- `server.cjs` correctly listens on `0.0.0.0` and returns HTTP 200 from `/health` without requiring Strapi.
- The startup script waits for Strapi before executing `node server.cjs`, so no process listens on port 3000 during the platform health window.

## Design

Start the public web/API server immediately after installing the signal cleanup trap, then initialize Strapi in parallel. Keep the existing Strapi retries, seed handling and degraded-mode behavior. The public server can already serve static pages, `/health`, snapshots and fallback catalog data while Strapi warms up.

Add a deploy contract regression that requires the public server launch to occur before the first blocking Strapi readiness wait, and preserves the existing Docker healthcheck and `0.0.0.0` binding contracts.

## Success criteria

- Port 3000 can become healthy independently of Strapi cold-start duration.
- Strapi still starts, retries and is cleaned up on container termination.
- The Docker runtime contract test fails for the old startup order and passes after the change.
- Full local test/build gate passes.
- Only `strapi-full-cms` is pushed; `main` and production remain untouched.
