/**
 * Uploads / git working-tree guard for pages-cms Phase E full gate.
 * Fingerprint strapi-catalog/public/uploads as path + size + SHA-256.
 * Cleanup deletes only additions; missing/changed must FAIL the gate.
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const DERIVATIVE_PREFIXES = Object.freeze(['thumbnail_', 'small_', 'medium_', 'large_'])
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function uploadsDirForRoot(root) {
  return path.join(root, 'strapi-catalog/public/uploads')
}

/** Relative paths under uploads/, sorted. Files only (no dirs). */
export function listUploadsRelPaths(uploadsDir) {
  if (!fs.existsSync(uploadsDir)) return []
  const out = []
  for (const name of fs.readdirSync(uploadsDir)) {
    const abs = path.join(uploadsDir, name)
    let st
    try {
      st = fs.lstatSync(abs)
    } catch {
      continue
    }
    if (st.isFile()) out.push(name)
  }
  out.sort()
  return out
}

/**
 * @typedef {{ size: number, sha256: string }} UploadsFileMeta
 * @typedef {Map<string, UploadsFileMeta>} UploadsFingerprint
 */

function hashFile(abs) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(abs))
  return hash.digest('hex')
}

/** Map of relative path → { size, sha256 }. */
export function uploadsFingerprint(uploadsDir) {
  /** @type {UploadsFingerprint} */
  const fp = new Map()
  for (const name of listUploadsRelPaths(uploadsDir)) {
    const abs = path.join(uploadsDir, name)
    let st
    try {
      st = fs.lstatSync(abs)
    } catch {
      continue
    }
    if (!st.isFile()) continue
    fp.set(name, { size: st.size, sha256: hashFile(abs) })
  }
  return fp
}

/**
 * Full baseline diff: additions / missing / changed (size or sha256).
 * @returns {{ additions: string[], missing: string[], changed: string[] }}
 */
export function compareUploadsFingerprints(before, after) {
  const additions = []
  const missing = []
  const changed = []
  for (const name of after.keys()) {
    if (!before.has(name)) additions.push(name)
  }
  for (const [name, meta] of before) {
    const next = after.get(name)
    if (!next) {
      missing.push(name)
      continue
    }
    if (next.size !== meta.size || next.sha256 !== meta.sha256) {
      changed.push(name)
    }
  }
  additions.sort()
  missing.sort()
  changed.sort()
  return { additions, missing, changed }
}

export function uploadsDiffIsClean(diff) {
  return (
    diff.additions.length === 0 &&
    diff.missing.length === 0 &&
    diff.changed.length === 0
  )
}

export function formatUploadsDiff(diff) {
  return (
    `additions=${JSON.stringify(diff.additions)} ` +
    `missing=${JSON.stringify(diff.missing)} ` +
    `changed=${JSON.stringify(diff.changed)}`
  )
}

/** True if basename looks like a pages-cms seed/upload artifact (incl. derivatives). */
export function isPagesCmsUploadName(name) {
  return String(name).includes('pages_cms_')
}

/**
 * Basenames under uploads/ that are tracked by git (`git ls-files`).
 * Includes files that would be ignored if untracked — only what is already in the index/tree.
 */
export function listGitTrackedUploadBasenames(uploadsDir, repoRoot) {
  const relUploads = path.relative(repoRoot, uploadsDir).split(path.sep).join('/')
  const r = spawnSync('git', ['ls-files', '-z', '--', relUploads], {
    cwd: repoRoot,
    encoding: 'buffer',
  })
  if (r.status !== 0) {
    throw new Error(`git ls-files failed for ${relUploads}: ${String(r.stderr || '')}`)
  }
  const out = new Set()
  const buf = r.stdout || Buffer.alloc(0)
  if (buf.length === 0) return out
  for (const entry of buf.toString('utf8').split('\0')) {
    if (!entry) continue
    out.add(path.basename(entry))
  }
  return out
}

/**
 * On-disk `*pages_cms_*` files that are NOT in `git ls-files` (untracked and/or gitignored).
 * Milestone closeout requires this list to be empty.
 */
export function listUntrackedPagesCmsUploads(uploadsDir, repoRoot) {
  const tracked = listGitTrackedUploadBasenames(uploadsDir, repoRoot)
  const leftovers = []
  for (const name of listUploadsRelPaths(uploadsDir)) {
    if (!isPagesCmsUploadName(name)) continue
    if (!tracked.has(name)) leftovers.push(name)
  }
  leftovers.sort()
  return leftovers
}

/**
 * @returns {{ ok: true, leftovers: [] } | { ok: false, leftovers: string[] }}
 */
