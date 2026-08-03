'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/hotels-page-feed',
      handler: 'hotels-page-feed.index',
      config: { auth: false },
    },
  ],
};
