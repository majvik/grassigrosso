#!/usr/bin/env node
/**
 * Phase E isolation gate: frontend (`src/`) must not fetch Strapi page feeds
 * or talk to :1337 for page content. Node `/api/pages/:slug` is the only
 * allowed page-content boundary (hydrate lands in Phase 4).
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'src')

const failures = []
const fail = (msg) => failures.push(msg)

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

function listSrcFiles() {
  try {
    const out = execFileSync(
      'git',
      ['ls-files', 'src'],
      { cwd: ROOT, encoding: 'utf8' },
    )
    return out
      .split('\n')
      .filter(Boolean)
      .filter((rel) => /\.(js|jsx|ts|tsx|mjs|cjs|css|module\.css)$/.test(rel))
  } catch {
    /** Fallback if not a git checkout */
    const acc = []
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (/\.(js|jsx|ts|tsx|mjs|cjs|css)$/.test(entry.name)) {
          acc.push(path.relative(ROOT, full))
        }
      }
    }
    if (fs.existsSync(SRC)) walk(SRC)
    return acc
  }
}

const files = listSrcFiles()
assertFiles(files.length > 0, 'no src files found to scan')

function assertFiles(cond, message) {
  if (!cond) fail(message)
}

for (const rel of files) {
  const abs = path.join(ROOT, rel)
  if (!fs.existsSync(abs)) continue
  const text = fs.readFileSync(abs, 'utf8')
  for (const rule of FORBIDDEN_PATTERNS) {
    if (rule.regex.test(text)) {
      fail(`${rel}: forbidden ${rule.message} (${rule.id})`)
    }
  }
}

if (failures.length) {
  console.error('check:pages-cms-isolation FAILED')
  for (const f of failures) console.error(` - ${f}`)
  process.exit(1)
}

console.log('check:pages-cms-isolation PASS')
console.log(` files=${files.length} forbiddenPatterns=${FORBIDDEN_PATTERNS.length}`)
