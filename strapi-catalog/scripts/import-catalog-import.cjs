#!/usr/bin/env node
/**
 * Upsert catalog products from docs/catalog-import/ into Strapi.
 * Run: npm run catalog-import:strapi [-- --dry-run] [-- --deactivate-others] [-- --force-media]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { createStrapi } = require('@strapi/strapi');

const strapiRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(strapiRoot, '..');
const importDir = path.join(repoRoot, 'docs/catalog-import');
const productsDir = path.join(importDir, 'products');
const imagesDir = path.join(importDir, 'images');

const COLLECTIONS = [
  { name: 'Classic', slug: 'classic', sort_order: 0 },
  { name: 'Flexi', slug: 'flexi', sort_order: 1 },
  { name: 'Relax', slug: 'relax', sort_order: 2 },
  { name: 'Trend', slug: 'trend', sort_order: 3 },
];

const FIRMNESS_ENUM = {
  soft: 'мягкий',
  medium: 'средний',
  hard: 'жесткий',
  dualFirmness: 'разная_жесткость_сторон',
};

const MATTRESS_TYPE_ENUM = {
  spring: 'пружинный',
  nospring: 'беспружинный',
  topper: 'топер',
  doubleSided: 'двухсторонние',
  singleSided: 'односторонние',
};

const LOAD_RANGE_ENUM = {
  upTo120: 'до_120_кг',
  upTo160: 'до_160_кг',
  upTo180: 'до_180_кг',
  over160: 'свыше_160_кг',
};

const HEIGHT_RANGE_ENUM = {
  low: 'компактные_до_16_см',
  mid: 'средние_16_22_см',
  high: 'высокие_от_23_см',
};

const FILLING_ENUM = {
  coir: 'кокос',
  latex: 'латекс',
  orthoFoam: 'орто_пена',
  memoryEffect: 'с_эффектом_памяти',
  nanoFoam: 'нано_пена',
  forplit: 'форплит',
};

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    deactivateOthers: argv.includes('--deactivate-others'),
    forceMedia: argv.includes('--force-media'),
  };
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;

  const data = {};
  const lines = match[1].split('\n');
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const kv = line.match(/^([a-z_0-9]+):\s*(.*)$/);
    if (!kv) {
      index += 1;
      continue;
    }

    const key = kv[1];
    const raw = kv[2].trim();

    if (raw === '') {
      const items = [];
      index += 1;
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(lines[index].slice(2).trim());
        index += 1;
      }
      data[key] = items;
      continue;
    }

    if (raw === 'null') data[key] = null;
    else if (raw.startsWith('[') && raw.endsWith(']')) {
      data[key] = raw
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
    } else if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      data[key] = raw.slice(1, -1);
    } else if (/^-?\d+$/.test(raw)) {
      data[key] = Number(raw);
    } else {
      data[key] = raw;
    }

    index += 1;
  }

  const body = match[2];
  const coverMatch = body.match(/## Чехол\r?\n([\s\S]*?)(?=\r?\n## |\s*$)/);
  const layersMatch = body.match(/## Наполнение \(полный список для модалки\)\r?\n([\s\S]*?)(?=\r?\n## |\s*$)/);

  data.cover = coverMatch ? coverMatch[1].trim() : '';
  data.layers = layersMatch
    ? layersMatch[1]
        .split('\n')
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
    : [];

  return data;
}

function loadProducts() {
  const files = fs.readdirSync(productsDir).filter((name) => name.endsWith('.md')).sort();
  const products = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(productsDir, file), 'utf8');
    const data = parseFrontmatter(content);
    if (!data?.slug) {
      throw new Error(`Cannot parse ${file}`);
    }
    products.push(data);
  }
  return products;
}

function layersToCatalogText(layers) {
  return (Array.isArray(layers) ? layers : [])
    .map((line, index) => `${index + 1}. ${line}`)
    .join('\n');
}

function slugifyTag(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-zа-яё0-9-]/gi, '');
}

async function ensureCollection(strapi, row, dryRun) {
  const repo = strapi.db.query('api::collection.collection');
  const existing = await repo.findOne({ where: { slug: row.slug } });
  if (existing) return existing;
  if (dryRun) {
    console.log(`[dry-run] would create collection ${row.slug}`);
    return { id: -1, slug: row.slug };
  }
  return repo.create({
    data: {
      name: row.name,
      slug: row.slug,
      sort_order: row.sort_order,
      is_active: true,
    },
  });
}

async function ensureTag(strapi, name, dryRun) {
  const repo = strapi.db.query('api::tag.tag');
  const trimmed = String(name || '').trim();
  if (!trimmed) return null;
  let existing = await repo.findOne({ where: { name: trimmed } });
  if (existing) return existing;
  const slug = slugifyTag(trimmed) || `tag-${Date.now()}`;
  if (dryRun) {
    console.log(`[dry-run] would create tag ${trimmed}`);
    return { id: -1, name: trimmed };
  }
  existing = await repo.findOne({ where: { slug } });
  if (existing) return existing;
  return repo.create({ data: { name: trimmed, slug } });
}

async function uploadProductImage(strapi, imagePath, altText, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would upload ${path.basename(imagePath)}`);
    return { id: -1 };
  }
  const uploadService = strapi.plugin('upload').service('upload');
  const stat = fs.statSync(imagePath);
  const [file] = await uploadService.upload({
    data: {
      fileInfo: {
        name: path.basename(imagePath),
        alternativeText: altText || path.basename(imagePath, path.extname(imagePath)),
      },
    },
    files: {
      filepath: imagePath,
      originalFilename: path.basename(imagePath),
      mimetype: 'image/png',
      type: 'image/png',
      size: stat.size,
    },
  });
  return file;
}

async function buildProductData(strapi, product, lookups, dryRun = false) {
  const {
    collections,
    firmnessOptions,
    mattressTypeOptions,
    loadRangeOptions,
    heightRangeOptions,
    sizeOptions,
    fillingOptions,
    featureOptions,
  } = lookups;

  const collectionSlug = String(product.collection || '').trim();
  const isTopper = collectionSlug === 'topper' || product.mattress_type === 'topper';

  const firmnessSlug = String(product.firmness || 'medium').trim();
  const mattressTypeSlug = String(product.mattress_type || 'nospring').trim();
  const loadRangeSlug = String(product.load_range || 'upTo120').trim();
  const heightRangeSlug = String(product.height_range || 'mid').trim();

  const firmnessOption = firmnessOptions.get(firmnessSlug);
  const mattressTypeOption = mattressTypeOptions.get(mattressTypeSlug);
  const loadRangeOption = loadRangeOptions.get(loadRangeSlug);
  const heightRangeOption = heightRangeOptions.get(heightRangeSlug);

  if (!firmnessOption) throw new Error(`${product.slug}: unknown firmness ${firmnessSlug}`);
  if (!mattressTypeOption) throw new Error(`${product.slug}: unknown mattress_type ${mattressTypeSlug}`);
  if (!loadRangeOption) throw new Error(`${product.slug}: unknown load_range ${loadRangeSlug}`);
  if (!heightRangeOption) throw new Error(`${product.slug}: unknown height_range ${heightRangeSlug}`);

  const sizeSlugs = Array.isArray(product.sizes) ? product.sizes : [];
  const sizeIds = sizeSlugs.map((slug) => {
    const row = sizeOptions.get(String(slug).trim());
    if (!row) throw new Error(`${product.slug}: unknown size ${slug}`);
    return row.id;
  });

  const fillingSlugs = Array.isArray(product.filling_slugs) ? product.filling_slugs : [];
  const fillingIds = fillingSlugs.map((slug) => {
    const row = fillingOptions.get(String(slug).trim());
    if (!row) throw new Error(`${product.slug}: unknown filling ${slug}`);
    return row.id;
  });

  const featureSlugs = Array.isArray(product.features) ? product.features : [];
  const featureIds = featureSlugs.map((slug) => {
    const row = featureOptions.get(String(slug).trim());
    if (!row) throw new Error(`${product.slug}: unknown feature ${slug}`);
    return row.id;
  });

  const tagNames = Array.isArray(product.tags) ? product.tags : [];
  const tagIds = [];
  for (const tagName of tagNames) {
    const tag = await ensureTag(strapi, tagName, dryRun);
    if (tag?.id) tagIds.push(tag.id);
  }

  const firstFillingSlug = fillingSlugs[0] || '';
  const legacyFilling = FILLING_ENUM[firstFillingSlug] || null;

  const data = {
    name: product.name,
    slug: product.slug,
    height_cm: product.height_cm,
    max_load_kg: product.max_load_kg,
    sort_order: product.sort_order ?? 0,
    is_active: true,
    firmness: FIRMNESS_ENUM[firmnessSlug] || 'средний',
    firmness_option: firmnessOption.id,
    mattress_type: MATTRESS_TYPE_ENUM[mattressTypeSlug] || 'беспружинный',
    mattress_type_option: mattressTypeOption.id,
    load_range: LOAD_RANGE_ENUM[loadRangeSlug] || null,
    load_range_option: loadRangeOption.id,
    height_range: HEIGHT_RANGE_ENUM[heightRangeSlug] || null,
    height_range_option: heightRangeOption.id,
    sizes: sizeIds,
    filling_options: fillingIds,
    features: featureIds,
    tags: tagIds,
    cover_description: product.cover || '',
    layers_catalog: layersToCatalogText(product.layers),
  };

  if (legacyFilling) data.fillings = legacyFilling;

  if (isTopper) {
    data.collection = null;
  } else {
    const collection = collections.get(collectionSlug);
    if (!collection) throw new Error(`${product.slug}: unknown collection ${collectionSlug}`);
    data.collection = collection.id;
  }

  return data;
}

async function loadLookups(strapi) {
  const mapRows = async (uid) => {
    const rows = await strapi.db.query(uid).findMany({ orderBy: [{ id: 'asc' }] });
    const map = new Map();
    for (const row of rows) {
      if (row.slug) map.set(String(row.slug).trim(), row);
    }
    return map;
  };

  const collections = new Map();
  for (const row of COLLECTIONS) {
    const created = await ensureCollection(strapi, row, false);
    collections.set(row.slug, created);
  }

  return {
    collections,
    firmnessOptions: await mapRows('api::firmness-option.firmness-option'),
    mattressTypeOptions: await mapRows('api::mattress-type-option.mattress-type-option'),
    loadRangeOptions: await mapRows('api::load-range-option.load-range-option'),
    heightRangeOptions: await mapRows('api::height-range-option.height-range-option'),
    sizeOptions: await mapRows('api::mattress-size.mattress-size'),
    fillingOptions: await mapRows('api::filling-option.filling-option'),
    featureOptions: await mapRows('api::feature-option.feature-option'),
  };
}

async function upsertProduct(strapi, product, lookups, options) {
  const { dryRun, forceMedia } = options;
  const repo = strapi.db.query('api::product.product');
  const existing = await repo.findOne({
    where: { slug: product.slug },
    populate: { media: true },
  });

  const data = await buildProductData(strapi, product, lookups, dryRun);

  const imageRel = String(product.image || '').replace(/^images\//, '');
  const imagePath = path.join(imagesDir, imageRel);
  const hasImage = fs.existsSync(imagePath);
  const altText = product.image_alt || product.name || product.slug;

  let mediaId = existing?.media?.id || null;
  const shouldUpload = hasImage && (forceMedia || !mediaId);

  if (shouldUpload && !dryRun) {
    const uploaded = await uploadProductImage(strapi, imagePath, altText, dryRun);
    mediaId = uploaded?.id || null;
    if (mediaId) {
      data.media = mediaId;
    }
  } else if (shouldUpload && dryRun) {
    console.log(`[dry-run] would upload media for ${product.slug}`);
  }

  if (existing) {
    if (dryRun) {
      console.log(`[dry-run] would update product ${product.slug}`);
      return 'updated';
    }
    await repo.update({ where: { id: existing.id }, data });
    console.log(`updated: ${product.slug}`);
    return 'updated';
  }

  if (dryRun) {
    console.log(`[dry-run] would create product ${product.slug}`);
    return 'created';
  }

  if (hasImage && !mediaId) {
    const uploaded = await uploadProductImage(strapi, imagePath, altText, dryRun);
    mediaId = uploaded?.id || null;
    if (mediaId) {
      data.media = mediaId;
    }
  }

  await repo.create({ data });
  console.log(`created: ${product.slug}`);
  return 'created';
}

async function deactivateOthers(strapi, importSlugs, dryRun) {
  const repo = strapi.db.query('api::product.product');
  const all = await repo.findMany({ select: ['id', 'slug', 'is_active'] });
  let count = 0;
  for (const row of all) {
    const slug = String(row.slug || '').trim();
    if (!slug || importSlugs.has(slug)) continue;
    if (row.is_active === false) continue;
    count += 1;
    if (dryRun) {
      console.log(`[dry-run] would deactivate ${slug}`);
      continue;
    }
    await repo.update({ where: { id: row.id }, data: { is_active: false } });
    console.log(`deactivated: ${slug}`);
  }
  return count;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const products = loadProducts();
  const importSlugs = new Set(products.map((p) => p.slug));

  console.log(`[import-catalog] ${products.length} products from ${productsDir}`);
  if (options.dryRun) console.log('[import-catalog] dry-run mode');

  if (!fs.existsSync(path.join(strapiRoot, 'dist'))) {
    console.error('[import-catalog] dist/ not found — run npm run build --prefix strapi-catalog first');
    process.exit(1);
  }

  process.chdir(strapiRoot);

  const strapi = await createStrapi({
    appDir: strapiRoot,
    distDir: path.join(strapiRoot, 'dist'),
  }).load();

  try {
    const lookups = await loadLookups(strapi);
    let created = 0;
    let updated = 0;

    for (const product of products) {
      const result = await upsertProduct(strapi, product, lookups, options);
      if (result === 'created') created += 1;
      if (result === 'updated') updated += 1;
    }

    let deactivated = 0;
    if (options.deactivateOthers) {
      deactivated = await deactivateOthers(strapi, importSlugs, options.dryRun);
    }

    console.log('');
    console.log(`[import-catalog] done: created=${created}, updated=${updated}, deactivated=${deactivated}`);
  } finally {
    await strapi.destroy();
  }
}

main().catch((error) => {
  console.error('[import-catalog] failed:', error);
  process.exit(1);
});
