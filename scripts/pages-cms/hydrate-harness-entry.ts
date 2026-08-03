/** Harness entry — re-exports Phase 4A modules for esbuild bundle (no React). */
export { mergePageContent } from '../../src/pages/pages-cms-merge.ts'
export { validateNodeEnvelope } from '../../src/pages/pages-cms-validate.ts'
export {
  fetchPageContent,
  prefetchPageContent,
  resetPagesApiCacheForTests,
  setPagesApiFetchForTests,
  getPagesApiCacheStateForTests,
  pagesApiPath,
} from '../../src/pages/pages-api.ts'
export { createMountGuard } from '../../src/pages/pages-cms-mount-guard.ts'
export {
  BEHAVIOR_BOUND_ARRAYS,
  setPagesApiTimeoutMsForTests,
} from '../../src/pages/pages-cms-constants.ts'
export { BEHAVIOR_ARRAY_ITEMS, CONTENT_ARRAY_ITEMS } from '../../src/pages/pages-cms-descriptors.ts'
