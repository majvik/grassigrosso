'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/catalog-share-help-feed',
      handler: 'catalog-share-help-feed.index',
      config: {
        auth: false,
      },
    },
  ],
};
