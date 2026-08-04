'use strict';

/**
 * Programmatic pages CMS seed into local .tmp/data.db (Phase B).
 * Invoked via createStrapi().load() — not HTTP admin API.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const { PAGES_CMS_SLUGS, SLUG_TO_UID } = require('../../strapi-catalog/src/api/pages-cms/utils/map-allowlist');
const {
  DEEP_POPULATE_BY_SLUG,
  DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS,
} = require('../../strapi-catalog/src/api/pages-cms/utils/deep-populate');
const {
  LEGAL_PAGES_CMS_SLUGS,
  fixtureToStrapiLegalData,
} = require('../../strapi-catalog/src/api/pages-cms/utils/legal-allowlist');

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

function sha256File(filepath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filepath));
  return hash.digest('hex');
}

function mimeFor(filepath) {
  const ext = path.extname(filepath).toLowerCase();
  return MIME_BY_EXT[ext] || 'application/octet-stream';
}

function stableUploadName(contentHash, filepath) {
  const base = path.basename(filepath).replace(/[^\w.\-]+/g, '_');
  return `pages-cms__${contentHash.slice(0, 16)}__${base}`;
}

/**
 * Idempotent upload: lookup by deterministic name (hash + basename).
 * @returns {Promise<number>} numeric upload id
 */
async function findOrUploadByHash(strapi, filepath, fixtureUrl) {
  const contentHash = sha256File(filepath);
  const name = stableUploadName(contentHash, filepath);
  const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name } });
  if (existing?.id != null) return existing.id;

  const stats = fs.statSync(filepath);
  const uploadService = strapi.plugin('upload').service('upload');
  const uploaded = await uploadService.upload({
    data: {
      fileInfo: {
        name,
        alternativeText: fixtureUrl,
        caption: `pages-cms:${contentHash}`,
      },
    },
    files: {
      filepath,
      originalFilename: name,
      mimetype: mimeFor(filepath),
      size: stats.size,
    },
  });
  const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
  if (file?.id == null) throw new Error(`Upload failed for ${fixtureUrl} (${filepath})`);
  return file.id;
}

function isMediaStub(node) {
  return (
    node &&
    typeof node === 'object' &&
    !Array.isArray(node) &&
    typeof node.url === 'string' &&
    node.url.startsWith('/') &&
    Object.keys(node).every((k) =>
      ['url', 'alt', 'alternativeText', 'caption', 'name', 'mime', 'width', 'height', 'size'].includes(k),
    )
  );
}

/**
 * Replace media stubs with numeric upload ids; leave scalars/components otherwise.
 */
function materialize(node, mediaIdsByUrl) {
  if (Array.isArray(node)) return node.map((item) => materialize(item, mediaIdsByUrl));
  if (!node || typeof node !== 'object') return node;
  if (isMediaStub(node)) {
    const id = mediaIdsByUrl[node.url];
    if (id == null) throw new Error(`No upload id for ${node.url}`);
    return id;
  }
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    out[key] = materialize(value, mediaIdsByUrl);
  }
  return out;
}

function textsOnlyDownloadCatalog(fixture) {
  const out = { ...fixture };
  for (const key of DOWNLOAD_CATALOG_TEXTS_FORBIDDEN_KEYS) delete out[key];
  return out;
}

async function upsertPage(strapi, slug, data) {
  const uid = SLUG_TO_UID[slug];
  const populate = DEEP_POPULATE_BY_SLUG[slug];
  const docs = strapi.documents(uid);
  const existing = await docs.findFirst({ populate });
  if (existing?.documentId) {
    await docs.update({ documentId: existing.documentId, data, populate });
  } else {
    await docs.create({ data, populate });
  }
}

async function captureCatalogGuard(strapi) {
  const products = await strapi.db.query('api::product.product').findMany({
    select: ['id', 'documentId', 'slug', 'name'],
    orderBy: { id: 'asc' },
    limit: 500,
  });
  const collections = await strapi.db.query('api::collection.collection').findMany({
    select: ['id', 'documentId', 'slug'],
    orderBy: { id: 'asc' },
    limit: 100,
  });
  return {
    productCount: products.length,
    productSample: products.slice(0, 5).map((p) => ({
      id: p.id,
      documentId: p.documentId,
      slug: p.slug,
    })),
    collectionSample: collections.slice(0, 5).map((c) => ({
      id: c.id,
      documentId: c.documentId,
      slug: c.slug,
    })),
  };
}

