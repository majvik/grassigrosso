# Timeweb Curl Healthcheck Plan

1. [x] Confirm Timeweb requirement and isolate work from local commerce changes.
2. [x] Add a failing runtime contract for curl installation and healthcheck usage.
3. [x] Install curl and switch Docker healthcheck to curl.
4. [x] Run focused tests and build the production image.
5. [x] Run the container and verify Docker health plus HTTP 200.
6. [x] Commit and push only `strapi-full-cms`.

## Verification evidence

- Timeweb support: curl is required for App Platform healthcheck.
- Existing image: application logs show `Server running on port 3000` and `Strapi is ready`, while the platform still rejects the revision.
- RED: `npm run check:docker-runtime-contract` failed because curl was absent and the healthcheck used Node.
- GREEN (focused): `npm run check:docker-runtime-contract` passes after the Dockerfile change.
- GREEN (build): `docker build --progress=plain -t grassigrosso:timeweb-curl-health .` completed, including Vite and Strapi production builds.
- GREEN (runtime): the container reached Docker `healthy`; both host and in-container curl requests to `/health` returned HTTP 200.
- Runtime curl: `curl 7.88.1` is available in the final image.
