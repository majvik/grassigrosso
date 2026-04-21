module.exports = ({ env }) => {
  const publicUrl = String(env('STRAPI_PUBLIC_URL', '')).trim().replace(/\/+$/, '');
  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    // Публичный URL сайта, с которого заходят в /admin (через Node-прокси). На проде задать = SITE_URL.
    ...(publicUrl ? { url: publicUrl } : {}),
    proxy: env.bool('STRAPI_BEHIND_PROXY', true),
    app: {
      keys: env.array('APP_KEYS'),
    },
    logger: {
      updates: {
        enabled: false,
      },
    },
    webhooks: {
      populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
    },
  };
};
