import assert from 'node:assert/strict'
import { cleanupChromeSession, delay, startCatalogChromeSession } from './lib/catalog-chrome-session.mjs'

const baseUrl = process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174'
const browser = await startCatalogChromeSession(baseUrl, '/download-catalog')

try {
  const { cdp } = browser
  for (const width of [1440, 1024, 900, 390]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false })
    let layout
    for (let attempt = 0; attempt < 100; attempt++) {
      layout = await cdp.evaluate(`(() => {
        const media = document.querySelector('[data-download-media]')
        const form = document.querySelector('[data-download-doc="catalog"]')
        const info = form?.closest('.catalogue-new-shared-product-info')
        const image = media?.querySelector('.catalog-hero-slide img')
        if (!media || !info || !image?.naturalWidth) return null
        const box = (element) => element.getBoundingClientRect().toJSON()
        return {
          media: box(media), info: box(info), shell: box(media.parentElement),
          image: box(image), imageFit: getComputedStyle(image).objectFit,
          viewport: document.documentElement.clientWidth,
        }
      })()`)
      if (layout) break
      await delay(100)
    }
    assert.ok(layout, `${width}px: media and form must render`)
    const { media, info, shell, image, imageFit, viewport } = layout
    assert.ok(media.width > 0 && info.width > 0, `${width}px: panels must have a width`)
    assert.ok(Math.abs(media.width - media.height) <= 1, `${width}px: media must stay square`)
    assert.ok(image.width <= media.width + 1 && imageFit === 'cover', `${width}px: image must fit the media panel`)
    assert.ok(shell.left >= 0 && shell.right <= viewport + 1 && info.right <= viewport + 1, `${width}px: layout overflows`)
    if (width > 900) {
      assert.ok(media.right < info.left && Math.abs(media.top - info.top) <= 1, `${width}px: media and form must be side by side`)
    } else {
      assert.ok(info.bottom <= media.top && Math.abs(media.width - shell.width) <= 1, `${width}px: form must stack above the media`)
    }
  }
  console.log('Download catalog layout works at 1440, 1024, 900 and 390 px')
} finally {
  cleanupChromeSession(browser)
}
