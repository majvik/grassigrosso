'use strict';

const { preferAvifVariant } = require('../utils/prefer-avif');

module.exports = {
  async index(ctx) {
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

    const mediaUrl = (media) => (media && media.url ? preferAvifVariant(String(media.url)) : '')
    const mediaAlt = (media, fallback) => {
      if (!media) return fallback || ''
      return String(media.alternativeText || media.name || fallback || '')
    }

    let filterHelpRows = []
    try {
      filterHelpRows = await strapi.db.query('api::catalog-filter-help.catalog-filter-help').findMany({
        where: { is_active: true },
        populate: {
          segments: { populate: ['photo'] },
        },
        orderBy: [{ id: 'asc' }],
      })
    } catch (error) {
      strapi.log.warn(`catalog-filter-feed: catalog-filter-help unavailable: ${error.message}`)
    }

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
    ])

    const filterHelp = {}
    for (const row of Array.isArray(filterHelpRows) ? filterHelpRows : []) {
      const key = String(row?.filter_key || '').trim()
      if (!key) continue
      const segments = (Array.isArray(row.segments) ? row.segments : [])
        .map((seg) => ({
          text: String(seg?.body || '').trim(),
          imageUrl: mediaUrl(seg?.photo) || undefined,
          imageAlt: mediaAlt(seg?.photo, '') || undefined,
        }))
        .filter((s) => s.text || s.imageUrl)
      const modalTitle = String(row?.modal_title || '').trim()
      if (!modalTitle && segments.length === 0) continue
      filterHelp[key] = { modalTitle, segments }
    }

    ctx.body = {
      groups: {
        collection: normalizeRows(collections),
        size: normalizeRows(sizes).filter((row) => STANDARD_MATTRESS_SIZE_SLUGS.has(row.slug)),
        firmness: normalizeRows(firmness),
        type: normalizeRows(type),
        loadRange: normalizeRows(loadRange),
        heightRange: normalizeRows(heightRange),
        fillings: normalizeRows(fillings),
        features: normalizeRows(features),
      },
      filterHelp,
      source: 'strapi-catalog-filter-feed',
    };
  },
};
