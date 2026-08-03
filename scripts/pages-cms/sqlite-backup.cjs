'use strict';

/**
 * SQLite-safe backup/restore for Strapi local DB (.tmp/data.db + WAL/SHM).
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_SIDECARS = ['', '-wal', '-shm'];

function dbSidecarPaths(dbPath) {
  return DB_SIDECARS.map((suffix) => `${dbPath}${suffix}`);
}

function removeDbSidecars(dbPath) {
  for (const file of dbSidecarPaths(dbPath)) {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
}

/**
 * Create a consistent backup via better-sqlite3 async backup API (includes WAL).
 * @returns {Promise<{ backupPath: string, lastPath: string }>}
 */
async function createSqliteBackup(dbPath, backupDir, label = 'pages-cms-seed') {
  if (!fs.existsSync(dbPath)) throw new Error(`Missing DB: ${dbPath}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `data.db.before-${label}.${stamp}`);
  const lastPath = path.join(backupDir, `data.db.last-before-${label}`);

  const src = new Database(dbPath);
  try {
    try {
      src.pragma('wal_checkpoint(TRUNCATE)');
    } catch {
      // backup API still produces a consistent snapshot
    }
    await src.backup(backupPath);
  } finally {
    src.close();
  }

  if (!fs.existsSync(backupPath)) {
    throw new Error(`SQLite backup did not create file: ${backupPath}`);
  }
  fs.copyFileSync(backupPath, lastPath);
  return { backupPath, lastPath };
}

/**
 * Restore DB from a backup file: replace data.db and clear WAL/SHM sidecars.
 */
function restoreSqliteBackup(dbPath, backupPath) {
  if (!fs.existsSync(backupPath)) throw new Error(`Backup not found: ${backupPath}`);
  removeDbSidecars(dbPath);
  fs.copyFileSync(backupPath, dbPath);
  for (const suffix of ['-wal', '-shm']) {
    const side = `${dbPath}${suffix}`;
    if (fs.existsSync(side)) fs.unlinkSync(side);
  }
}

module.exports = {
  createSqliteBackup,
  restoreSqliteBackup,
  removeDbSidecars,
  dbSidecarPaths,
};