export function assertNoUntrackedPagesCmsUploads(uploadsDir, repoRoot) {
  const leftovers = listUntrackedPagesCmsUploads(uploadsDir, repoRoot)
  return leftovers.length === 0
    ? { ok: true, leftovers: [] }
    : { ok: false, leftovers }
}

/**
 * Negative probe: an ignored `pages_cms_*.mp4` must be detected as untracked leftover
 * and must make assertNoUntrackedPagesCmsUploads FAIL until removed.
 * Leaves uploads identical to entry (no new leftovers).
 */
export function runUntrackedPagesCmsProbe(uploadsDir, repoRoot) {
  const failures = []
  const token = `gate_ignored_${process.pid}_${Date.now()}`
  const name = `pages_cms_${token}_silent_probe.mp4`
  const abs = path.join(uploadsDir, name)

  const before = listUntrackedPagesCmsUploads(uploadsDir, repoRoot)
  if (before.length) {
    failures.push(
      `ignored-pages-cms-probe: baseline already has untracked pages_cms leftovers: ${JSON.stringify(before)}`,
    )
    return { ok: false, failures }
  }

  try {
    fs.mkdirSync(uploadsDir, { recursive: true })
    fs.writeFileSync(abs, Buffer.from(`fake-mp4-probe:${token}`))

    const ignored = spawnSync('git', ['check-ignore', '-q', '--', abs], {
      cwd: repoRoot,
    })
    // *.mp4 is gitignored in this repo — probe should be ignored (status 0).
    if (ignored.status !== 0) {
      failures.push(
        `ignored-pages-cms-probe: expected git check-ignore for ${name} (status=${ignored.status})`,
      )
    }

    const mid = assertNoUntrackedPagesCmsUploads(uploadsDir, repoRoot)
    if (mid.ok || !mid.leftovers.includes(name)) {
      failures.push(
        `ignored-pages-cms-probe: expected FAIL detecting ${name}, got ok=${mid.ok} leftovers=${JSON.stringify(mid.leftovers)}`,
      )
    }
  } finally {
    try {
      if (fs.existsSync(abs)) fs.unlinkSync(abs)
    } catch {
      /* ignore */
    }
  }

  const after = assertNoUntrackedPagesCmsUploads(uploadsDir, repoRoot)
  if (!after.ok) {
    failures.push(
      `ignored-pages-cms-probe: leftovers remain after cleanup: ${JSON.stringify(after.leftovers)}`,
    )
  }

  return { ok: failures.length === 0, failures }
}

/** Paths present in `after` but not in `before` (names only). */
export function uploadsAdded(before, after) {
  return compareUploadsFingerprints(before, after).additions
}

/**
 * Delete only files that appeared after the baseline fingerprint.
 * Does not restore missing/changed baseline files.
 * Returns list of removed relative names.
 */
export function restoreUploadsFingerprint(uploadsDir, beforeFp) {
  const afterFp = uploadsFingerprint(uploadsDir)
  const { additions } = compareUploadsFingerprints(beforeFp, afterFp)
  const removed = []
  for (const name of additions) {
    const abs = path.join(uploadsDir, name)
    try {
      if (fs.existsSync(abs) && fs.lstatSync(abs).isFile()) {
        fs.unlinkSync(abs)
        removed.push(name)
      }
    } catch {
      /* best-effort; caller re-checks fingerprint */
    }
  }
  return removed
}

/**
 * After additions cleanup: require full fingerprint match.
 * @returns {{ ok: boolean, removed: string[], diff: ReturnType<typeof compareUploadsFingerprints> }}
 */
export function cleanupAndAssertUploadsRestored(uploadsDir, beforeFp) {
  const removed = restoreUploadsFingerprint(uploadsDir, beforeFp)
  const afterFp = uploadsFingerprint(uploadsDir)
  const diff = compareUploadsFingerprints(beforeFp, afterFp)
  return { ok: uploadsDiffIsClean(diff), removed, diff }
}

export function gitPorcelain(root) {
  const result = spawnSync('git', ['status', '--porcelain'], {
    cwd: root,
    encoding: 'utf8',
  })
  if (result.status !== 0) {
    throw new Error(`git status --porcelain failed: ${result.stderr || result.stdout}`)
  }
  return String(result.stdout || '')
}

function writePng(abs, payload = PNG_HEADER) {
  fs.writeFileSync(abs, payload)
}

/**
 * Probes:
 * 1) Positive — baseline sentinel preserved while additions (original+derivative) are cleaned.
 * 2) Negative delete sentinel — compare reports missing → expected FAIL signal.
 * 3) Negative change sentinel — compare reports changed → expected FAIL signal.
 * Leaves uploads identical to entry fingerprint.
 */
