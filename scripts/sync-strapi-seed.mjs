#!/usr/bin/env node
/**
 * Копирует локальную рабочую SQLite Strapi (.tmp/data.db) в database/seed/data.db
 * для коммита и первого старта / принудительного reseed на сервере.
 *
 * Перед копированием: checkpoint WAL (нужен sqlite3 в PATH).
 * Остановите Strapi (npm run dev:stop), чтобы файл не был заблокирован.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strapiRoot = path.join(repoRoot, 'strapi-catalog');
const sourceDb = path.join(strapiRoot, '.tmp', 'data.db');
const targetDb = path.join(strapiRoot, 'database', 'seed', 'data.db');

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

const targetStat = fs.statSync(targetDb);
console.log(`[sync-strapi-seed] OK: ${path.relative(repoRoot, sourceDb)} → ${path.relative(repoRoot, targetDb)}`);
console.log(`[sync-strapi-seed] Размер seed: ${(targetStat.size / 1024).toFixed(1)} KiB`);
console.log('');
console.log('Дальше:');
console.log('  1. git add strapi-catalog/database/seed/data.db strapi-catalog/public/uploads/');
console.log('  2. git commit && git push');
console.log('  3. На dev/prod один раз: STRAPI_RESEED_ON_START=1 → redeploy → убрать переменную');
console.log('     (или в контейнере: cp strapi-catalog/database/seed/data.db /app/data/strapi/data.db && restart)');
