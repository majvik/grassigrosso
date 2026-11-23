#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const registryPath = path.join(repoRoot, 'src/media/responsive-media-slots.json')
const rasterFormats = ['avif', 'webp', 'png']

export async function loadSlotRegistry() {
  const rows = JSON.parse(await fs.readFile(registryPath, 'utf8'))
  return rows.map((row) => ({
    ...row,
    width2x: row.width * 2,
    height2x: row.height * 2,
  }))
}

async function isFresh(sourceMtime, output) {
  try {
    return (await fs.stat(output)).mtimeMs >= sourceMtime
  } catch {
    return false
  }
}

export async function generateResponsiveVariants({ source, outputDir, basename, width, height, fit = 'cover' }) {
  if (path.extname(source).toLowerCase() === '.svg') throw new Error('SVG sources are not rasterized')
  const metadata = await sharp(source).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read raster dimensions: ${source}`)
  const scaleX = (width * 2) / metadata.width
  const scaleY = (height * 2) / metadata.height
  const requiredScale = fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY)
  if (requiredScale > 1 && fit !== 'inside') {
    throw new Error(`Source is too small for the requested 2x variant; upscale is forbidden: ${source}`)
  }

  await fs.mkdir(outputDir, { recursive: true })
  const sourceMtime = (await fs.stat(source)).mtimeMs
  const outputs = []
  for (const density of [1, 2]) {
    for (const format of rasterFormats) {
      const suffix = density === 2 ? '@2x' : ''
      const output = path.join(outputDir, `${basename}${suffix}.${format}`)
      outputs.push(output)
      const force = process.env.RESPONSIVE_MEDIA_FORCE === '1'
        || (process.env.RESPONSIVE_MEDIA_FORCE_PRODUCT_SLIDER === '1' && basename.endsWith('--product-slider'))
      if (!force && process.env.RESPONSIVE_MEDIA_FORCE_SLOT !== basename.split('--').at(-1) && await isFresh(sourceMtime, output)) continue
      let pipeline = sharp(source).resize(width * density, height * density, {
        fit,
        position: 'centre',
        withoutEnlargement: true,
        background: { r: 238, g: 238, b: 238, alpha: 1 },
      })
      if (format === 'avif') pipeline = pipeline.avif({ quality: 52, effort: 4 })
      if (format === 'webp') pipeline = pipeline.webp({ quality: 82 })
      if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9, adaptiveFiltering: true })
      await pipeline.toFile(output)
    }
  }
  return { source, outputs, width, height }
}

function graySvg(width, height) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label=""><rect width="100%" height="100%" fill="#e7e7e7"/></svg>\n`
}

export async function generateSlotPlaceholders(outputDir = path.join(repoRoot, 'public/media-placeholders'), selectedSlot = '') {
  await fs.mkdir(outputDir, { recursive: true })
  const slots = (await loadSlotRegistry()).filter((slot) => slot.placeholder && (!selectedSlot || slot.id === selectedSlot))
  const generated = []
  for (const slot of slots) {
    for (const density of [1, 2]) {
      for (const format of rasterFormats) {
        const suffix = density === 2 ? '@2x' : ''
        const output = path.join(outputDir, `${slot.id}${suffix}.${format}`)
        let pipeline = sharp({
          create: {
            width: slot.width * density,
            height: slot.height * density,
            channels: 4,
            background: '#e7e7e7',
          },
        })
        if (format === 'avif') pipeline = pipeline.avif({ quality: 45, effort: 4 })
        if (format === 'webp') pipeline = pipeline.webp({ quality: 75 })
        if (format === 'png') pipeline = pipeline.png({ compressionLevel: 9 })
        await pipeline.toFile(output)
        generated.push(output)
      }
    }
  }
  if (!selectedSlot) for (const [name, width, height] of [
    ['product-cover-desktop.svg', 2100, 900],
    ['product-cover-mobile.svg', 900, 1200],
  ]) {
    const output = path.join(outputDir, name)
    await fs.writeFile(output, graySvg(width, height))
    generated.push(output)
  }
  return generated
}

async function generateProductPrototypeVariants(selectedSlot = '') {
  const sourceDir = path.join(repoRoot, 'public/product-page-prototype')
  const outputDir = path.join(sourceDir, 'responsive')
  const slots = new Map((await loadSlotRegistry()).map((slot) => [slot.id, slot]))
  const files = (await fs.readdir(sourceDir)).filter((name) => /\.(png|jpe?g)$/i.test(name))
  const generated = []
  for (const filename of files) {
    const source = path.join(sourceDir, filename)
    const basename = path.basename(filename, path.extname(filename))
    const slotIds = filename.startsWith('related-')
      ? ['catalog-card']
      : ['product-slider', 'product-fullscreen', 'product-fullscreen-mobile', 'product-characteristics', 'product-material']
    for (const slotId of slotIds) {
      if (selectedSlot && slotId !== selectedSlot) continue
      const slot = slots.get(slotId)
      if (!slot) continue
      const result = await generateResponsiveVariants({
        source,
        outputDir,
        basename: `${basename}--${slotId}`,
        width: slot.width,
        height: slot.height,
        fit: slot.fit,
      })
      generated.push(...result.outputs)
    }
  }
  return generated
}

