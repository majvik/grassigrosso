#!/usr/bin/env node
/**
 * Phase E companion / full pages-cms local gate (no push, no strapi:sync-seed).
 *
 * Fast by default. Set PAGES_CMS_PHASE_E_FULL=1 to also run check:pages-api
 * (boots Strapi + Node; requires free :1337 and PAGES_API_CHECK_PORT).
 *
 * Usage:
 *   npm run check:pages-cms
 *   PAGES_CMS_PHASE_E_FULL=1 npm run check:pages-cms-phase-e
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const full = process.env.PAGES_CMS_PHASE_E_FULL === '1' || process.argv.includes('--full')

const steps = [
  ['check:pages-cms-isolation', ['run', 'check:pages-cms-isolation']],
  ['check:pages-cms-phase-a', ['run', 'check:pages-cms-phase-a']],
  ['check:pages-cms-strict', ['run', 'check:pages-cms-strict']],
  ['check:pages-cms-catalog-scope', ['run', 'check:pages-cms-catalog-scope']],
]

if (full) {
  steps.push(['check:pages-api', ['run', 'check:pages-api']])
}

const failures = []

for (const [label, args] of steps) {
  console.log(`\n── ${label} ──`)
  const result = spawnSync('npm', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0) {
    failures.push(`${label} exited ${result.status}`)
    break
  }
}

if (failures.length) {
  console.error('\ncheck:pages-cms FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log(`\ncheck:pages-cms PASS (full=${full ? 'yes' : 'no'})`)
