# Docker Strapi runtime copy hotfix — design

**Problem:** Timeweb build reaches the final image but exceeds the platform window. The log proves two Strapi Admin builds and an 866.7s cross-stage copy of the entire 1.3GB `strapi-catalog`, including 786MB of `node_modules`.

**Constraints:** local-first content delivery is unchanged. The image must still contain the versioned seed, every tracked upload, schemas/source/config, prepared dist and built Admin. Production is not modified by this task.

**Solution:** build Strapi once; install its lockfile-backed production dependencies directly in a cacheable runtime layer; copy only required Strapi application directories from the build stage. Admin is inside `dist/build`; there is no separate clean-stage `/build`. Do not copy build-stage `strapi-catalog/node_modules`, `.tmp`, caches or compiler temporaries.

**Success:** one Strapi build, no whole-directory Strapi runtime copy, seed/uploads present byte-for-byte, runtime boots from a clean image, catalog/pages gates remain green.