async function assertCatalogGuard(strapi, before) {
  const after = await captureCatalogGuard(strapi);
  if (after.productCount !== before.productCount) {
    throw new Error(`Catalog product count changed: ${before.productCount} → ${after.productCount}`);
  }
  const beforeIds = before.productSample.map((p) => p.documentId || String(p.id)).join(',');
  const afterIds = after.productSample.map((p) => p.documentId || String(p.id)).join(',');
  if (beforeIds !== afterIds) {
    throw new Error(`Catalog product sample identities changed:\n before=${beforeIds}\n after=${afterIds}`);
  }
  const beforeCol = before.collectionSample.map((c) => c.documentId || String(c.id)).join(',');
  const afterCol = after.collectionSample.map((c) => c.documentId || String(c.id)).join(',');
  if (beforeCol !== afterCol) {
    throw new Error(`Catalog collection sample identities changed:\n before=${beforeCol}\n after=${afterCol}`);
  }
  return after;
}

async function countPagesCmsUploads(strapi) {
  const rows = await strapi.db.query('plugin::upload.file').findMany({
    where: { name: { $startsWith: 'pages-cms__' } },
    select: ['id', 'name'],
  });
  return rows.length;
}

/**
 * @param {import('@strapi/types').Core.Strapi} strapi
 * @param {{
 *   fixturesBySlug: Record<string, object>,
 *   resolveMedia: (url: string) => { absolutePath: string },
 * }} opts
 */
async function seedPagesCmsFromFixtures(strapi, opts) {
  const {
    fixturesBySlug,
    resolveMedia,
    injectFailureAfterMutation = false,
    injectFailureAfterLegalMutation = false,
  } = opts;
  const catalogBefore = await captureCatalogGuard(strapi);
  const uploadsBefore = await countPagesCmsUploads(strapi);

  /** @type {Map<string, string>} url → absolutePath */
  const pathByUrl = new Map();
  for (const slug of PAGES_CMS_SLUGS) {
    const fixture =
      slug === 'download-catalog'
        ? textsOnlyDownloadCatalog(fixturesBySlug[slug])
        : fixturesBySlug[slug];
    if (!fixture) throw new Error(`Missing fixture for ${slug}`);
    const urls = [];
    ;(function walk(node) {
      if (Array.isArray(node)) return node.forEach(walk);
      if (!node || typeof node !== 'object') return;
      if (isMediaStub(node)) urls.push(node.url);
      Object.values(node).forEach(walk);
    })(fixture);
    for (const url of urls) {
      if (pathByUrl.has(url)) continue;
      const resolved = resolveMedia(url);
      pathByUrl.set(url, resolved.absolutePath);
    }
  }

  /** @type {Record<string, number>} */
  const mediaIdsByUrl = {};
  for (const [url, absolutePath] of pathByUrl.entries()) {
    mediaIdsByUrl[url] = await findOrUploadByHash(strapi, absolutePath, url);
  }

  let mutationStarted = false
  let legalMutationStarted = false
  for (const slug of PAGES_CMS_SLUGS) {
    const raw =
      slug === 'download-catalog'
        ? textsOnlyDownloadCatalog(fixturesBySlug[slug])
        : fixturesBySlug[slug];
    const prepared = LEGAL_PAGES_CMS_SLUGS.includes(slug)
      ? fixtureToStrapiLegalData(raw)
      : raw;
    const data = materialize(prepared, mediaIdsByUrl);
    await upsertPage(strapi, slug, data);
    mutationStarted = true;
    if (LEGAL_PAGES_CMS_SLUGS.includes(slug)) legalMutationStarted = true;
    if (injectFailureAfterMutation) {
      const err = new Error('injected failure after mutation');
      err.code = 'PAGES_CMS_INJECTED_FAILURE';
      throw err;
    }
    if (injectFailureAfterLegalMutation && legalMutationStarted) {
      const err = new Error('injected failure after legal mutation');
      err.code = 'PAGES_CMS_INJECTED_FAILURE';
      throw err;
    }
  }

  const catalogAfter = await assertCatalogGuard(strapi, catalogBefore);
  const uploadsAfter = await countPagesCmsUploads(strapi);

  return {
    slugs: [...PAGES_CMS_SLUGS],
    mediaFiles: pathByUrl.size,
    uploadsBefore,
    uploadsAfter,
    catalog: catalogAfter,
    mutationStarted,
  };
}

module.exports = {
  seedPagesCmsFromFixtures,
  captureCatalogGuard,
  assertCatalogGuard,
  countPagesCmsUploads,
  textsOnlyDownloadCatalog,
  stableUploadName,
  sha256File,
};
