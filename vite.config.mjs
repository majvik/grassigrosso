import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cleanHtmlRoutes = {
  '/': 'index.html',
  '/hotels': 'hotels.html',
  '/dealers': 'dealers.html',
  '/catalog': 'catalog.html',
  '/documents': 'documents.html',
  '/contacts': 'contacts.html',
  '/privacy': 'privacy.html',
  '/terms': 'terms.html',
  '/cookies': 'cookies.html',
  '/404': '404.html',
  '/unsubscribe': 'unsubscribe.html',
}

function criticalPreloaderPlugin() {
  return {
    name: 'grassigrosso-critical-preloader',
    transformIndexHtml(html) {
      if (!html.includes('id="vite-critical-css"')) return html
      const criticalPath = path.resolve(__dirname, 'src/critical-preloader.css')
      const critical = fs.readFileSync(criticalPath, 'utf8').trim()
      return html.replace(
        /<style id="vite-critical-css">\s*<\/style>/,
        `<style id="vite-critical-css">\n${critical}\n</style>`
      )
    },
  }
}

function cleanUrlDevPlugin() {
  return {
    name: 'grassigrosso-clean-url-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || req.method !== 'GET') return next()
        const url = new URL(req.url, 'http://localhost')
        const htmlFile = cleanHtmlRoutes[url.pathname]
        if (!htmlFile) return next()

        try {
          const filePath = path.resolve(__dirname, htmlFile)
          let html = await fs.promises.readFile(filePath, 'utf8')
          html = await server.transformIndexHtml(url.pathname, html)
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
        } catch (error) {
          next(error)
        }
      })
    },
  }
}

function siteOriginPlugin(origin) {
  return {
    name: 'grassigrosso-site-origin',
    transformIndexHtml(html) {
      return html.split('%%SITE_ORIGIN%%').join(origin)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteOrigin = (env.SITE_URL || 'https://grassigrosso.com').replace(/\/+$/, '')

  return {
    root: '.',
    base: './',
    plugins: [react(), cleanUrlDevPlugin(), criticalPreloaderPlugin(), siteOriginPlugin(siteOrigin)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          main: './index.html',
          hotels: './hotels.html',
          dealers: './dealers.html',
          catalog: './catalog.html',
          documents: './documents.html',
          contacts: './contacts.html',
          privacy: './privacy.html',
          terms: './terms.html',
          cookies: './cookies.html',
          '404': './404.html',
          unsubscribe: './unsubscribe.html',
        }
      }
    },
    server: {
      host: '127.0.0.1',
      port: 5174,
      strictPort: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        // Strapi media: hero и карточки каталога ссылаются на /uploads/… — без прокси Vite отдаёт HTML-фолбэк.
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      }
    }
  }
})
