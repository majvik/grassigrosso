export function isLocalSmokeUrl(baseUrl) {
  try {
    const { hostname } = new URL(baseUrl)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function shouldRunBrowserSmoke(baseUrl) {
  if (process.env.CATALOG_SMOKE_FORCE_BROWSER === '1') return true
  if (process.env.CATALOG_SMOKE_SKIP_BROWSER === '1') return false
  return isLocalSmokeUrl(baseUrl)
}
