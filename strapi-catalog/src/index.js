'use strict';

const fs = require('fs');
const path = require('path');

(function syncDistRuntimeAssetsEarly() {
  const fromSrc = path.join(__dirname, '..', 'scripts', 'prepare-dist.cjs');
  const fromDist = path.join(__dirname, '..', '..', 'scripts', 'prepare-dist.cjs');
  const scriptPath = fs.existsSync(fromSrc) ? fromSrc : fromDist;
  const appRoot = fs.existsSync(fromSrc) ? path.resolve(__dirname, '..') : path.resolve(__dirname, '..', '..');
  try {
    const { syncDistRuntimeAssets } = require(scriptPath);
    syncDistRuntimeAssets(appRoot);
  } catch {
    /* dist ещё не собран или скрипт недоступен — strapi build подставит файлы */
  }
})();

module.exports = {
  register(/*{ strapi }*/) {},

  async bootstrap({ strapi }) {
    const ensureRows = async (uid, rows) => {
      const repo = strapi.db.query(uid);
      const bySlug = new Map();
      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const data = {
          name: row.name,
          slug: row.slug,
          sort_order: i,
          ...(Object.prototype.hasOwnProperty.call(row, 'is_active') ? { is_active: row.is_active } : {}),
        };
        const existing = await repo.findOne({ where: { slug: row.slug } });
        if (existing) {
          const updated = await repo.update({
            where: { id: existing.id },
            data,
          });
          bySlug.set(row.slug, updated);
        } else {
          const created = await repo.create({ data });
          bySlug.set(row.slug, created);
        }
      }
      return bySlug;
    };

    // Синхронно с src/catalog/catalog-sizes.ts (порядок важен для sort_order).
    const standardSizes = [
      '140 × 190',
      '140 × 200',
      '160 × 190',
      '160 × 200',
      '180 × 190',
      '180 × 200',
    ];

    const sizeRepo = strapi.db.query('api::mattress-size.mattress-size');
    const mattressSizeUid = 'api::mattress-size.mattress-size';
    const allowedSlugs = new Set(standardSizes.map((name) => name.replace(/\s*×\s*/g, 'x')));
    await ensureRows(
      mattressSizeUid,
      standardSizes.map((name) => ({ name, slug: name.replace(/\s*×\s*/g, 'x') }))
    );
    const existingSizes = await sizeRepo.findMany({ orderBy: [{ id: 'asc' }] });
    const cleanupKey = 'catalog.mattress-size.current-list-cleanup.v1';
    const coreStore = strapi.db.connection('strapi_core_store_settings');
    const cleanupDone = await coreStore.where({ key: cleanupKey }).first();
    if (!cleanupDone) {
      const previousSeedSizeSlugs = new Set(['80x190', '80x200', '90x190', '90x200', '120x190', '120x200']);
      const obsoleteSizeSlugs = existingSizes
        .map((row) => ({ id: row.id, slug: String(row.slug || '').trim() }))
        .filter((row) => row.slug && previousSeedSizeSlugs.has(row.slug) && !allowedSlugs.has(row.slug));
      for (const row of obsoleteSizeSlugs) {
        await sizeRepo.delete({ where: { id: row.id } });
      }
      await coreStore.insert({
        key: cleanupKey,
        value: JSON.stringify({ completedAt: new Date().toISOString() }),
        type: 'object',
        environment: '',
        tag: '',
      });
      if (obsoleteSizeSlugs.length) {
        strapi.log.info(
          `Catalog bootstrap: removed previous seed mattress-size rows: ${obsoleteSizeSlugs.map((row) => row.slug).join(', ')}`
        );
      }
    }

    const standardFeatures = [
      { name: 'Съемный чехол', slug: 'removableCover' },
      { name: 'Эффект зима-лето', slug: 'winterSummer' },
      { name: 'Усиленный периметр', slug: 'edgeSupport' },
      { name: 'Разная жесткость сторон', slug: 'dualFirmness' },
    ];
    const featureOptionsBySlug = await ensureRows('api::feature-option.feature-option', standardFeatures);

    const featureRepo = strapi.db.query('api::feature-option.feature-option');
    const allowedFeatureSlugs = new Set(standardFeatures.map((row) => row.slug));
    const obsoleteFeatureRows = await featureRepo.findMany({ orderBy: [{ id: 'asc' }] });
    for (const row of obsoleteFeatureRows) {
      const slug = String(row.slug || '').trim();
      if (!slug || allowedFeatureSlugs.has(slug)) continue;
      await featureRepo.delete({ where: { id: row.id } });
      strapi.log.info(`Catalog bootstrap: removed obsolete feature-option slug ${slug}`);
    }

    const firmnessOptions = await ensureRows('api::firmness-option.firmness-option', [
      { name: 'Мягкий', slug: 'soft', is_active: true },
      { name: 'Средний', slug: 'medium', is_active: true },
      { name: 'Жесткий', slug: 'hard', is_active: true },
      { name: 'Разная жесткость сторон', slug: 'dualFirmness', is_active: true },
    ]);
    const mattressTypeOptions = await ensureRows('api::mattress-type-option.mattress-type-option', [
      { name: 'Пружинный', slug: 'spring', is_active: true },
      { name: 'Беспружинный', slug: 'nospring', is_active: true },
      { name: 'Топер', slug: 'topper', is_active: true },
      { name: 'Двухсторонние', slug: 'doubleSided', is_active: true },
      { name: 'Односторонние', slug: 'singleSided', is_active: true },
    ]);
    const loadRangeOptions = await ensureRows('api::load-range-option.load-range-option', [
      { name: 'до 120 кг', slug: 'upTo120', is_active: true },
      { name: 'до 160 кг', slug: 'upTo160', is_active: true },
      { name: 'до 180 кг', slug: 'upTo180', is_active: true },
      { name: 'Без ограничений', slug: 'over160', is_active: true },
    ]);
    const heightRangeOptions = await ensureRows('api::height-range-option.height-range-option', [
      { name: 'Компактные до 16 см', slug: 'low', is_active: true },
      { name: 'Средние 16-22 см', slug: 'mid', is_active: true },
      { name: 'Высокие от 23 см', slug: 'high', is_active: true },
    ]);
    const fillingOptions = await ensureRows('api::filling-option.filling-option', [
      { name: 'Кокосовая койра', slug: 'coir', is_active: true },
      { name: 'Латекс', slug: 'latex', is_active: true },
      { name: 'Орто-пена', slug: 'orthoFoam', is_active: true },
      { name: 'С эффектом памяти', slug: 'memoryEffect', is_active: true },
      { name: 'Нано-пена', slug: 'nanoFoam', is_active: true },
      { name: 'Форплит', slug: 'forplit', is_active: true },
    ]);

    const normalize = (value) => String(value || '').trim().toLowerCase();
    const mapFirmness = (value) => ({
      'мягкий': 'soft',
      'средний': 'medium',
      'жесткий': 'hard',
      'разная жесткость сторон': 'dualFirmness',
      'разная_жесткость_сторон': 'dualFirmness',
    }[normalize(value)] || String(value || '').trim());
    const mapMattressType = (value) => ({
      'пружинный': 'spring',
      'беспружинный': 'nospring',
      'топер': 'topper',
      'двухсторонние': 'doubleSided',
      'односторонние': 'singleSided',
    }[normalize(value)] || String(value || '').trim());
    const mapLoadRange = (value) => ({
      'до_90_кг': 'upTo120',
      'до_110_кг': 'upTo120',
      'до_120_кг': 'upTo120',
      'до_130_кг': 'upTo160',
      'до_150_кг': 'upTo160',
      'до_160_кг': 'upTo160',
      'до_180_кг': 'upTo180',
      'свыше_150_кг': 'over160',
      'свыше_160_кг': 'over160',
      'свыше_180_кг': 'over160',
    }[normalize(value)] || String(value || '').trim());
    const mapHeightRange = (value) => ({
      'низкий': 'low',
      'средний': 'mid',
      'высокий': 'high',
      'компактные_до_16_см': 'low',
      'средние_16_20_см': 'mid',
      'средние_16_22_см': 'mid',
      'высокие_свыше_20_см': 'high',
      'высокие_от_23_см': 'high',
    }[normalize(value)] || String(value || '').trim());
    const normalizeHeightRangeEnum = (value) => ({
      'средние_16_20_см': 'средние_16_22_см',
      'высокие_свыше_20_см': 'высокие_от_23_см',
    }[normalize(value)] || '');
    const mapFilling = (value) => ({
      'кокос': 'coir',
      'кокосовая койра': 'coir',
      'латекс': 'latex',
      'орто_пена': 'orthoFoam',
      'орто-пена': 'orthoFoam',
      'мемори': 'memoryEffect',
      'с эффектом памяти': 'memoryEffect',
      'с_эффектом_памяти': 'memoryEffect',
      'нано_пена': 'nanoFoam',
      'нано-пена': 'nanoFoam',
      'форплит': 'forplit',
    }[normalize(value)] || String(value || '').trim());
    const parseCsv = (value) =>
      String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const productRepo = strapi.db.query('api::product.product');
    const products = await productRepo.findMany({
      populate: {
        firmness_option: true,
        mattress_type_option: true,
        load_range_option: true,
        height_range_option: true,
        filling_options: true,
        features: true,
      },
    });

    const dualFirmnessFeature = featureOptionsBySlug.get('dualFirmness');

    let linkedProducts = 0;
    let dualFirmnessFeatureLinked = 0;
    for (const product of products) {
      const data = {};
      const firmness = firmnessOptions.get(mapFirmness(product.firmness));
      if (!product.firmness_option && firmness) data.firmness_option = firmness.id;

      const mattressType = mattressTypeOptions.get(mapMattressType(product.mattress_type));
      if (!product.mattress_type_option && mattressType) data.mattress_type_option = mattressType.id;

      const loadRange = loadRangeOptions.get(mapLoadRange(product.load_range));
      if (!product.load_range_option && loadRange) data.load_range_option = loadRange.id;

      const heightRange = heightRangeOptions.get(mapHeightRange(product.height_range));
      if (!product.height_range_option && heightRange) data.height_range_option = heightRange.id;
      const normalizedHeightRangeEnum = normalizeHeightRangeEnum(product.height_range);
      if (normalizedHeightRangeEnum) data.height_range = normalizedHeightRangeEnum;

      const hasFillingRelations = Array.isArray(product.filling_options) && product.filling_options.length > 0;
      if (!hasFillingRelations) {
        const fillingIds = parseCsv(product.fillings)
          .map((value) => fillingOptions.get(mapFilling(value))?.id)
          .filter(Boolean);
        if (fillingIds.length) data.filling_options = fillingIds;
      }

      const firmnessSlug =
        product.firmness_option?.slug
        || mapFirmness(product.firmness);
      if (firmnessSlug === 'dualFirmness' && dualFirmnessFeature?.id) {
        const featureRows = Array.isArray(product.features) ? product.features : [];
        const hasDualFirmnessFeature = featureRows.some((row) => row?.slug === 'dualFirmness');
        if (!hasDualFirmnessFeature) {
          const featureIds = featureRows.map((row) => row.id).filter(Boolean);
          data.features = [...featureIds, dualFirmnessFeature.id];
          dualFirmnessFeatureLinked += 1;
        }
      }

      if (Object.keys(data).length) {
        await productRepo.update({
          where: { id: product.id },
          data,
        });
        linkedProducts += 1;
      }
    }

    try {
      const helpRepo = strapi.db.query('api::catalog-filter-help.catalog-filter-help');
      const catalogueFilterHelpSeeds = [
        ['collection', 'Как выбрать коллекцию'],
        ['size', 'Как выбрать размер'],
        ['firmness', 'Как выбрать жёсткость'],
        ['type', 'Как выбрать тип конструкции'],
        ['loadRange', 'Как выбрать нагрузку'],
        ['heightRange', 'Как выбрать высоту матраса'],
        ['fillings', 'Как выбрать наполнитель'],
        ['features', 'Как выбрать особенности'],
      ];
      for (const [filter_key, modal_title] of catalogueFilterHelpSeeds) {
        const existing = await helpRepo.findOne({ where: { filter_key } });
        if (existing) continue;
        await helpRepo.create({
          data: { filter_key, modal_title, is_active: true },
        });
      }
    } catch (e) {
      strapi.log.warn(`Catalog bootstrap: catalog-filter-help seed skipped: ${e.message}`);
    }

    try {
      const shareHelpRepo = strapi.db.query('api::catalog-share-help.catalog-share-help');
      const filterHelpRepo = strapi.db.query('api::catalog-filter-help.catalog-filter-help');
      const catalogueShareHelpSeeds = [
        ['favouritesShare', 'Ссылка на подборку'],
        ['productShare', 'Ссылка на позицию'],
      ];
      const legacyShareKeys = new Set(['favouritesShare', 'productShare']);

      for (const [share_key, modal_title] of catalogueShareHelpSeeds) {
        const existingShare = await shareHelpRepo.findOne({ where: { share_key } });
        if (existingShare) continue;

        const legacy = await filterHelpRepo.findOne({
          where: { filter_key: share_key },
          populate: { segments: true },
        });

        await shareHelpRepo.create({
          data: legacy
            ? {
                share_key,
                modal_title: legacy.modal_title || modal_title,
                segments: legacy.segments,
                is_active: legacy.is_active ?? true,
              }
            : { share_key, modal_title, is_active: true },
        });

        if (legacy?.id) {
          await filterHelpRepo.delete({ where: { id: legacy.id } });
        }
      }

      const staleShareRows = await filterHelpRepo.findMany({
        where: { filter_key: { $in: [...legacyShareKeys] } },
      });
      for (const row of Array.isArray(staleShareRows) ? staleShareRows : []) {
        if (!row?.id) continue;
        await filterHelpRepo.delete({ where: { id: row.id } });
      }
    } catch (e) {
      strapi.log.warn(`Catalog bootstrap: catalog-share-help seed skipped: ${e.message}`);
    }

    try {
      const productsForGallery = await productRepo.findMany({
        populate: {
          media: true,
          gallery: {
            populate: ['slide_image', 'slide_video', 'poster'],
          },
        },
      });
      let galleryBackfilled = 0;
      for (const product of Array.isArray(productsForGallery) ? productsForGallery : []) {
        const galleryRows = Array.isArray(product.gallery) ? product.gallery : [];
        const hasGalleryMedia = galleryRows.some((row) => row?.slide_image || row?.slide_video);
        if (hasGalleryMedia) continue;
        const mediaId = product.media?.id;
        if (!mediaId) continue;
        const altText =
          String(product.media?.alternativeText || '').trim() ||
          (product.name ? `Коллекция ${product.name}` : 'Изображение товара');
        await productRepo.update({
          where: { id: product.id },
          data: {
            gallery: [
              {
                slide_image: mediaId,
                alt_text: altText,
              },
            ],
          },
        });
        galleryBackfilled += 1;
      }
      if (galleryBackfilled) {
        strapi.log.info(`Catalog bootstrap: backfilled product gallery from legacy media for ${galleryBackfilled} products`);
      }
    } catch (e) {
      strapi.log.warn(`Catalog bootstrap: product gallery backfill skipped: ${e.message}`);
    }

    strapi.log.info(`Catalog bootstrap: ensured filter dictionaries and backfilled ${linkedProducts} products (${dualFirmnessFeatureLinked} dual-firmness feature links)`);
  },
};
