'use strict';
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { canonicalizeSiteChrome } = require('../strapi-catalog/src/api/pages-cms/utils/site-chrome-contract.js');
const { SITE_CHROME_SNAPSHOT_NAME } = require('./site-chrome-snapshots.cjs');

function createSiteChromeApi(options = {}) {
  const isProd = options.isProd === true;
  const strapiUrl = String(options.strapiUrl || process.env.STRAPI_URL || '').replace(/\/+$/, '');
  const ttlMs = Number(process.env.PAGES_STRAPI_CACHE_TTL_MS ?? (isProd ? 45000 : 0));
  const staleMs = Number(process.env.PAGES_STRAPI_CACHE_STALE_MS ?? (isProd ? 86400000 : 0));
  const dirs = [options.snapshotDir, process.env.PAGES_CMS_SNAPSHOT_DIR, path.join(options.rootDir || path.resolve(__dirname, '..'), 'dist'), path.join(options.rootDir || path.resolve(__dirname, '..'), 'public')].filter(Boolean);
  let cache = null;
  const canonical = (value) => { try { return canonicalizeSiteChrome(value); } catch { return null; } };
  const store = (data) => { const now = Date.now(); cache = { data, expires: now + Math.max(0, ttlMs), staleUntil: now + Math.max(0, ttlMs) + Math.max(0, staleMs) }; };
  async function resolve() {
    const now = Date.now();
    if (cache && now <= cache.expires) return response(cache.data, 'memory-cache');
    let error;
    try {
      if (strapiUrl) {
        const result = await axios.get(`${strapiUrl}/api/site-chrome-feed`, { timeout: 15000 });
        const data = result.data && !result.data.source ? canonical(result.data.data) : null;
        if (data) { store(data); return response(data, 'strapi'); }
      }
    } catch (caught) { error = caught; }
    if (cache && now <= cache.staleUntil) return response(cache.data, 'memory-cache');
    for (const dir of dirs) {
      const file = path.join(dir, SITE_CHROME_SNAPSHOT_NAME);
      if (!fs.existsSync(file)) continue;
      try {
        const data = canonical(JSON.parse(fs.readFileSync(file, 'utf8')));
        return data ? response(data, 'disk-snapshot') : unavailable('Site chrome snapshot failed validation');
      } catch { return unavailable('Corrupted site chrome snapshot'); }
    }
    return unavailable(error ? String(error.message || error) : 'Site chrome unavailable');
  }
  function response(data, source) { return { status: 200, body: { data, source }, source, headers: { 'X-Pages-Source': source } }; }
  function unavailable(details) { return { status: 503, body: { error: 'Site chrome unavailable', details } }; }
  return { resolve, clearCache: () => { cache = null; }, seedCache: (data, fresh = true) => { const now = Date.now(); cache = { data: canonicalizeSiteChrome(data), expires: fresh ? now + 60000 : now - 1, staleUntil: now + 60000 }; } };
}
module.exports = { createSiteChromeApi };
