'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/catalog-hero-feed',
      handler: 'catalog-hero-feed.index',
      config: {
        auth: false,
      },
    },
  ],
};