async function generateCatalogSnapshotVariants(only = '', selectedSlot = '') {
  const snapshotPath = path.join(repoRoot, 'public/catalog-products-listing.snapshot.json')
  const uploadsDir = path.join(repoRoot, 'strapi-catalog/public/uploads')
  const outputDir = path.join(uploadsDir, 'responsive')
  const slots = new Map((await loadSlotRegistry()).map((slot) => [slot.id, slot]))
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'))
  const sourceSlots = new Map()
  const addSource = (url, slotIds) => {
    if (!url) return
    const filename = path.basename(String(url).split(/[?#]/)[0])
    if (only && !filename.startsWith(only)) return
    if (path.extname(filename).toLowerCase() === '.svg') return
    const existing = sourceSlots.get(filename) || new Set()
    slotIds.forEach((slotId) => existing.add(slotId))
    sourceSlots.set(filename, existing)
  }
  for (const item of snapshot.items || []) {
    for (const media of item.gallery || []) {
      const url = media.fallbackSrc || media.src
      if (media.type === 'image') addSource(url, ['catalog-card', 'product-slider', 'product-fullscreen', 'product-fullscreen-mobile', 'product-characteristics', 'product-material'])
    }
  }
  const heroSnapshot = JSON.parse(await fs.readFile(path.join(repoRoot, 'public/catalog-hero.snapshot.json'), 'utf8'))
  for (const media of heroSnapshot.slides || []) {
    if (media.type === 'image') addSource(media.fallbackSrc || media.src, ['catalog-hero'])
  }
  const fullSnapshot = JSON.parse(await fs.readFile(path.join(repoRoot, 'public/catalog-products.snapshot.json'), 'utf8'))
  for (const item of fullSnapshot.items || []) {
    for (const [slot, mediaItems] of [
      ['product-cover-desktop', [item.pageCoverDesktop, item.collectionPageCoverDesktop]],
      ['product-cover-mobile', [item.pageCoverMobile, item.collectionPageCoverMobile]],
    ]) {
      for (const media of mediaItems) if (media?.type === 'image') addSource(media.fallbackSrc || media.src, [slot])
    }
    if (item.imageUrl && !item.gallery?.length) addSource(item.imageUrl, ['catalog-card'])

    for (const media of item.gallery || []) {
      if (media.type === 'image') addSource(media.fallbackSrc || media.src, ['catalog-card', 'product-slider', 'product-fullscreen', 'product-fullscreen-mobile'])
    }
    for (const media of item.pageCharacteristicsMedia || []) {
      if (media.type === 'image') addSource(media.fallbackSrc || media.src, ['product-characteristics', 'product-fullscreen', 'product-fullscreen-mobile'])
    }
  }
  const downloadSnapshot = JSON.parse(await fs.readFile(path.join(repoRoot, 'public/download-catalog-slides.snapshot.json'), 'utf8'))
  for (const media of downloadSnapshot.slides || []) {
    if (media.type === 'image') addSource(media.fallbackSrc || media.src, ['download-catalog'])
  }
  const generated = []
  const skipped = []
  for (const [filename, slotIds] of sourceSlots) {
    const source = path.join(uploadsDir, filename)
    try {
      await fs.access(source)
    } catch {
      skipped.push(`${filename}: missing`)
      continue
    }
    const basename = path.basename(filename, path.extname(filename))
    for (const slotId of slotIds) {
      if (selectedSlot && slotId !== selectedSlot) continue
      const slot = slots.get(slotId)
      try {
        const result = await generateResponsiveVariants({
          source,
          outputDir,
          basename: `${basename}--${slotId}`,
          width: slot.width,
          height: slot.height,
          fit: slot.fit,
        })
        generated.push(...result.outputs)
      } catch (error) {
        skipped.push(`${filename}/${slotId}: ${error.message}`)
      }
    }
  }
  return { generated, skipped }
}

async function main() {
  const only = process.argv.find((arg) => arg.startsWith('--only='))?.slice('--only='.length) || ''
  const slot = process.argv.find((arg) => arg.startsWith('--slot='))?.slice('--slot='.length) || ''
  if (slot && !(await loadSlotRegistry()).some(({ id }) => id === slot)) throw new Error(`Unknown media slot: ${slot}`)
  const placeholders = only ? [] : await generateSlotPlaceholders(undefined, slot)
  const productVariants = only ? [] : await generateProductPrototypeVariants(slot)
  const catalogVariants = await generateCatalogSnapshotVariants(only, slot)
  console.log(`[responsive-media] generated placeholders: ${placeholders.length}; product variants: ${productVariants.length}; catalog variants: ${catalogVariants.generated.length}; skipped: ${catalogVariants.skipped.length}`)
  if (catalogVariants.skipped.length) console.warn(catalogVariants.skipped.join('\n'))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
