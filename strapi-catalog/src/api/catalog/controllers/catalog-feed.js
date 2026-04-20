'use strict';

module.exports = {
  async index(ctx) {
    const normalizeStringList = (value) => {
      if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean)
      const single = String(value || '').trim()
      return single ? [single] : []
    };

    const normalizeDimensionValue = (value) => String(value || '').trim().replace(/^w/, '').replace(/^l/, '');

    const rows = await strapi.db.query('api::product.product').findMany({
      where: { is_active: true },
      populate: { collection: true, tags: true, media: true },
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }]
    });

    const items = rows.map((row) => ({
      name: row.name || '',
      slug: row.slug || '',
      collectionName: row.collection?.name || '',
      collectionSlug: row.collection?.slug || '',
      firmness: row.firmness || '',
      mattressType: row.mattress_type || '',
      heightCm: Number(row.height_cm || 0),
      maxLoadKg: Number(row.max_load_kg || 0),
      loadRange: String(row.load_range || '').trim(),
      heightRange: String(row.height_range || '').trim(),
      widths: normalizeStringList(row.widths).map(normalizeDimensionValue),
      lengths: normalizeStringList(row.lengths).map(normalizeDimensionValue),
      fillings: normalizeStringList(row.fillings),
      features: normalizeStringList(row.features),
      imageUrl: row.media?.url || row.image_url || '',
      imageAlt: row.media?.alternativeText || (row.name ? `Коллекция ${row.name}` : 'Изображение товара'),
      tags: Array.isArray(row.tags) ? row.tags.map((tag) => tag.name).filter(Boolean) : [],
      isActive: row.is_active !== false
    }));

    ctx.body = { items, source: 'strapi-catalog-feed' };
  }
};
