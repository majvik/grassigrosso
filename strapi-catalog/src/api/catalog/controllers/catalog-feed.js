'use strict';

module.exports = {
  async index(ctx) {
    const normalizeStringList = (value) => {
      if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
      const single = String(value || '').trim()
      return single ? [single] : []
    };

    const normalizeDimensionValue = (value) => {
      const raw = String(value || '').trim()
      const match = raw.match(/\d+/)
      return match ? match[0] : raw
    };
    const normalizeSizeValue = (value) => {
      const raw = String(value || '').trim().toLowerCase()
      if (!raw) return ''
      const match = raw.match(/(\d+)\D+(\d+)/)
      if (!match) return ''
      return `${match[1]}x${match[2]}`
    }
    // Синхронно с src/catalog/catalog-sizes.ts
    const STANDARD_MATTRESS_SIZE_SLUGS = new Set([
      '80x190',
      '80x200',
      '90x190',
      '90x200',
      '120x190',
      '120x200',
      '140x190',
      '140x200',
      '160x190',
      '180x190',
      '160x200',
      '180x200',
    ])
    const filterToStandardSizes = (list) => {
      const out = []
      for (const slug of list) {
        const s = normalizeSizeValue(slug)
        if (s && STANDARD_MATTRESS_SIZE_SLUGS.has(s)) out.push(s)
      }
      return [...new Set(out)]
    }
    const mapFirmness = (value) => {
      const raw = String(value || '').trim().toLowerCase()
      if (raw === 'мягкий') return 'soft'
      if (raw === 'средний') return 'medium'
      if (raw === 'жесткий') return 'hard'
      if (raw === 'разная жесткость сторон' || raw === 'разная_жесткость_сторон') return 'dualFirmness'
      return raw
    }
    const mapMattressType = (value) => {
      const raw = String(value || '').trim().toLowerCase()
      if (raw === 'пружинный') return 'spring'
      if (raw === 'беспружинный') return 'nospring'
      if (raw === 'топер') return 'topper'
      if (raw === 'двухсторонние') return 'doubleSided'
      if (raw === 'односторонние') return 'singleSided'
      return raw
    }
    const mapLoadRange = (value) => {
      const raw = String(value || '').trim()
      const dict = {
        'до_90_кг': 'upTo120',
        'до_110_кг': 'upTo120',
        'до_130_кг': 'upTo160',
        'до_150_кг': 'upTo160',
        'свыше_150_кг': 'over160',
        'до_120_кг': 'upTo120',
        'до_160_кг': 'upTo160',
        'до_180_кг': 'upTo180',
        'свыше_160_кг': 'over160',
        'свыше_180_кг': 'over160',
      }
      return dict[raw] || raw
    }
    const normalizeProductLoadRangeSlug = (slug, maxLoadKg) => {
      const s = String(slug || '').trim()
      const m = Number(maxLoadKg || 0)
      if (s === 'over160' && m > 0 && m <= 180) return 'upTo180'
      return s
    }
    const mapHeightRange = (value) => {
      const raw = String(value || '').trim()
      const dict = {
        'низкий': 'low',
        'средний': 'mid',
        'высокий': 'high',
        'компактные_до_16_см': 'low',
        'средние_16_20_см': 'mid',
        'высокие_свыше_20_см': 'high'
      }
      return dict[raw] || raw
    }
    const mapFilling = (value) => {
      const raw = String(value || '').trim()
      const dict = {
        'кокос': 'coir',
        'латекс': 'latex',
        'орто_пена': 'orthoFoam',
        'с_эффектом_памяти': 'memoryEffect',
        'нано_пена': 'nanoFoam',
        'форплит': 'forplit',
      }
      return dict[raw] || raw
    }
    const mapFeature = (value) => {
      const raw = String(value || '').trim()
      const dict = {
        'съемный_чехол': 'removableCover',
        'зима_лето': 'winterSummer',
        'усиленный_периметр': 'edgeSupport',
      }
      return dict[raw] || raw
    }

    const rows = await strapi.db.query('api::product.product').findMany({
      where: { is_active: true },
      populate: {
        collection: true,
        tags: true,
        media: true,
        features: true,
        sizes: true,
        firmness_option: true,
        mattress_type_option: true,
        load_range_option: true,
        height_range_option: true,
        filling_options: true,
      },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
    });

    const normalizeFeatures = (value) => {
      const rows = Array.isArray(value) ? value : []
      return rows
        .map((row) => {
          const slug = String(row?.slug || '').trim()
          if (slug) return slug
          const name = String(row?.name || '').trim()
          const mapByName = {
            'Съемный чехол': 'removableCover',
            'Эффект зима-лето': 'winterSummer',
            'Усиленный периметр': 'edgeSupport',
          }
          return mapByName[name] || ''
        })
        .filter(Boolean)
    }

    const buildSizesFromLegacy = (row) => {
      const widths = normalizeStringList(row.widths).map(normalizeDimensionValue)
      const lengths = normalizeStringList(row.lengths).map(normalizeDimensionValue)
      const result = []
      widths.forEach((width) => {
        lengths.forEach((length) => {
          const size = normalizeSizeValue(`${width}x${length}`)
          const mapped = mapObsoleteMattressSizeSlug(size)
          if (mapped && STANDARD_MATTRESS_SIZE_SLUGS.has(mapped)) result.push(mapped)
        })
      })
      return [...new Set(result)]
    }

    const items = rows.map((row) => ({
      name: row.name || '',
      slug: row.slug || '',
      collectionName: row.collection?.name || '',
      collectionSlug: row.collection?.slug || '',
      firmness: row.firmness_option?.slug || mapFirmness(row.firmness || ''),
      mattressType: row.mattress_type_option?.slug || mapMattressType(row.mattress_type || ''),
      heightCm: Number(row.height_cm || 0),
      maxLoadKg: Number(row.max_load_kg || 0),
      loadRange: normalizeProductLoadRangeSlug(
        row.load_range_option?.slug || mapLoadRange(row.load_range || ''),
        Number(row.max_load_kg || 0),
      ),
      heightRange: row.height_range_option?.slug || mapHeightRange(row.height_range || ''),
      sizes: (() => {
        const relationSizes = Array.isArray(row.sizes)
          ? filterToStandardSizes(
            row.sizes.map((sizeRow) =>
              normalizeSizeValue(sizeRow?.name || sizeRow?.slug || ''),
            ),
          )
          : []
        const legacy = filterToStandardSizes(buildSizesFromLegacy(row))
        const merged = [...new Set([...relationSizes, ...legacy])]
        if (merged.length) return merged
        if (legacy.length) return legacy
        return []
      })(),
      fillings: Array.isArray(row.filling_options) && row.filling_options.length
        ? row.filling_options.map((item) => item.slug).filter(Boolean)
        : normalizeStringList(row.fillings).map(mapFilling),
      features: Array.isArray(row.features) ? normalizeFeatures(row.features) : normalizeStringList(row.features).map(mapFeature),
      imageUrl: row.media?.url || row.image_url || '',
      imageAlt: row.media?.alternativeText || (row.name ? `Коллекция ${row.name}` : 'Изображение товара'),
      tags: Array.isArray(row.tags) ? row.tags.map((tag) => tag.name).filter(Boolean) : [],
      isActive: row.is_active !== false
    }));

    ctx.body = { items, source: 'strapi-catalog-feed' };
  }
};
