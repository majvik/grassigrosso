import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

test('a fresh miss preserves the Strapi cache entry until the stale window expires', () => {
  const server = readFileSync(new URL('../server.cjs', import.meta.url), 'utf8')
  // Load the cache functions without starting the server or its integrations.
  const cacheFunctions = server.match(/^(function getCatalogStrapiCache\([\s\S]*?)^function resolveCatalogFallbackPayload\(/m)
  assert.ok(cacheFunctions, 'expected to find the Strapi cache functions in server.cjs')

  const catalogStrapiResponseCache = new Map()
  let now = 1000
  const { getCatalogStrapiCache, setCatalogStrapiCache } = runInNewContext(
    `${cacheFunctions[1]}\n({ getCatalogStrapiCache, setCatalogStrapiCache })`,
    {
      catalogStrapiResponseCache,
      CATALOG_STRAPI_CACHE_TTL_MS: 10,
      CATALOG_STRAPI_STALE_MS: 30,
      Date: { now: () => now },
    },
  )
  const key = 'catalog:products:full'
  const body = { items: [{ id: 1 }] }
  setCatalogStrapiCache(key, body)

  now = 1010
  assert.equal(getCatalogStrapiCache(key), body, 'cache is fresh through its TTL')

  now = 1011
  assert.equal(getCatalogStrapiCache(key), undefined, 'fresh-only lookup misses after TTL')
  assert.equal(getCatalogStrapiCache(key, { allowStale: true }), body, 'stale lookup still returns the body')

  now = 1030
  assert.equal(getCatalogStrapiCache(key, { allowStale: true }), body, 'stale window includes its deadline')

  now = 1031
  assert.equal(getCatalogStrapiCache(key, { allowStale: true }), undefined, 'stale lookup misses after its deadline')
  assert.equal(catalogStrapiResponseCache.has(key), false, 'expired entry is removed')
})
