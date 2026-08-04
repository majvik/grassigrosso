'use strict';
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE_CHROME_SNAPSHOT_NAME = 'site-chrome.snapshot.json';
const SITE_CHROME_MANIFEST_NAME = 'site-chrome-snapshot.manifest.json';
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
const serialize = (data) => `${JSON.stringify(data, null, 2)}\n`;

function verifySiteChromeSnapshotSet(dir) {
  const failures = [];
  const snapshotPath = path.join(dir, SITE_CHROME_SNAPSHOT_NAME);
  const manifestPath = path.join(dir, SITE_CHROME_MANIFEST_NAME);
  if (!fs.existsSync(snapshotPath)) failures.push('missing site chrome snapshot');
  if (!fs.existsSync(manifestPath)) failures.push('missing site chrome manifest');
  if (failures.length) return failures;
  try {
    const text = fs.readFileSync(snapshotPath, 'utf8');
    JSON.parse(text);
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (manifest.file !== SITE_CHROME_SNAPSHOT_NAME) failures.push('manifest file mismatch');
    if (manifest.sha256 !== sha256(text)) failures.push('site chrome sha256 mismatch');
  } catch (error) { failures.push(`site chrome snapshot parse failed: ${error.message}`); }
  return failures;
}

function writeSiteChromeSnapshotAtomic(dir, data, syncedAt = new Date().toISOString()) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-chrome-export-'));
  const names = [SITE_CHROME_SNAPSHOT_NAME, SITE_CHROME_MANIFEST_NAME];
  const backup = new Map();
  try {
    const text = serialize(data);
    fs.writeFileSync(path.join(tmp, SITE_CHROME_SNAPSHOT_NAME), text);
    fs.writeFileSync(path.join(tmp, SITE_CHROME_MANIFEST_NAME), `${JSON.stringify({ syncedAt, file: SITE_CHROME_SNAPSHOT_NAME, sha256: sha256(text) }, null, 2)}\n`);
    const staged = verifySiteChromeSnapshotSet(tmp);
    if (staged.length) throw new Error(staged.join('; '));
    fs.mkdirSync(dir, { recursive: true });
    for (const name of names) backup.set(name, fs.existsSync(path.join(dir, name)) ? fs.readFileSync(path.join(dir, name)) : null);
    try {
      for (const name of names) fs.copyFileSync(path.join(tmp, name), path.join(dir, name));
      const published = verifySiteChromeSnapshotSet(dir);
      if (published.length) throw new Error(published.join('; '));
    } catch (error) {
      for (const [name, content] of backup) content === null ? fs.rmSync(path.join(dir, name), { force: true }) : fs.writeFileSync(path.join(dir, name), content);
      throw error;
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

module.exports = { SITE_CHROME_SNAPSHOT_NAME, SITE_CHROME_MANIFEST_NAME, verifySiteChromeSnapshotSet, writeSiteChromeSnapshotAtomic, sha256, serialize };
