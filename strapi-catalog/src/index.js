'use strict';

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
      '80 × 190',
      '80 × 200',
      '90 × 190',
      '90 × 200',
      '120 × 190',
      '120 × 200',
      '140 × 190',
      '140 × 200',
      '160 × 190',
      '180 × 190',
      '160 × 200',
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
    const obsoleteSizeSlugs = existingSizes
      .map((row) => String(row.slug || '').trim())
      .filter((slug) => slug && !allowedSlugs.has(slug));
    if (obsoleteSizeSlugs.length) {
      strapi.log.warn(
        `Catalog bootstrap: obsolete mattress-size rows remain in DB and are ignored by storefront feed: ${obsoleteSizeSlugs.join(', ')}`
      );
    }

    const standardFeatures = [
      { name: 'Съемный чехол', slug: 'removableCover' },
      { name: 'Эффект зима-лето', slug: 'winterSummer' },
      { name: 'Усиленный периметр', slug: 'edgeSupport' },
    ];
    await ensureRows('api::feature-option.feature-option', standardFeatures);

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
      { name: 'Средние 16-20 см', slug: 'mid', is_active: true },
      { name: 'Высокие свыше 20 см', slug: 'high', is_active: true },
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
      'высокие_свыше_20_см': 'high',
    }[normalize(value)] || String(value || '').trim());
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
      },
    });

    let linkedProducts = 0;
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

      const hasFillingRelations = Array.isArray(product.filling_options) && product.filling_options.length > 0;
      if (!hasFillingRelations) {
        const fillingIds = parseCsv(product.fillings)
          .map((value) => fillingOptions.get(mapFilling(value))?.id)
          .filter(Boolean);
        if (fillingIds.length) data.filling_options = fillingIds;
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

    strapi.log.info(`Catalog bootstrap: ensured filter dictionaries and backfilled ${linkedProducts} products`);
  },
};
