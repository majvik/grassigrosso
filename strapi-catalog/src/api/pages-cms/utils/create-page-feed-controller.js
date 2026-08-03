'use strict';

const { loadCanonicalPageData } = require('./serialize-page-feed');

/**
 * Factory for public read-only page feed controllers (`auth: false` routes).
 * @param {string} slug
 */
function createPageFeedController(slug) {
  return {
    async index(ctx) {
      const data = await loadCanonicalPageData(strapi, slug);
      if (!data) {
        ctx.status = 404;
        ctx.body = { data: null };
        return;
      }
      // Feed envelope: { data } only — no source (Node adds source in Phase D).
      ctx.body = { data };
    },
  };
}

module.exports = { createPageFeedController };
