import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

export default defineConfig({
  root: '.',
  base: './',
  plugins: [criticalPreloaderPlugin()],
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
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  }
})
