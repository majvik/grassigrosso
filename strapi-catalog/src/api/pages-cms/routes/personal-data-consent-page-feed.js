'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/personal-data-consent-page-feed',
      handler: 'personal-data-consent-page-feed.index',
      config: { auth: false },
    },
  ],
};
