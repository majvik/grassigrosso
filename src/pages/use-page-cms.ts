/**
 * Hardcoded-first CMS hydrate hook (Phase 4A).
 * Page wiring lands in Phase B+; not imported by page JSX in Phase A.
 */
import { useEffect, useRef, useState } from 'react'
import type { PagesCmsSlug } from './pages-cms-constants'
import { mergePageContent } from './pages-cms-merge'
import { fetchPageContent } from './pages-api'
import { createMountGuard } from './pages-cms-mount-guard'

export { createMountGuard } from './pages-cms-mount-guard'

export function usePageCms<T extends Record<string, unknown>>(
  slug: PagesCmsSlug,
  fallback: T,
): T {
  const fallbackRef = useRef(fallback)
  const [data, setData] = useState(fallback)

  useEffect(() => {
    const guard = createMountGuard()
    void fetchPageContent(slug)
      .then((envelope) => {
        guard.run(() => {
          const merged = mergePageContent(slug, fallbackRef.current, envelope.data)
          if (merged.ok) setData(merged.value)
        })
      })
      .catch(() => {
        /* keep fallback */
      })
    return () => {
      guard.cancel()
    }
  }, [slug])

  return data
}
