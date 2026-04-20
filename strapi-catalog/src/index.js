'use strict';

module.exports = {
  register(/*{ strapi }*/) {},

  async bootstrap({ strapi }) {
    strapi.log.info('Catalog bootstrap: auto-seed/auto-link is disabled');
  },
};
