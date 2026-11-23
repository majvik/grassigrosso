#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { loadSlotRegistry } from './generate-responsive-media.mjs'

const root = path.resolve('public/media-placeholders')
const failures = []
const slots = await loadSlotRegistry()
for (const slot of slots.filter((item) => item.placeholder)) {
  for (const density of [1, 2]) {
    for (const format of ['avif', 'webp', 'png']) {
      const file = path.join(root, `${slot.id}${density === 2 ? '@2x' : ''}.${format}`)
      try {
        const metadata = await sharp(file).metadata()
        if (metadata.width !== slot.width * density || metadata.height !== slot.height * density) {
          failures.push(`${file}: expected ${slot.width * density}x${slot.height * density}, got ${metadata.width}x${metadata.height}`)
        }
      } catch {
        failures.push(`${file}: missing or unreadable`)
      }
    }
  }
}
for (const file of ['product-cover-desktop.svg', 'product-cover-mobile.svg']) {
  try { await fs.access(path.join(root, file)) } catch { failures.push(`${file}: missing`) }
}
const heroSnapshot = JSON.parse(await fs.readFile(path.resolve('public/catalog-hero.snapshot.json'), 'utf8'))
async function expectUploadVariants(media, slotId) {
  const url = media?.fallbackSrc || media?.src
  if (media?.type !== 'image' || !url) return
  if (String(url).split(/[?#]/)[0].endsWith('.svg')) return
  const cleanUrl = String(url).split(/[?#]/)[0]
  const basename = path.basename(cleanUrl, path.extname(cleanUrl))
  const sourceFile = path.resolve('strapi-catalog/public', cleanUrl.replace(/^\//, ''))
  const slot = slots.find((item) => item.id === slotId)
  let metadata
  try {
    metadata = await sharp(sourceFile).metadata()
    const scaleX = (slot.width * 2) / metadata.width
    const scaleY = (slot.height * 2) / metadata.height
    const requiredScale = slot.fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
    if (requiredScale > 1 && slot.fit !== 'inside') return
  } catch {
    return
  }
  for (const density of ['', '@2x']) {
    for (const format of ['avif', 'webp', 'png']) {
      const file = path.resolve('strapi-catalog/public/uploads/responsive', `${basename}--${slotId}${density}.${format}`)
      try {
        const variant = await sharp(file).metadata()
        const scale = density ? 2 : 1
        const width = slot.width * scale
        const height = slot.height * scale
        if (slot.fit === 'inside'
          ? Math.abs(variant.width - metadata.width * Math.min(1, width / metadata.width, height / metadata.height)) > 1 ||
            Math.abs(variant.height - metadata.height * Math.min(1, width / metadata.width, height / metadata.height)) > 1
          : variant.width !== width || variant.height !== height) {
          failures.push(`${file}: unexpected dimensions ${variant.width}x${variant.height}`)
        }
      } catch { failures.push(`${file}: missing or unreadable ${slotId} variant`) }
    }
  }
}
for (const slide of heroSnapshot.slides || []) await expectUploadVariants(slide, 'catalog-hero')
const downloadSnapshot = JSON.parse(await fs.readFile(path.resolve('public/download-catalog-slides.snapshot.json'), 'utf8'))
for (const slide of downloadSnapshot.slides || []) await expectUploadVariants(slide, 'download-catalog')
const productsSnapshot = JSON.parse(await fs.readFile(path.resolve('public/catalog-products.snapshot.json'), 'utf8'))
for (const product of productsSnapshot.items || []) {
  for (const media of [product.pageCoverDesktop, product.collectionPageCoverDesktop]) await expectUploadVariants(media, 'product-cover-desktop')
  for (const media of [product.pageCoverMobile, product.collectionPageCoverMobile]) await expectUploadVariants(media, 'product-cover-mobile')
  for (const media of product.gallery || []) {
    await expectUploadVariants(media, 'catalog-card')
    await expectUploadVariants(media, 'product-slider')
    await expectUploadVariants(media, 'product-fullscreen')
    await expectUploadVariants(media, 'product-fullscreen-mobile')
  }
  for (const media of product.pageCharacteristicsMedia || []) {
    await expectUploadVariants(media, 'product-characteristics')
    await expectUploadVariants(media, 'product-fullscreen')
    await expectUploadVariants(media, 'product-fullscreen-mobile')
  }
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`check:responsive-media ok (${slots.length} slots)`)
