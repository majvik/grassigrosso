import { defineConfig, loadEnv } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const secret = (name: string, localFallback: string): string => {
  const value = process.env[name]
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return localFallback
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS || 'http://127.0.0.1:5174',
      adminCors: process.env.ADMIN_CORS || 'http://127.0.0.1:9000',
      authCors: process.env.AUTH_CORS || 'http://127.0.0.1:9000,http://127.0.0.1:5174',
      jwtSecret: secret('JWT_SECRET', 'local-commerce-jwt-change-me'),
      cookieSecret: secret('COOKIE_SECRET', 'local-commerce-cookie-change-me'),
    },
  },
  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL || 'http://127.0.0.1:9000',
  },
})
