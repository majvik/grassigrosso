'use strict';

/**
 * Node pages CMS proxy: allowlisted GET /api/pages/:slug with fresh TTL,
 * stale retention (still labeled memory-cache), and disk-snapshot fallback.
 */
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const {
  PAGES_CMS_SLUGS,
} = require('../strapi-catalog/src/api/pages-cms/utils/map-allowlist.js');
const {
  DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS,
} = require('../strapi-catalog/src/api/pages-cms/utils/deep-populate.js');
const {
  LEGAL_PAGES_CMS_SLUGS,
  LEGAL_FEED_PATH_BY_SLUG,
} = require('../strapi-catalog/src/api/pages-cms/utils/legal-allowlist.js');
const {
  canonicalizeLegalPageData,
} = require('../strapi-catalog/src/api/pages-cms/utils/legal-page-contract.js');
const {
  normalizeMapIframeHtml,
} = require('../strapi-catalog/src/api/pages-cms/utils/normalize-map-iframe.js');
const { snapshotFilenameForSlug } = require('./pages-cms-snapshots.cjs');

const PAGES_CMS_SOURCES = Object.freeze(['strapi', 'memory-cache', 'disk-snapshot']);

const FEED_PATH_BY_SLUG = Object.freeze({
  index: '/api/index-page-feed',
  hotels: '/api/hotels-page-feed',
  dealers: '/api/dealers-page-feed',
  contacts: '/api/contacts-page-feed',
  documents: '/api/documents-page-feed',
  'download-catalog': '/api/download-catalog-page-feed',
  ...LEGAL_FEED_PATH_BY_SLUG,
});

const CANONICAL_REQUIRED_KEYS = Object.freeze({
  index: ['hero', 'solutions', 'collections', 'testimonials', 'docs'],
  hotels: ['hero', 'stats', 'categories', 'products', 'faq_items'],
  dealers: ['hero', 'stats', 'offers', 'packages', 'faq_items'],
  contacts: ['hero', 'offices', 'contact_info'],
  documents: ['hero', 'certificates', 'company_documents', 'faq_items'],
  'download-catalog': ['title', 'lead', 'submit_label', 'catalog_pdf', 'back_label', 'back_href'],
  privacy: ['title', 'effective_date', 'body'],
  terms: ['title', 'effective_date', 'body'],
  cookies: ['title', 'effective_date', 'body'],
});

function readPagesStrapiCacheTtlMs(isProd) {
  const raw = process.env.PAGES_STRAPI_CACHE_TTL_MS;
  if (raw === undefined || raw === '') return isProd ? 45000 : 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : isProd ? 45000 : 0;
}

function readPagesStrapiCacheStaleMs(isProd) {
  const raw = process.env.PAGES_STRAPI_CACHE_STALE_MS;
  if (raw === undefined || raw === '') return isProd ? 86400000 : 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.max(0, n) : isProd ? 86400000 : 0;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectMapIframePaths(node, prefix, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => collectMapIframePaths(item, `${prefix}[${i}]`, out));
    return;
  }
  if (!isPlainObject(node)) return;
  for (const [key, value] of Object.entries(node)) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    if (key === 'map_iframe_html') out.push(pathKey);
    collectMapIframePaths(value, pathKey, out);
  }
}

/**
 * Usable Strapi/canonical body: plain object, required roots, no source, no HTML map field,
 * download texts isolation; legal pages re-validated via contract canonicalizer.
 */
