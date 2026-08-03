'use strict';

/**
 * Harness-owned Strapi child (Phase 5 D2/D3).
 * Started via child_process.fork — IPC only, no public mutation HTTP.
 *
 * Env:
 *   PORT, HOST, DATABASE_FILENAME (absolute), APP_KEYS, etc.
 * IPC:
 *   { type: 'ping' } → { ok: true, type: 'pong' }
 *   { type: 'mutate-index-solutions-title', token } → { ok, previous }
 *   { type: 'restore-index-solutions-title', value } → { ok }
 *   { type: 'shutdown' } → exit
 */

const path = require('path');
const fs = require('fs');

const strapiRoot = path.resolve(__dirname, '../../strapi-catalog');
const { syncDistRuntimeAssets } = require(path.join(strapiRoot, 'scripts/prepare-dist.cjs'));
const { SLUG_TO_UID } = require(path.join(strapiRoot, 'src/api/pages-cms/utils/map-allowlist'));

let strapiApp = null;

function send(msg) {
  if (process.send) process.send(msg);
}

async function withIndexDoc(fn) {
  const uid = SLUG_TO_UID.index;
  const docs = strapiApp.documents(uid);
  const existing = await docs.findFirst({});
  if (!existing?.documentId) {
    throw new Error('index-page document missing in harness DB');
  }
  return fn(docs, existing);
}

async function handleMessage(msg) {
  const id = msg && msg.id;
  try {
    if (!msg || typeof msg !== 'object') throw new Error('bad message');
    if (msg.type === 'ping') {
      send({ id, ok: true, type: 'pong' });
      return;
    }
    if (msg.type === 'shutdown') {
      send({ id, ok: true, type: 'bye' });
      await shutdown(0);
      return;
    }
    if (msg.type === 'mutate-index-solutions-title') {
      const token = String(msg.token || '');
      if (!token) throw new Error('token required');
      const result = await withIndexDoc(async (docs, existing) => {
        const previous = existing.solutions_title;
        await docs.update({
          documentId: existing.documentId,
          data: { solutions_title: token },
        });
        return { previous };
      });
      send({ id, ok: true, type: 'mutated', previous: result.previous });
      return;
    }
    if (msg.type === 'restore-index-solutions-title') {
      const value = msg.value;
      if (typeof value !== 'string') throw new Error('value string required');
      await withIndexDoc(async (docs, existing) => {
        await docs.update({
          documentId: existing.documentId,
          data: { solutions_title: value },
        });
      });
      send({ id, ok: true, type: 'restored' });
      return;
    }
    throw new Error(`unknown type ${msg.type}`);
  } catch (err) {
    send({ id, ok: false, error: String(err && err.message ? err.message : err) });
  }
}

async function shutdown(code) {
  try {
    if (strapiApp) await strapiApp.destroy();
  } catch {
    /* ignore */
  }
  strapiApp = null;
  process.exit(code);
}

async function main() {
  process.chdir(strapiRoot);
  syncDistRuntimeAssets(strapiRoot);

  // Ensure APP_KEYS etc. exist for programmatic boot
  if (!process.env.APP_KEYS) {
    process.env.APP_KEYS = 'phase5Key1,phase5Key2,phase5Key3,phase5Key4';
  }
  if (!process.env.API_TOKEN_SALT) process.env.API_TOKEN_SALT = 'phase5ApiTokenSalt';
  if (!process.env.ADMIN_JWT_SECRET) process.env.ADMIN_JWT_SECRET = 'phase5AdminJwt';
  if (!process.env.TRANSFER_TOKEN_SALT) process.env.TRANSFER_TOKEN_SALT = 'phase5Transfer';
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'phase5JwtSecret';
  if (!process.env.ENCRYPTION_KEY) {
    process.env.ENCRYPTION_KEY = 'phase5EncryptionKey0123456789ab';
  }

  const { createStrapi } = require(path.join(strapiRoot, 'node_modules/@strapi/strapi'));
  strapiApp = await createStrapi({
    appDir: strapiRoot,
    distDir: path.join(strapiRoot, 'dist'),
  }).load();
  await strapiApp.listen();

  process.on('message', (msg) => {
    handleMessage(msg).catch((err) => {
      send({ ok: false, error: String(err && err.message ? err.message : err) });
    });
  });

  send({
    type: 'ready',
    ok: true,
    port: Number(process.env.PORT || 1337),
    pid: process.pid,
    db: process.env.DATABASE_FILENAME || '',
  });
}

process.on('SIGTERM', () => {
  shutdown(0);
});
process.on('SIGINT', () => {
  shutdown(0);
});

main().catch((err) => {
  console.error('[strapi-harness-child]', err);
  send({ type: 'ready', ok: false, error: String(err && err.message ? err.message : err) });
  process.exit(1);
});
