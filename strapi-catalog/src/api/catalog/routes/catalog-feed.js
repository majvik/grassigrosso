'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/catalog-feed',
      handler: 'catalog-feed.index',
      config: {
        auth: false
      }
    }
  ]
};
