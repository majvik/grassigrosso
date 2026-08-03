'use strict';

/**
 * Read-only SQLite inspectors for Phase B N6 / rollback assertions.
 * Does not start Strapi — safe while :1337 is free.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const PAGE_ENTITY_TABLES = Object.freeze([
  'index_pages',
  'hotels_pages',
  'dealers_pages',
  'contacts_pages',
  'documents_pages',
  'download_catalog_pages',
]);

const PAGE_CMPS_TABLES = Object.freeze([
  'index_pages_cmps',
  'hotels_pages_cmps',
  'dealers_pages_cmps',
  'contacts_pages_cmps',
  'documents_pages_cmps',
  'download_catalog_pages_cmps',
]);

/** component_type → sqlite table */
const COMPONENT_TYPE_TO_TABLE = Object.freeze({
  'page.hero-media': 'components_page_hero_medias',
  'page.hero': 'components_page_heroes',
  'page.solution-card': 'components_page_solution_cards',
  'page.document-card': 'components_page_document_cards',
  'page.collection-card': 'components_page_collection_cards',
  'page.list-item': 'components_page_list_items',
  'page.testimonial': 'components_page_testimonials',
  'page.stat': 'components_page_stats',
  'page.hotel-category': 'components_page_hotel_categories',
  'page.hotel-product': 'components_page_hotel_products',
  'page.discount-row': 'components_page_discount_rows',
  'page.contact-info': 'components_page_contact_infos',
  'page.refresh-feature': 'components_page_refresh_features',
  'page.faq-item': 'components_page_faq_items',
  'page.offer-card': 'components_page_offer_cards',
  'page.geo-city': 'components_page_geo_cities',
  'page.requirement-card': 'components_page_requirement_cards',
  'page.dealer-package': 'components_page_dealer_packages',
  'page.office': 'components_page_offices',
  'catalog.hero-slide': 'components_catalog_hero_slides',
});

function openDb(dbPath) {
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

function listPageComponentTables(db) {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'components_page_%' ORDER BY name",
    )
    .all()
    .map((r) => r.name);
}

function countRows(db, table) {
  return db.prepare(`SELECT COUNT(*) AS c FROM "${table}"`).get().c;
}

function countPageComponentRows(dbPath) {
  const db = openDb(dbPath);
  try {
    const counts = {};
    let total = 0;
    for (const table of listPageComponentTables(db)) {
      const c = countRows(db, table);
      counts[table] = c;
      total += c;
    }
    return { counts, total };
  } finally {
    db.close();
  }
}

function findOrphanPageComponents(dbPath) {
  const db = openDb(dbPath);
  try {
    /** @type {Set<string>} */
    const referenced = new Set();

    const linkTables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%_pages_cmps' OR name LIKE 'components_page_%_cmps') ORDER BY name",
      )
      .all()
      .map((r) => r.name);

    for (const cmps of linkTables) {
      const rows = db.prepare(`SELECT cmp_id, component_type FROM "${cmps}"`).all();
      for (const row of rows) {
        if (row.cmp_id == null || !row.component_type) continue;
        referenced.add(`${row.component_type}:${row.cmp_id}`);
      }
    }

    /** @type {Array<{ table: string, id: number, componentType: string }>} */
    const orphans = [];
    for (const [componentType, table] of Object.entries(COMPONENT_TYPE_TO_TABLE)) {
      // Phase B N6 scopes orphans to page.* components (not catalog slides owned by slides feed).
      if (!componentType.startsWith('page.')) continue;
      if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table)) continue;
      const ids = db.prepare(`SELECT id FROM "${table}"`).all().map((r) => r.id);
      for (const id of ids) {
        if (!referenced.has(`${componentType}:${id}`)) {
          orphans.push({ table, id, componentType });
        }
      }
    }
    return orphans;
  } finally {
    db.close();
  }
}

function countPagesCmsUploadRows(dbPath) {
  const db = openDb(dbPath);
  try {
    return db.prepare("SELECT COUNT(*) AS c FROM files WHERE name LIKE 'pages-cms__%'").get().c;
  } finally {
    db.close();
  }
}

function listPagesCmsUploadRows(dbPath) {
  const db = openDb(dbPath);
  try {
    return db
      .prepare(
        "SELECT id, name, url, hash FROM files WHERE name LIKE 'pages-cms__%' ORDER BY name ASC",
      )
      .all();
  } finally {
    db.close();
  }
}

