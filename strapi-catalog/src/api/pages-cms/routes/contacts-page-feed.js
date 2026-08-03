'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/contacts-page-feed',
      handler: 'contacts-page-feed.index',
      config: { auth: false },
    },
  ],
};
