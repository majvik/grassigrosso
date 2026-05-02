'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/catalog-filter-feed',
      handler: 'catalog-filter-feed.index',
      config: {
        auth: false,
      },
    },
  ],
};
