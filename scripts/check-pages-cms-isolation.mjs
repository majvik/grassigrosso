#!/usr/bin/env node
/**
 * Phase E isolation gate: frontend (`src/`) must not fetch Strapi page feeds
 * or talk to :1337 for page content. Node `/api/pages/:slug` is the only
 * allowed page-content boundary (hydrate lands in Phase 4).
 *
 * Scans the real filesystem under the source root (tracked + untracked).
 * Optional injectables for harnesses:
 *   PAGES_CMS_ISOLATION_SRC_ROOT  — alternate root to walk
 *   PAGES_CMS_ISOLATION_FILES     — newline/comma-separated relative paths
 *                                   (relative to SRC_ROOT or absolute)
 *   PAGES_CMS_ISOLATION_SKIP_NEGATIVES=1 — skip built-in negative probes
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_SRC = path.join(ROOT, 'src')

const SRC_ROOT = process.env.PAGES_CMS_ISOLATION_SRC_ROOT
  ? path.resolve(process.env.PAGES_CMS_ISOLATION_SRC_ROOT)
  : DEFAULT_SRC

const SKIP_NEGATIVES = process.env.PAGES_CMS_ISOLATION_SKIP_NEGATIVES === '1'

const SOURCE_EXT = /\.(js|jsx|ts|tsx|mjs|cjs|css)$/i
const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist', '.tmp'])

const FORBIDDEN_PATTERNS = [
  {
    id: 'strapi-port',
    regex: /:1337\b/,
    message: 'direct Strapi port :1337',
  },
  {
    id: 'strapi-host-url',
    regex: /127\.0\.0\.1:1337|localhost:1337/i,
    message: 'direct Strapi host URL',
  },
  {
    id: 'page-feed-path',
    regex:
      /\/api\/(index|hotels|dealers|contacts|documents|download-catalog)-page-feed\b/,
    message: 'Strapi page-feed path',
  },
  {
    id: 'page-feed-name',
    regex:
      /\b(index|hotels|dealers|contacts|documents|download-catalog)-page-feed\b/,
    message: 'Strapi page-feed identifier',
  },
  {
    id: 'vite-strapi',
    regex: /\bVITE_STRAPI_[A-Z0-9_]+\b/,
    message: 'VITE_STRAPI_* frontend env (forbidden page CMS contract)',
  },
]

function walkSourceFiles(srcRoot) {
  const acc = []
  if (!fs.existsSync(srcRoot)) return acc

  function walk(dir) {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.isDirectory()) continue
      if (SKIP_DIR_NAMES.has(entry.name)) continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (!entry.isFile()) continue
      if (!SOURCE_EXT.test(entry.name)) continue
      acc.push(full)
    }
  }

  walk(srcRoot)
  return acc.sort()
}

function resolveInjectableFileList(srcRoot) {
  const raw = process.env.PAGES_CMS_ISOLATION_FILES
  if (!raw || !raw.trim()) return null
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((relOrAbs) =>
      path.isAbsolute(relOrAbs) ? relOrAbs : path.join(srcRoot, relOrAbs),
    )
}

/**
 * @param {string[]} absoluteFiles
 * @param {string} srcRoot
 * @returns {{ rel: string, id: string, message: string }[]}
 */
export function scanIsolationViolations(absoluteFiles, srcRoot = SRC_ROOT) {
  const violations = []
  for (const abs of absoluteFiles) {
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) continue
    const text = fs.readFileSync(abs, 'utf8')
    const rel = path.relative(srcRoot, abs) || path.basename(abs)
    for (const rule of FORBIDDEN_PATTERNS) {
      if (rule.regex.test(text)) {
        violations.push({ rel, id: rule.id, message: rule.message })
      }
    }
  }
  return violations
}

function listFilesToScan(srcRoot) {
  const injected = resolveInjectableFileList(srcRoot)
  if (injected) return injected
  return walkSourceFiles(srcRoot)
}

/**
 * Built-in negatives: each forbidden family alone must FAIL when scanned
 * via a temporary source root (proves detection without relying on git index).
 */
