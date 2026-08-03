'use strict';

/**
 * Pages CMS disk snapshot helpers (shared by exporter, Node runtime, and gates).
 */
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { PAGES_CMS_SLUGS } = require('../strapi-catalog/src/api/pages-cms/utils/map-allowlist.js');

const PAGES_SNAPSHOT_MANIFEST_NAME = 'pages-snapshot.manifest.json';

function snapshotFilenameForSlug(slug) {
  return `pages-${slug}.snapshot.json`;
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function serializeCanonicalSnapshot(canonical) {
  return `${JSON.stringify(canonical, null, 2)}\n`;
}

/**
 * Verify manifest + per-slug snapshot files (N5).
 * @param {{
 *   manifestPath: string,
 *   snapshotsDir: string,
 *   expectedSlugs?: string[],
 * }} opts
 * @returns {string[]} failures (empty = ok)
 */
function verifyPagesSnapshotSet(opts) {
  const { manifestPath, snapshotsDir } = opts;
  const expectedSlugs = opts.expectedSlugs || [...PAGES_CMS_SLUGS];
  /** @type {string[]} */
  const failures = [];

  if (!fs.existsSync(manifestPath)) {
    failures.push(`missing manifest: ${manifestPath}`);
    return failures;
  }

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    failures.push(`manifest JSON parse failed: ${error.message}`);
    return failures;
  }

  if (!Array.isArray(manifest.slugs)) {
    failures.push('manifest.slugs missing or not an array');
  }
  if (!manifest.sha256BySlug || typeof manifest.sha256BySlug !== 'object') {
    failures.push('manifest.sha256BySlug missing');
  }

  const slugs = Array.isArray(manifest.slugs) ? manifest.slugs : [];
  if (expectedSlugs.length) {
    const expected = expectedSlugs.join(',');
    const actual = slugs.join(',');
    if (expected !== actual) {
      failures.push(`manifest.slugs mismatch: expected [${expected}] got [${actual}]`);
    }
    for (const slug of expectedSlugs) {
      if (!slugs.includes(slug)) failures.push(`manifest missing expected slug: ${slug}`);
    }
  }

  for (const slug of slugs) {
    const file = path.join(snapshotsDir, snapshotFilenameForSlug(slug));
    if (!fs.existsSync(file)) {
      failures.push(`missing snapshot file for ${slug}`);
      continue;
    }
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (error) {
      failures.push(`unreadable snapshot for ${slug}: ${error.message}`);
      continue;
    }
    const actual = sha256Text(text);
    const expected = manifest.sha256BySlug?.[slug];
    if (!expected) {
      failures.push(`manifest sha256 missing for ${slug}`);
    } else if (actual !== expected) {
      failures.push(`N5 sha256 mismatch for ${slug}`);
    }
  }

  return failures;
}

function listPagesSnapshotFilenames(slugs = PAGES_CMS_SLUGS) {
  return [...slugs.map((slug) => snapshotFilenameForSlug(slug)), PAGES_SNAPSHOT_MANIFEST_NAME];
}

function fingerprintPagesSnapshotDir(dir, slugs = PAGES_CMS_SLUGS) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const name of listPagesSnapshotFilenames(slugs)) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      out[name] = '';
      continue;
    }
    out[name] = sha256Text(fs.readFileSync(file, 'utf8'));
  }
  return out;
}

/**
 * Build snapshot file texts + manifest from already-validated canonical payloads.
 * @param {Record<string, object>} canonicalBySlug
 * @param {{ syncedAt?: string, slugs?: string[] }} [opts]
 */
function buildPagesSnapshotArtifacts(canonicalBySlug, opts = {}) {
  const slugs = opts.slugs || [...PAGES_CMS_SLUGS];
  /** @type {Record<string, string>} */
  const files = {};
  /** @type {Record<string, string>} */
  const hashes = {};

  for (const slug of slugs) {
    if (!canonicalBySlug[slug]) {
      throw new Error(`missing canonical data for slug: ${slug}`);
    }
    const text = serializeCanonicalSnapshot(canonicalBySlug[slug]);
    const filename = snapshotFilenameForSlug(slug);
    files[filename] = text;
    hashes[slug] = sha256Text(text);
  }

  const manifest = {
    syncedAt: opts.syncedAt || new Date().toISOString(),
    slugs: [...slugs],
    sha256BySlug: hashes,
  };
  const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
  files[PAGES_SNAPSHOT_MANIFEST_NAME] = manifestText;

  return { files, manifest, hashes };
}

function copyIfExists(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function restoreDirFiles(fromDir, toDir, filenames) {
  fs.mkdirSync(toDir, { recursive: true });
  for (const name of filenames) {
    const src = path.join(fromDir, name);
    const dest = path.join(toDir, name);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    } else if (fs.existsSync(dest)) {
      fs.unlinkSync(dest);
    }
  }
}

/**
 * Write snapshots atomically:
 * validate artifacts in temp → verify hashes → swap into publicDir with rollback.
 *
 * @param {string} publicDir
 * @param {Record<string, object>} canonicalBySlug
 * @param {{ syncedAt?: string, slugs?: string[] }} [opts]
 */
function writePagesSnapshotsAtomic(publicDir, canonicalBySlug, opts = {}) {
  const slugs = opts.slugs || [...PAGES_CMS_SLUGS];
  const filenames = listPagesSnapshotFilenames(slugs);
  const artifacts = buildPagesSnapshotArtifacts(canonicalBySlug, { ...opts, slugs });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-cms-export-'));
  const backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-cms-export-bak-'));
  let published = false;

  try {
    for (const [filename, text] of Object.entries(artifacts.files)) {
      fs.writeFileSync(path.join(tmpDir, filename), text, 'utf8');
    }

    const stagingFails = verifyPagesSnapshotSet({
      manifestPath: path.join(tmpDir, PAGES_SNAPSHOT_MANIFEST_NAME),
      snapshotsDir: tmpDir,
      expectedSlugs: slugs,
    });
    if (stagingFails.length) {
      throw new Error(`staging snapshot verify failed:\n - ${stagingFails.join('\n - ')}`);
    }

    for (const name of filenames) {
      copyIfExists(path.join(publicDir, name), path.join(backupDir, name));
    }

    fs.mkdirSync(publicDir, { recursive: true });
    for (const name of filenames) {
      fs.copyFileSync(path.join(tmpDir, name), path.join(publicDir, name));
    }
    published = true;

    const publishedFails = verifyPagesSnapshotSet({
      manifestPath: path.join(publicDir, PAGES_SNAPSHOT_MANIFEST_NAME),
      snapshotsDir: publicDir,
      expectedSlugs: slugs,
    });
    if (publishedFails.length) {
      restoreDirFiles(backupDir, publicDir, filenames);
      throw new Error(`published snapshot verify failed (rolled back):\n - ${publishedFails.join('\n - ')}`);
    }

    return {
      manifest: artifacts.manifest,
      hashes: artifacts.hashes,
      publicDir,
    };
  } catch (error) {
    if (published) {
      try {
        restoreDirFiles(backupDir, publicDir, filenames);
      } catch (restoreError) {
        error.message += `; rollback also failed: ${restoreError.message}`;
      }
    }
    throw error;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
}

module.exports = {
  PAGES_SNAPSHOT_MANIFEST_NAME,
  PAGES_CMS_SLUGS,
  snapshotFilenameForSlug,
  sha256Text,
  serializeCanonicalSnapshot,
  verifyPagesSnapshotSet,
  listPagesSnapshotFilenames,
  fingerprintPagesSnapshotDir,
  buildPagesSnapshotArtifacts,
  writePagesSnapshotsAtomic,
};
