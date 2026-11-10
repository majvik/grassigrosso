import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

import { generateResponsiveVariants, generateSlotPlaceholders, loadSlotRegistry } from './generate-responsive-media.mjs'

test('slot registry has unique ids and exact 1x/2x dimensions', async () => {
  const slots = await loadSlotRegistry()
  assert.ok(slots.length >= 6)
  assert.equal(new Set(slots.map((slot) => slot.id)).size, slots.length)
  for (const slot of slots) {
    assert.ok(slot.width > 0 && slot.height > 0)
    assert.equal(slot.width2x, slot.width * 2)
    assert.equal(slot.height2x, slot.height * 2)
  }
})

test('generator writes avif webp and png at 1x and 2x', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grassigrosso-responsive-'))
  context.after(() => fs.rm(root, { recursive: true, force: true }))
  const source = path.join(root, 'source.png')
  await sharp({ create: { width: 1200, height: 800, channels: 4, background: '#b0b0b0' } }).png().toFile(source)

  const result = await generateResponsiveVariants({ source, outputDir: root, basename: 'sample', width: 400, height: 240 })
  assert.equal(result.outputs.length, 6)
  for (const density of [1, 2]) {
    for (const format of ['avif', 'webp', 'png']) {
      const file = path.join(root, `sample${density === 2 ? '@2x' : ''}.${format}`)
      const metadata = await sharp(file).metadata()
      assert.equal(metadata.width, 400 * density)
      assert.equal(metadata.height, 240 * density)
    }
  }
})

test('generator does not rasterize svg and refuses to upscale', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grassigrosso-responsive-'))
  context.after(() => fs.rm(root, { recursive: true, force: true }))
  const svg = path.join(root, 'cover.svg')
  await fs.writeFile(svg, '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"/>')
  await assert.rejects(() => generateResponsiveVariants({ source: svg, outputDir: root, basename: 'svg', width: 50, height: 50 }), /svg/i)

  const small = path.join(root, 'small.png')
  await sharp({ create: { width: 200, height: 100, channels: 4, background: '#aaa' } }).png().toFile(small)
  await assert.rejects(() => generateResponsiveVariants({ source: small, outputDir: root, basename: 'small', width: 160, height: 90 }), /2x|upscale/i)
})

test('stale outputs are regenerated and placeholders include raster and svg slots', async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grassigrosso-responsive-'))
  context.after(() => fs.rm(root, { recursive: true, force: true }))
  const source = path.join(root, 'source.png')
  await sharp({ create: { width: 800, height: 480, channels: 4, background: '#999' } }).png().toFile(source)
  await generateResponsiveVariants({ source, outputDir: root, basename: 'stale', width: 300, height: 180 })
  const output = path.join(root, 'stale.png')
  const first = (await fs.stat(output)).mtimeMs
  await new Promise((resolve) => setTimeout(resolve, 20))
  await sharp({ create: { width: 800, height: 480, channels: 4, background: '#777' } }).png().toFile(source)
  await generateResponsiveVariants({ source, outputDir: root, basename: 'stale', width: 300, height: 180 })
  assert.ok((await fs.stat(output)).mtimeMs > first)

  const generated = await generateSlotPlaceholders(root)
  assert.ok(generated.some((file) => file.endsWith('.avif')))
  assert.ok(generated.some((file) => file.endsWith('@2x.webp')))
  assert.ok(generated.some((file) => file.endsWith('.png')))
  assert.ok(generated.some((file) => file.endsWith('product-cover-desktop.svg')))
  assert.ok(generated.some((file) => file.endsWith('product-cover-mobile.svg')))
})
