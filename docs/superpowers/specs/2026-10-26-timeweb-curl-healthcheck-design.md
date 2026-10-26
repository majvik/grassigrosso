# Timeweb Curl Healthcheck Design

## Problem

Timeweb App Platform rejects an otherwise healthy container after its platform healthcheck timeout. Timeweb support confirmed that `curl` must be present in the runtime image for their healthcheck. The current `node:22-slim` runtime does not install curl and the Dockerfile healthcheck uses a Node one-liner instead.

## Root cause

The application itself starts successfully and returns HTTP 200 from `/health`, but the runtime image does not satisfy the platform's curl-based healthcheck dependency.

## Design

1. Install only `curl` in the runtime stage with `--no-install-recommends`, then remove apt metadata.
2. Change the Docker `HEALTHCHECK` command to curl with fail-fast HTTP semantics and a bounded timeout.
3. Extend the Docker runtime contract test so both curl installation and curl-based `/health` probing are required.

## Success criteria

- Contract test fails against the current Dockerfile and passes after the change.
- Production image contains curl.
- The built container reaches Docker `healthy` and `/health` returns HTTP 200.
- Full relevant local test/build gate passes.
- Only `strapi-full-cms` is pushed; `main` and production remain untouched.
