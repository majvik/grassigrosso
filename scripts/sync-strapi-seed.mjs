#!/usr/bin/env node
/**
 * Копирует локальную рабочую SQLite Strapi (.tmp/data.db) в database/seed/data.db
 * для коммита и первого старта / принудительного reseed на сервере.
 *
 * Перед копированием: checkpoint WAL (нужен sqlite3 в PATH).
 * Остановите Strapi (npm run dev:stop), чтобы файл не был заблокирован.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strapiRoot = path.join(repoRoot, 'strapi-catalog');
const sourceDb = path.join(strapiRoot, '.tmp', 'data.db');
const targetDb = path.join(strapiRoot, 'database', 'seed', 'data.db');
const manifestPath = path.join(strapiRoot, 'database', 'seed', 'seed-manifest.json');

function fail(message) {
  console.error(`[sync-strapi-seed] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(sourceDb)) {
  fail(
    `Не найден ${path.relative(repoRoot, sourceDb)}. Запустите Strapi локально и сохраните контент в админке.`
  );
}

const stat = fs.statSync(sourceDb);
if (!stat.isFile() || stat.size < 1024) {
  fail('Исходная БД слишком мала или пуста.');
}

const sqlite3 = spawnSync('sqlite3', ['--version'], { encoding: 'utf8' });
if (sqlite3.status === 0) {
  const checkpoint = spawnSync(
    'sqlite3',
    [sourceDb, 'PRAGMA wal_checkpoint(TRUNCATE);'],
    { encoding: 'utf8' }
  );
  if (checkpoint.status !== 0) {
    fail(
      `sqlite3 checkpoint не удался: ${checkpoint.stderr || checkpoint.stdout || 'unknown error'}`
    );
  }
} else {
  console.warn(
    '[sync-strapi-seed] sqlite3 не найден — копируем без WAL checkpoint (остановите Strapi перед sync).'
  );
}

fs.mkdirSync(path.dirname(targetDb), { recursive: true });
fs.copyFileSync(sourceDb, targetDb);

const dbBuffer = fs.readFileSync(targetDb);
const sha256 = crypto.createHash('sha256').update(dbBuffer).digest('hex');
const syncedAt = new Date().toISOString();
const manifest = {
  sha256,
  bytes: dbBuffer.length,
  syncedAt,
};
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const targetStat = fs.statSync(targetDb);
console.log(`[sync-strapi-seed] OK: ${path.relative(repoRoot, sourceDb)} → ${path.relative(repoRoot, targetDb)}`);
console.log(`[sync-strapi-seed] Размер seed: ${(targetStat.size / 1024).toFixed(1)} KiB`);
console.log(`[sync-strapi-seed] Manifest: ${path.relative(repoRoot, manifestPath)} (${sha256.slice(0, 12)}…)`);
console.log('');
console.log('Дальше:');
console.log('  1. git add strapi-catalog/database/seed/data.db strapi-catalog/database/seed/seed-manifest.json');
console.log('     и при новых файлах: strapi-catalog/public/uploads/');
console.log('  2. git commit && git push — на Timeweb достаточно одного деплоя (seed подхватится сам)');
console.log('  Принудительно: STRAPI_RESEED_ON_START=1 (тоже вызовет redeploy при смене env)');
