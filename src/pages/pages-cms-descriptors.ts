/**
 * Back-compat re-exports — descriptors are schema-derived in pages-cms-schema.ts.
 */
export {
  type FieldDesc,
  BEHAVIOR_ARRAY_ITEMS,
  BEHAVIOR_ARRAY_KEYS,
  BEHAVIOR_BOUND_ARRAYS,
  CONTENT_ARRAY_ITEMS,
  getPageRootSchema,
  resolveComponentSchema,
  collectUndescribedFixturePaths,
  listRequiredMediaPaths,
} from './pages-cms-schema'
