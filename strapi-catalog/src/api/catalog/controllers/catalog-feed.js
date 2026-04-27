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
    const mapFirmness = (value) => {
      const raw = String(value || '').trim().toLowerCase()
      if (raw === 'мягкий') return 'soft'
      if (raw === 'средний') return 'medium'
      if (raw === 'жесткий') return 'hard'
      return raw
    }
    const mapMattressType = (value) => {
      const raw = String(value || '').trim().toLowerCase()
      if (raw === 'пружинный') return 'spring'
      if (raw === 'беспружинный') return 'nospring'
      if (raw === 'топер') return 'topper'
      return raw
    }
    const mapLoadRange = (value) => {
      const raw = String(value || '').trim()
      const dict = {
        'до_90_кг': 'upTo90',
        'до_110_кг': 'upTo110',
        'до_130_кг': 'upTo130',
        'до_150_кг': 'upTo150',
        'свыше_150_кг': 'over150',
      }
      return dict[raw] || raw
    }
    const mapHeightRange = (value) => {
      const raw = String(value || '').trim()
      const dict = { 'низкий': 'low', 'средний': 'mid', 'высокий': 'high' }
      return dict[raw] || raw
    }
    const mapFilling = (value) => {
      const raw = String(value || '').trim()
      const dict = { 'кокос': 'coir', 'латекс': 'latex', 'мемори': 'memory', 'ппу': 'ppu', 'холкон': 'holkon' }
      return dict[raw] || raw
    }
    const mapFeature = (value) => {
      const raw = String(value || '').trim()
      const dict = {
        'съемный_чехол': 'removableCover',
        'зима_лето': 'winterSummer',
        'разная_жесткость': 'dualFirmness',
      }
      return dict[raw] || raw
    }

    const rows = await strapi.db.query('api::product.product').findMany({
      where: { is_active: true },
      populate: { collection: true, tags: true, media: true, features: true, sizes: true },
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
            'Разная жесткость сторон': 'dualFirmness',
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
          if (size) result.push(size)
        })
      })
      return result
    }

    const items = rows.map((row) => ({
      name: row.name || '',
      slug: row.slug || '',
      collectionName: row.collection?.name || '',
      collectionSlug: row.collection?.slug || '',
      firmness: mapFirmness(row.firmness || ''),
      mattressType: mapMattressType(row.mattress_type || ''),
      heightCm: Number(row.height_cm || 0),
      maxLoadKg: Number(row.max_load_kg || 0),
      loadRange: mapLoadRange(row.load_range || ''),
      heightRange: mapHeightRange(row.height_range || ''),
      sizes: (() => {
        const relationSizes = Array.isArray(row.sizes)
          ? row.sizes
            .map((sizeRow) => normalizeSizeValue(sizeRow?.name || sizeRow?.slug || ''))
            .filter(Boolean)
          : []
        return relationSizes.length ? relationSizes : buildSizesFromLegacy(row)
      })(),
      fillings: normalizeStringList(row.fillings).map(mapFilling),
      features: Array.isArray(row.features) ? normalizeFeatures(row.features) : normalizeStringList(row.features).map(mapFeature),
      imageUrl: row.media?.url || row.image_url || '',
      imageAlt: row.media?.alternativeText || (row.name ? `Коллекция ${row.name}` : 'Изображение товара'),
      tags: Array.isArray(row.tags) ? row.tags.map((tag) => tag.name).filter(Boolean) : [],
      isActive: row.is_active !== false
    }));

    ctx.body = { items, source: 'strapi-catalog-feed' };
  }
};
