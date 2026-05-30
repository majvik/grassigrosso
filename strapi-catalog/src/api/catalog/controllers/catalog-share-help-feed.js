'use strict';

const { mapShareHelpRows } = require('../utils/map-help-rows');

module.exports = {
  async index(ctx) {
    let shareHelpRows = [];
    try {
      shareHelpRows = await strapi.db.query('api::catalog-share-help.catalog-share-help').findMany({
        where: { is_active: true },
        populate: {
          segments: { populate: ['photo'] },
        },
        orderBy: [{ id: 'asc' }],
      });
    } catch (error) {
      strapi.log.warn(`catalog-share-help-feed: catalog-share-help unavailable: ${error.message}`);
    }

    ctx.body = {
      shareHelp: mapShareHelpRows(shareHelpRows),
      source: 'strapi-catalog-share-help-feed',
    };
  },
};