function catalogGuardFromDb(dbPath) {
  const db = openDb(dbPath);
  try {
    const products = db
      .prepare(
        'SELECT id, document_id AS documentId, slug FROM products ORDER BY id ASC LIMIT 5',
      )
      .all();
    const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
    const collections = db
      .prepare(
        'SELECT id, document_id AS documentId, slug FROM collections ORDER BY id ASC LIMIT 5',
      )
      .all();
    return {
      productCount,
      productSample: products,
      collectionSample: collections,
    };
  } finally {
    db.close();
  }
}

const VOLATILE_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'created_by_id',
  'updated_by_id',
  'published_at',
]);

/** Root table → link table + Strapi morph related_type for root media. */
const PAGE_TABLE_META = Object.freeze([
  {
    table: 'index_pages',
    cmps: 'index_pages_cmps',
    relatedType: 'api::index-page.index-page',
  },
  {
    table: 'hotels_pages',
    cmps: 'hotels_pages_cmps',
    relatedType: 'api::hotels-page.hotels-page',
  },
  {
    table: 'dealers_pages',
    cmps: 'dealers_pages_cmps',
    relatedType: 'api::dealers-page.dealers-page',
  },
  {
    table: 'contacts_pages',
    cmps: 'contacts_pages_cmps',
    relatedType: 'api::contacts-page.contacts-page',
  },
  {
    table: 'documents_pages',
    cmps: 'documents_pages_cmps',
    relatedType: 'api::documents-page.documents-page',
  },
  {
    table: 'download_catalog_pages',
    cmps: 'download_catalog_pages_cmps',
    relatedType: 'api::download-catalog-page.download-catalog-page',
  },
]);

function tableExists(db, table) {
  return Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table));
}

function stableColumnNames(db, table, { keepId = false } = {}) {
  return db
    .prepare(`PRAGMA table_info("${table}")`)
    .all()
    .map((c) => c.name)
    .filter((name) => {
      if (VOLATILE_COLUMNS.has(name) && !(keepId && name === 'id')) return false;
      return true;
    })
    .sort();
}

function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function fileIdentity(db, fileId) {
  if (fileId == null || !tableExists(db, 'files')) return null;
  const row = db.prepare('SELECT name, hash, url FROM files WHERE id = ?').get(fileId);
  if (!row) return { fileId };
  return { name: row.name, hash: row.hash, url: row.url };
}

function mediaBindings(db, relatedType, relatedId) {
  if (!tableExists(db, 'files_related_mph')) return [];
  return db
    .prepare(
      `SELECT file_id, field, "order" AS ord
       FROM files_related_mph
       WHERE related_type = ? AND related_id = ?
       ORDER BY field ASC, ord ASC, file_id ASC`,
    )
    .all(relatedType, relatedId)
    .map((row) => ({
      field: row.field,
      order: row.ord,
      file: fileIdentity(db, row.file_id),
    }));
}

function componentScalars(db, componentType, cmpId) {
  const table = COMPONENT_TYPE_TO_TABLE[componentType];
  if (!table || !tableExists(db, table)) {
    return { __missing: true, componentType, cmpId };
  }
  const cols = stableColumnNames(db, table); // strips id
  const row = db
    .prepare(`SELECT ${cols.map((c) => `"${c}"`).join(', ')} FROM "${table}" WHERE id = ?`)
    .get(cmpId);
  if (!row) return { __missing: true, componentType, cmpId };
  const out = {};
  for (const col of cols) out[col] = row[col] ?? null;
  return out;
}

/**
 * Content-addressed component node: scalars + nested links + media (by file identity, not row ids).
 */
function logicalComponentNode(db, componentType, cmpId, seen = new Set()) {
  const key = `${componentType}:${cmpId}`;
  if (seen.has(key)) return { __cycle: key };
  seen.add(key);

  const table = COMPONENT_TYPE_TO_TABLE[componentType];
  const scalars = componentScalars(db, componentType, cmpId);
  const media = mediaBindings(db, componentType, cmpId);

  /** @type {Array<object>} */
  const children = [];
  if (table) {
    const nestedCmps = `${table}_cmps`;
    if (tableExists(db, nestedCmps)) {
      const links = db
        .prepare(
          `SELECT cmp_id, component_type, field, "order" AS ord
           FROM "${nestedCmps}"
           WHERE entity_id = ?
           ORDER BY field ASC, ord ASC, component_type ASC, cmp_id ASC`,
        )
        .all(cmpId);
      for (const link of links) {
        children.push({
          field: link.field,
          order: link.ord,
          componentType: link.component_type,
          component: logicalComponentNode(db, link.component_type, link.cmp_id, seen),
        });
      }
    }
  }

  return { componentType, scalars, media, children };
}

