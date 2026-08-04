/** Harness entry — re-exports Phase 4A modules for esbuild bundle (no React). */
export { mergePageContent, applyFieldDescForTests } from '../../src/pages/pages-cms-merge.ts'
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
  setPagesApiTimeoutMsForTests,
  PAGES_CMS_SLUGS,
  LEGAL_PAGES_CMS_SLUGS,
  isLegalPagesCmsSlug,
} from '../../src/pages/pages-cms-constants.ts'
export {
  BEHAVIOR_BOUND_ARRAYS,
  BEHAVIOR_ARRAY_ITEMS,
  getPageRootSchema,
  resolveComponentSchema,
  collectUndescribedFixturePaths,
  listRequiredMediaPaths,
} from '../../src/pages/pages-cms-schema.ts'