function runNegativeRegressions() {
  const failures = []
  const cases = [
    {
      family: ':1337',
      file: 'probe-port.js',
      // Host form without page-feed so only port/host rules fire
      content: "const url = 'http://127.0.0.1:1337/admin'\n",
      expectIds: ['strapi-port', 'strapi-host-url'],
    },
    {
      family: 'page-feed',
      file: 'probe-feed.js',
      // Relative path — no :1337
      content: "fetch('/api/index-page-feed')\n",
      expectIds: ['page-feed-path', 'page-feed-name'],
    },
    {
      family: 'VITE_STRAPI_*',
      file: 'probe-vite.js',
      content: "const x = import.meta.env.VITE_STRAPI_URL\n",
      expectIds: ['vite-strapi'],
    },
  ]

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-cms-isolation-neg-'))
  try {
    for (const c of cases) {
      const caseDir = path.join(tmpRoot, c.family.replace(/[^a-z0-9_-]+/gi, '_'))
      fs.mkdirSync(caseDir, { recursive: true })
      const abs = path.join(caseDir, c.file)
      fs.writeFileSync(abs, c.content, 'utf8')

      const files = walkSourceFiles(caseDir)
      if (files.length !== 1) {
        failures.push(
          `negative ${c.family}: expected 1 scanned file, got ${files.length}`,
        )
        continue
      }

      const violations = scanIsolationViolations(files, caseDir)
      const ids = new Set(violations.map((v) => v.id))
      const hit = c.expectIds.some((id) => ids.has(id))
      if (!hit) {
        failures.push(
          `negative ${c.family}: expected FAIL for ${c.expectIds.join('|')}, got ${
            violations.length
              ? violations.map((v) => v.id).join(',')
              : 'PASS (no violations)'
          }`,
        )
      }

      // Ensure unrelated families do not falsely claim coverage for this probe
      const foreign = [...ids].filter((id) => !c.expectIds.includes(id))
      if (foreign.length) {
        // Soft note only if unexpected cross-hit (shouldn't happen with crafted probes)
        failures.push(
          `negative ${c.family}: unexpected extra rule hits: ${foreign.join(',')}`,
        )
      }
    }

    // Injectable file-list path: same port probe via PAGES_CMS_ISOLATION_FILES semantics
    const listDir = path.join(tmpRoot, 'injectable-list')
    fs.mkdirSync(listDir, { recursive: true })
    const clean = path.join(listDir, 'clean.js')
    const dirty = path.join(listDir, 'dirty.js')
    fs.writeFileSync(clean, 'export const ok = 1\n', 'utf8')
    fs.writeFileSync(dirty, "fetch('http://localhost:1337/api/foo')\n", 'utf8')
    const listViolations = scanIsolationViolations([dirty], listDir)
    if (!listViolations.some((v) => v.id === 'strapi-port' || v.id === 'strapi-host-url')) {
      failures.push(
        'negative injectable-file-list: dirty file alone did not fail on :1337',
      )
    }
    const cleanOnly = scanIsolationViolations([clean], listDir)
    if (cleanOnly.length) {
      failures.push(
        `negative injectable-file-list: clean file unexpectedly failed: ${cleanOnly
          .map((v) => v.id)
          .join(',')}`,
      )
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true })
  }

  return failures
}

function main() {
  const failures = []

  if (!SKIP_NEGATIVES) {
    for (const msg of runNegativeRegressions()) failures.push(msg)
  }

  const files = listFilesToScan(SRC_ROOT)
  if (!files.length && !process.env.PAGES_CMS_ISOLATION_FILES) {
    failures.push(`no source files found under ${path.relative(ROOT, SRC_ROOT) || SRC_ROOT}`)
  }

  const violations = scanIsolationViolations(files, SRC_ROOT)
  for (const v of violations) {
    failures.push(`${v.rel}: forbidden ${v.message} (${v.id})`)
  }

  if (failures.length) {
    console.error('check:pages-cms-isolation FAILED')
    for (const f of failures) console.error(` - ${f}`)
    process.exit(1)
  }

  console.log('check:pages-cms-isolation PASS')
  console.log(
    ` files=${files.length} forbiddenPatterns=${FORBIDDEN_PATTERNS.length} srcRoot=${path.relative(ROOT, SRC_ROOT) || '.'} negatives=${SKIP_NEGATIVES ? 'skipped' : 'ok'}`,
  )
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  main()
}