function isUsableCanonicalPageData(slug, data) {
  if (!PAGES_CMS_SLUGS.includes(slug)) return false;
  if (!isPlainObject(data)) return false;
  if ('source' in data) return false;
  for (const key of CANONICAL_REQUIRED_KEYS[slug] || []) {
    if (!(key in data)) return false;
  }
  if (slug === 'download-catalog') {
    for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) {
      if (key in data) return false;
    }
  }
  const htmlPaths = [];
  collectMapIframePaths(data, '', htmlPaths);
  if (htmlPaths.length) return false;
  if (slug === 'contacts' && Array.isArray(data.offices)) {
    for (const office of data.offices) {
      if (!isPlainObject(office) || !('map_embed_url' in office)) return false;
      const url = office.map_embed_url;
      if (url !== null && typeof url !== 'string') return false;
    }
  }
  if (LEGAL_PAGES_CMS_SLUGS.includes(slug)) {
    try {
      canonicalizeLegalPageData(data);
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Defense in depth: strip any leaked map_iframe_html; re-validate map_embed_url.
 */
function revalidateMapsInCanonical(data) {
  if (Array.isArray(data)) return data.map((item) => revalidateMapsInCanonical(item));
  if (!isPlainObject(data)) return data;

  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'map_iframe_html') {
      out.map_embed_url = normalizeMapIframeHtml(value);
      continue;
    }
    if (key === 'map_embed_url') {
      if (value == null) {
        out.map_embed_url = null;
      } else if (typeof value === 'string') {
        out.map_embed_url = normalizeMapIframeHtml(`<iframe src="${value}"></iframe>`);
      } else {
        out.map_embed_url = null;
      }
      continue;
    }
    out[key] = revalidateMapsInCanonical(value);
  }
  return out;
}

