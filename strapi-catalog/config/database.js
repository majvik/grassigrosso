const path = require('path');

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');
  const databaseFilename = env('DATABASE_FILENAME', '.tmp/data.db');
  // Используем process.cwd() вместо __dirname: при «strapi develop» config грузится из dist/config,
  // поэтому __dirname = dist/config и БД падала в dist/.tmp/ вместо корня strapi-catalog.
  // process.cwd() всегда указывает на strapi-catalog/ (откуда запускается strapi).
  const sqliteFilename = path.isAbsolute(databaseFilename)
    ? databaseFilename
    : path.join(process.cwd(), databaseFilename);

  const connections = {
    mysql: {
      connection: {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 3306),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'strapi'),
        user: env('DATABASE_USERNAME', 'strapi'),
        password: env('DATABASE_PASSWORD', 'strapi'),
        ssl: env.bool('DATABASE_SSL', false) && {
          key: env('DATABASE_SSL_KEY', undefined),
          cert: env('DATABASE_SSL_CERT', undefined),
          ca: env('DATABASE_SSL_CA', undefined),
          capath: env('DATABASE_SSL_CAPATH', undefined),
          cipher: env('DATABASE_SSL_CIPHER', undefined),
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
        schema: env('DATABASE_SCHEMA', 'public'),
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
    sqlite: {
      connection: {
        filename: sqliteFilename,
      },
      useNullAsDefault: true,
      // WAL mode: позволяет одновременные чтения во время записи, снижает задержки
      // на resource-limited хостинге (Timeweb) при конкурентных запросах к каталогу.
      // Strapi 5 использует better-sqlite3 (синхронный драйвер), поэтому API — conn.pragma(),
      // а не conn.run() из callback-based sqlite3.
      pool: {
        min: 1,
        max: 1,
        afterCreate(conn, done) {
          try {
            conn.pragma('journal_mode = WAL');
            done(null, conn);
          } catch (err) {
            done(err, conn);
          }
        },
      },
    },
  };

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  };
};