export function runUploadsCleanupProbe(uploadsDir) {
  const failures = []
  const outerBefore = uploadsFingerprint(uploadsDir)
  const token = `gate_probe_${process.pid}_${Date.now()}`
  const sentinel = `pages_cms_${token}_sentinel.png`
  const original = `pages_cms_${token}.png`
  const derivative = `thumbnail_pages_cms_${token}.png`
  const sentinelAbs = path.join(uploadsDir, sentinel)
  const originalAbs = path.join(uploadsDir, original)
  const derivativeAbs = path.join(uploadsDir, derivative)
  const sentinelBytes = Buffer.concat([PNG_HEADER, Buffer.from(`sentinel:${token}`)])
  const alteredBytes = Buffer.concat([PNG_HEADER, Buffer.from(`altered:${token}`)])

  fs.mkdirSync(uploadsDir, { recursive: true })

  try {
    // --- positive: sentinel in baseline, additions cleaned, sentinel kept ---
    writePng(sentinelAbs, sentinelBytes)
    const baseline = uploadsFingerprint(uploadsDir)
    if (!baseline.has(sentinel)) {
      failures.push('probe: baseline missing sentinel after create')
    }

    writePng(originalAbs)
    writePng(derivativeAbs)
    const mid = uploadsFingerprint(uploadsDir)
    const midDiff = compareUploadsFingerprints(baseline, mid)
    if (
      !midDiff.additions.includes(original) ||
      !midDiff.additions.includes(derivative) ||
      midDiff.missing.length ||
      midDiff.changed.length
    ) {
      failures.push(`probe: expected only original+derivative additions, got ${formatUploadsDiff(midDiff)}`)
    }

    const cleaned = cleanupAndAssertUploadsRestored(uploadsDir, baseline)
    if (!cleaned.removed.includes(original) || !cleaned.removed.includes(derivative)) {
      failures.push(
        `probe: cleanup did not remove original+derivative (${JSON.stringify(cleaned.removed)})`,
      )
    }
    if (fs.existsSync(originalAbs) || fs.existsSync(derivativeAbs)) {
      failures.push('probe: addition files still exist after cleanup')
    }
    if (!cleaned.ok) {
      failures.push(`probe: fingerprint not restored after cleanup (${formatUploadsDiff(cleaned.diff)})`)
    }
    const sentinelMeta = uploadsFingerprint(uploadsDir).get(sentinel)
    const baselineMeta = baseline.get(sentinel)
    if (
      !sentinelMeta ||
      !baselineMeta ||
      sentinelMeta.sha256 !== baselineMeta.sha256 ||
      sentinelMeta.size !== baselineMeta.size
    ) {
      failures.push('probe: cleanup must preserve baseline sentinel content')
    }

    // --- negative: delete sentinel → missing must be detected (not auto-restored) ---
    fs.unlinkSync(sentinelAbs)
    const afterDelete = cleanupAndAssertUploadsRestored(uploadsDir, baseline)
    if (afterDelete.ok || !afterDelete.diff.missing.includes(sentinel)) {
      failures.push(
        `probe-negative-delete: expected FAIL with missing sentinel, got ok=${afterDelete.ok} ${formatUploadsDiff(afterDelete.diff)}`,
      )
    }
    writePng(sentinelAbs, sentinelBytes)

    // --- negative: alter sentinel → changed must be detected (not auto-restored) ---
    writePng(sentinelAbs, alteredBytes)
    const afterChange = cleanupAndAssertUploadsRestored(uploadsDir, baseline)
    if (afterChange.ok || !afterChange.diff.changed.includes(sentinel)) {
      failures.push(
        `probe-negative-change: expected FAIL with changed sentinel, got ok=${afterChange.ok} ${formatUploadsDiff(afterChange.diff)}`,
      )
    }
    writePng(sentinelAbs, sentinelBytes)

    // Sanity: derivative prefixes are the ones Strapi generates (document for gate).
    for (const prefix of DERIVATIVE_PREFIXES) {
      if (!prefix.endsWith('_')) failures.push(`probe: bad derivative prefix ${prefix}`)
    }
  } finally {
    for (const abs of [originalAbs, derivativeAbs, sentinelAbs]) {
      try {
        if (fs.existsSync(abs)) fs.unlinkSync(abs)
      } catch {
        /* ignore */
      }
    }
    const outerAfter = cleanupAndAssertUploadsRestored(uploadsDir, outerBefore)
    if (!outerAfter.ok) {
      failures.push(
        `probe: failed to restore outer uploads fingerprint (${formatUploadsDiff(outerAfter.diff)})`,
      )
    }
  }

  return { ok: failures.length === 0, failures }
}
