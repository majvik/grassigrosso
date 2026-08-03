/**
 * Mount/alive guard shared by usePageCms and unit harness (no React import).
 */
export function createMountGuard(): {
  cancel: () => void
  isAlive: () => boolean
  run: (fn: () => void) => void
} {
  let alive = true
  return {
    cancel: () => {
      alive = false
    },
    isAlive: () => alive,
    run: (fn) => {
      if (alive) fn()
    },
  }
}