function rootScalars(db, table) {
  if (!tableExists(db, table)) return null;
  const cols = stableColumnNames(db, table);
  const row = db.prepare(`SELECT ${cols.map((c) => `"${c}"`).join(', ')} FROM "${table}" LIMIT 1`).get();
  if (!row) return null;
  const out = {};
  for (const col of cols) out[col] = row[col] ?? null;
  return out;
}

/**
 * Logical snapshot of six pages: root values + link-ordered component trees + media identities.
 * Surrogate row ids / cmp_ids are excluded so seed×2 (Strapi recreates component rows) stays stable
 * while value drift or incomplete rollback still fails the digest.
 */
function pageLogicalSnapshot(dbPath) {
  const db = openDb(dbPath);
  try {
    /** @type {Record<string, object>} */
    const pages = {};
    for (const meta of PAGE_TABLE_META) {
      const root = rootScalars(db, meta.table);
      const rootIdRow = tableExists(db, meta.table)
        ? db.prepare(`SELECT id FROM "${meta.table}" LIMIT 1`).get()
        : null;
      const rootId = rootIdRow?.id;

      /** @type {Array<object>} */
      const components = [];
      if (rootId != null && tableExists(db, meta.cmps)) {
        const links = db
          .prepare(
            `SELECT cmp_id, component_type, field, "order" AS ord
             FROM "${meta.cmps}"
             WHERE entity_id = ?
             ORDER BY field ASC, ord ASC, component_type ASC, cmp_id ASC`,
          )
          .all(rootId);
        for (const link of links) {
          components.push({
            field: link.field,
            order: link.ord,
            componentType: link.component_type,
            component: logicalComponentNode(db, link.component_type, link.cmp_id),
          });
        }
      }

      const rootMedia = rootId != null ? mediaBindings(db, meta.relatedType, rootId) : [];
      pages[meta.table] = { root, rootMedia, components };
    }

    /**
     * Global multiset of page-component scalar payloads (no ids), catches value edits
     * even if link topology were somehow unchanged.
     */
    const componentValueBag = {};
    for (const table of listPageComponentTables(db).filter((name) => !name.endsWith('_cmps'))) {
      const cols = stableColumnNames(db, table);
      if (cols.length === 0) {
        componentValueBag[table] = [];
        continue;
      }
      const rows = db.prepare(`SELECT ${cols.map((c) => `"${c}"`).join(', ')} FROM "${table}"`).all();
      componentValueBag[table] = rows
        .map((row) => {
          const out = {};
          for (const col of cols) out[col] = row[col] ?? null;
          return out;
        })
        .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }

    return { pages, componentValueBag };
  } finally {
    db.close();
  }
}

/**
 * Digests over content-addressed logical snapshot (roots + links + component values + media).
 */
function pageEntityDigests(dbPath) {
  const snapshot = pageLogicalSnapshot(dbPath);
  /** @type {Record<string, string>} */
  const byPage = {};
  for (const [table, tree] of Object.entries(snapshot.pages)) {
    byPage[table] = sha256Json(tree);
  }
  return {
    overall: sha256Json(snapshot),
    byPage,
    componentValueBag: sha256Json(snapshot.componentValueBag),
  };
}

function snapshotUploadsFs(uploadsDir) {
  if (!fs.existsSync(uploadsDir)) return [];
  return fs
    .readdirSync(uploadsDir)
    .filter((name) => name.includes('pages_cms_'))
    .sort();
}

function removeUploadFsDiff(uploadsDir, beforeNames) {
  const before = new Set(beforeNames);
  const after = snapshotUploadsFs(uploadsDir);
  const removed = [];
  for (const name of after) {
    if (before.has(name)) continue;
    fs.unlinkSync(path.join(uploadsDir, name));
    removed.push(name);
  }
  return removed;
}

module.exports = {
  PAGE_ENTITY_TABLES,
  PAGE_CMPS_TABLES,
  COMPONENT_TYPE_TO_TABLE,
  countPageComponentRows,
  findOrphanPageComponents,
  countPagesCmsUploadRows,
  listPagesCmsUploadRows,
  catalogGuardFromDb,
  pageLogicalSnapshot,
  pageEntityDigests,
  snapshotUploadsFs,
  removeUploadFsDiff,
};
