function normalizeOriginList(rawOrigins = '') {
  return Array.from(
    new Set(
      String(rawOrigins)
        .split(/[,\n]/)
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

function createOriginChecker(allowedOrigins = []) {
  const allowed = new Set(allowedOrigins);

  return function isOriginAllowed(origin) {
    // Requests without Origin (curl, server-to-server, same-origin navigation) are valid.
    if (!origin) return true;
    return allowed.has(origin);
  };
}

function buildCorsOptions({ allowedOrigins = [] } = {}) {
  const isOriginAllowed = createOriginChecker(allowedOrigins);

  return {
    origin(origin, callback) {
      callback(null, isOriginAllowed(origin));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };
}

module.exports = {
  normalizeOriginList,
  createOriginChecker,
  buildCorsOptions
};
