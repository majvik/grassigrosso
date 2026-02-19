import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  base: './',
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
