#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const record = process.argv.includes('--record')
const steps = [
  'check:pages-cms-phase-7a', 'check:pages-cms-phase-7b', 'check:pages-cms-phase-7c', 'check:pages-cms-phase-7d',
  'check:pages-cms-phase-6', 'check:routes', 'typecheck', 'build',
]
const before = spawnSync('git', ['status','--porcelain=v1','--untracked-files=all'], { cwd: root, encoding: 'utf8' }).stdout
const results = []
for (const script of steps) {
  const started = Date.now()
  const run = spawnSync('npm', ['run', script], { cwd: root, stdio: 'inherit', env: process.env })
  results.push({ script, status: run.status === 0 ? 'PASS' : 'FAIL', seconds: Math.round((Date.now() - started) / 1000) })
  if (run.status !== 0) process.exit(run.status || 1)
}
const after = spawnSync('git', ['status','--porcelain=v1','--untracked-files=all'], { cwd: root, encoding: 'utf8' }).stdout
if (after !== before) throw new Error(`Phase 7 gate changed porcelain\nBEFORE:\n${before}\nAFTER:\n${after}`)
if (record) {
  const lines = ['# Phase 7 Suite Results', '', `Recorded: ${new Date().toISOString()}`, '', '| Gate | Result | Seconds |', '|---|---:|---:|', ...results.map((r) => `| \`${r.script}\` | **${r.status}** | ${r.seconds} |`), '', '- Porcelain unchanged: **PASS**', '- Push / deploy / `strapi:sync-seed`: **not performed**', '']
  fs.writeFileSync(path.join(root, '.planning/phases/07-global-site-chrome/07-SUITE-RESULTS.md'), lines.join('\n'))
}
console.log(`check:pages-cms-phase-7 PASS (steps=${steps.length} record=${record ? 'yes' : 'no'} porcelain=unchanged)`)
