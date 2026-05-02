'use strict';

module.exports = {
  async index(ctx) {
    const normalizeRows = (rows) => (Array.isArray(rows) ? rows : [])
      .map((row) => ({
        slug: String(row?.slug || '').trim(),
        name: String(row?.name || '').trim(),
        sortOrder: Number(row?.sort_order || 0),
      }))
      .filter((row) => row.slug && row.name)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru'));

    const activeWhere = { is_active: true };
    const findMany = (uid, where = {}) => strapi.db.query(uid).findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
    });

    const [
      collections,
      sizes,
      firmness,
      type,
      loadRange,
      heightRange,
      fillings,
      features,
    ] = await Promise.all([
      findMany('api::collection.collection', activeWhere),
      findMany('api::mattress-size.mattress-size'),
      findMany('api::firmness-option.firmness-option', activeWhere),
      findMany('api::mattress-type-option.mattress-type-option', activeWhere),
      findMany('api::load-range-option.load-range-option', activeWhere),
      findMany('api::height-range-option.height-range-option', activeWhere),
      findMany('api::filling-option.filling-option', activeWhere),
      findMany('api::feature-option.feature-option'),
    ]);

    ctx.body = {
      groups: {
        collection: normalizeRows(collections),
        size: normalizeRows(sizes),
        firmness: normalizeRows(firmness),
        type: normalizeRows(type),
        loadRange: normalizeRows(loadRange),
        heightRange: normalizeRows(heightRange),
        fillings: normalizeRows(fillings),
        features: normalizeRows(features),
      },
      source: 'strapi-catalog-filter-feed',
    };
  },
};
