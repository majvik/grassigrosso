#!/usr/bin/env node
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const require = createRequire(import.meta.url)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { canonicalizeSiteChrome } = require(path.join(root, 'strapi-catalog/src/api/pages-cms/utils/site-chrome-contract.js'))
const { writeSiteChromeSnapshotAtomic } = require(path.join(root, 'lib/site-chrome-snapshots.cjs'))
const base = String(process.env.PAGES_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const response = await fetch(`${base}/api/site-chrome`)
const body = await response.json().catch(() => null)
if (!response.ok || body?.source !== 'strapi') throw new Error(`site chrome exporter requires source=strapi, got HTTP ${response.status} source=${body?.source}`)
writeSiteChromeSnapshotAtomic(path.join(root, 'public'), canonicalizeSiteChrome(body.data))
console.log('site chrome snapshot exported (source=strapi, atomic)')