function createPagesCmsApi(options = {}) {
  const isProd = options.isProd === true;
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const strapiUrl = String(options.strapiUrl || process.env.STRAPI_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const ttlMs = readPagesStrapiCacheTtlMs(isProd);
  const staleMs = readPagesStrapiCacheStaleMs(isProd);
  /** Prefer harness/test snapshot dir, then dist/, then public/. */
  const snapshotDirs = [];
  if (options.snapshotDir) snapshotDirs.push(options.snapshotDir);
  const envSnapshotDir = String(process.env.PAGES_CMS_SNAPSHOT_DIR || '').trim();
  if (envSnapshotDir) snapshotDirs.push(envSnapshotDir);
  snapshotDirs.push(path.join(rootDir, 'dist'), path.join(rootDir, 'public'));
  /** @type {Map<string, { expires: number, staleUntil: number, data: object }>} */
  const cache = new Map();

  function cacheKey(slug) {
    return `pages:${slug}`;
  }

  function getCached(slug, { allowStale = false } = {}) {
    const row = cache.get(cacheKey(slug));
    if (!row) return undefined;
    const now = Date.now();
    if (now <= row.expires) return row.data;
    if (allowStale && now <= row.staleUntil) return row.data;
    if (now > row.staleUntil) cache.delete(cacheKey(slug));
    return undefined;
  }

  function setCached(slug, data) {
    if (ttlMs <= 0 && staleMs <= 0) return;
    const now = Date.now();
    const freshMs = ttlMs > 0 ? ttlMs : 0;
    cache.set(cacheKey(slug), {
      expires: now + freshMs,
      staleUntil: now + freshMs + (staleMs > 0 ? staleMs : 0),
      data,
    });
  }

  /** Test/harness: clear in-memory cache. */
  function clearCache() {
    cache.clear();
  }

  /** Test/harness: seed memory without Strapi (stores canonical data only). */
  function seedCache(slug, data, { fresh = true } = {}) {
    const now = Date.now();
    cache.set(cacheKey(slug), {
      expires: fresh ? now + Math.max(ttlMs, 60_000) : now - 1,
      staleUntil: now + Math.max(staleMs, 60_000),
      data,
    });
  }

  function snapshotCandidates(slug) {
    const filename = snapshotFilenameForSlug(slug);
    return snapshotDirs.map((dir) => path.join(dir, filename));
  }

  function readDiskSnapshot(slug) {
    for (const filePath of snapshotCandidates(slug)) {
      if (!fs.existsSync(filePath)) continue;
      let raw;
      try {
        raw = fs.readFileSync(filePath, 'utf8');
      } catch {
        const err = new Error(`Unreadable pages snapshot: ${filePath}`);
        err.code = 'PAGES_SNAPSHOT_CORRUPT';
        throw err;
      }
      try {
        return JSON.parse(raw);
      } catch {
        const err = new Error(`Corrupted pages snapshot JSON: ${filePath}`);
        err.code = 'PAGES_SNAPSHOT_CORRUPT';
        throw err;
      }
    }
    return undefined;
  }

  async function fetchStrapiCanonical(slug) {
    if (!strapiUrl) return null;
    const feedPath = FEED_PATH_BY_SLUG[slug];
    if (!feedPath) return null;
    const response = await axios.get(`${strapiUrl}${feedPath}`, { timeout: 15000 });
    if (response.status < 200 || response.status >= 300) return null;
    const envelope = response.data;
    if (!isPlainObject(envelope) || !('data' in envelope)) return null;
    if ('source' in envelope) return null;
    const data = revalidateMapsInCanonical(envelope.data);
    if (!isUsableCanonicalPageData(slug, data)) return null;
    return data;
  }

  /**
   * @returns {Promise<{ status: number, body: object, source?: string, headers?: Record<string,string> }>}
   */
  async function resolvePage(slug) {
    if (!PAGES_CMS_SLUGS.includes(slug)) {
      return { status: 404, body: { error: 'Unknown page slug', slug } };
    }

    const fresh = getCached(slug, { allowStale: false });
    if (fresh !== undefined) {
      const data = revalidateMapsInCanonical(fresh);
      if (!isUsableCanonicalPageData(slug, data)) {
        cache.delete(cacheKey(slug));
      } else {
        return {
          status: 200,
          body: { data, source: 'memory-cache' },
          source: 'memory-cache',
          headers: { 'X-Pages-Source': 'memory-cache' },
        };
      }
    }

    let strapiError = null;
    try {
      const fromStrapi = await fetchStrapiCanonical(slug);
      if (fromStrapi) {
        setCached(slug, fromStrapi);
        return {
          status: 200,
          body: { data: fromStrapi, source: 'strapi' },
          source: 'strapi',
          headers: { 'X-Pages-Source': 'strapi' },
        };
      }
      // Invalid/empty → do not update cache (N2)
    } catch (error) {
      strapiError = error;
    }

    const staleData = getCached(slug, { allowStale: true });
    if (staleData !== undefined) {
      const data = revalidateMapsInCanonical(staleData);
      if (!isUsableCanonicalPageData(slug, data)) {
        cache.delete(cacheKey(slug));
      } else {
        return {
          status: 200,
          body: { data, source: 'memory-cache' },
          source: 'memory-cache',
          headers: { 'X-Pages-Source': 'memory-cache' },
        };
      }
    }

    try {
      const disk = readDiskSnapshot(slug);
      if (disk !== undefined) {
        const data = revalidateMapsInCanonical(disk);
        if (!isUsableCanonicalPageData(slug, data)) {
          return {
            status: 503,
            body: {
              error: 'Pages disk snapshot failed validation',
              slug,
            },
          };
        }
        return {
          status: 200,
          body: { data, source: 'disk-snapshot' },
          source: 'disk-snapshot',
          headers: { 'X-Pages-Source': 'disk-snapshot' },
        };
      }
    } catch (error) {
      if (error && error.code === 'PAGES_SNAPSHOT_CORRUPT') {
        return {
          status: 503,
          body: {
            error: 'Corrupted pages disk snapshot',
            slug,
            details: error.message,
          },
        };
      }
      throw error;
    }

    return {
      status: 503,
      body: {
        error: 'Pages content unavailable',
        slug,
        details: strapiError
          ? String(strapiError.message || strapiError)
          : 'Strapi unusable and no memory/disk fallback',
      },
    };
  }

  /** Test/harness: inspect cache row. */
  function peekCache(slug) {
    return cache.get(cacheKey(slug)) || null;
  }

  return {
    PAGES_CMS_SLUGS,
    PAGES_CMS_SOURCES,
    FEED_PATH_BY_SLUG,
    ttlMs,
    staleMs,
    snapshotFilenameForSlug,
    isUsableCanonicalPageData,
    revalidateMapsInCanonical,
    resolvePage,
    clearCache,
    seedCache,
    peekCache,
    readDiskSnapshot,
    fetchStrapiCanonical,
  };
}

module.exports = {
  PAGES_CMS_SOURCES,
  FEED_PATH_BY_SLUG,
  snapshotFilenameForSlug,
  createPagesCmsApi,
  isUsableCanonicalPageData,
  revalidateMapsInCanonical,
  readPagesStrapiCacheTtlMs,
  readPagesStrapiCacheStaleMs,
  CANONICAL_REQUIRED_KEYS,
};
