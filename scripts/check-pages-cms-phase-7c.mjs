#!/usr/bin/env node
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'scripts/fixtures/pages-cms/site-chrome.json'), 'utf8'))
const { canonicalizeSiteChrome } = require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/site-chrome-contract.js'))
const { createSiteChromeApi } = require(path.join(root, 'lib/site-chrome-api.cjs'))
const { writeSiteChromeSnapshotAtomic, verifySiteChromeSnapshotSet, SITE_CHROME_SNAPSHOT_NAME } = require(path.join(root, 'lib/site-chrome-snapshots.cjs'))
const assert = (ok, message) => { if (!ok) throw new Error(message) }
const canonical = canonicalizeSiteChrome(fixture)
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'phase7c-'))
let server
try {
  writeSiteChromeSnapshotAtomic(tmp, canonical, '2026-08-04T00:00:00.000Z')
  assert(verifySiteChromeSnapshotSet(tmp).length === 0, 'snapshot verify')
  const original = fs.readFileSync(path.join(tmp, SITE_CHROME_SNAPSHOT_NAME), 'utf8')
  fs.writeFileSync(path.join(tmp, SITE_CHROME_SNAPSHOT_NAME), `${original} `)
  assert(verifySiteChromeSnapshotSet(tmp).some((x) => x.includes('sha256')), 'corrupt hash negative')
  fs.writeFileSync(path.join(tmp, SITE_CHROME_SNAPSHOT_NAME), original)

  server = http.createServer((_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ data: canonical })) })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const api = createSiteChromeApi({ strapiUrl: `http://127.0.0.1:${port}`, snapshotDir: tmp, rootDir: root })
  let result = await api.resolve()
  assert(result.status === 200 && result.body.source === 'strapi', 'strapi source')
  api.seedCache(canonical)
  result = await api.resolve()
  assert(result.body.source === 'memory-cache', 'memory source')
  await new Promise((resolve) => server.close(resolve)); server = null
  const diskApi = createSiteChromeApi({ snapshotDir: tmp, rootDir: root })
  result = await diskApi.resolve()
  assert(result.status === 200 && result.body.source === 'disk-snapshot', 'disk source')
  fs.writeFileSync(path.join(tmp, SITE_CHROME_SNAPSHOT_NAME), '{')
  result = await createSiteChromeApi({ snapshotDir: tmp, rootDir: root }).resolve()
  assert(result.status === 503, 'corrupt snapshot 503')

  const seedSource = fs.readFileSync(path.join(root, 'scripts/pages-cms/seed-core.cjs'), 'utf8')
  assert(seedSource.includes("api::site-chrome.site-chrome"), 'seed owns site chrome only')
  assert(seedSource.includes('assertCatalogGuard'), 'catalog guard retained')
  assert(seedSource.includes('injectFailureAfterSiteChromeMutation'), 'rollback injection retained')
  console.log('check:pages-cms-phase-7c PASS (fixture=canonical sources=3 snapshotHash=ok seedGuard=ok)')
} finally {
  if (server) await new Promise((resolve) => server.close(resolve))
  fs.rmSync(tmp, { recursive: true, force: true })
}
