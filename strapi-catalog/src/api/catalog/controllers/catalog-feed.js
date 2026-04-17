'use strict';

module.exports = {
  async index(ctx) {
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
      imageUrl: row.media?.url || row.image_url || '',
      imageAlt: row.media?.alternativeText || (row.name ? `Коллекция ${row.name}` : 'Изображение товара'),
      tags: Array.isArray(row.tags) ? row.tags.map((tag) => tag.name).filter(Boolean) : [],
      isActive: row.is_active !== false
    }));

    ctx.body = { items, source: 'strapi-catalog-feed' };
  }
};
