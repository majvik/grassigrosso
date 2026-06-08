#!/usr/bin/env node
/**
 * Generate AVIF/WebP sidecars for raster uploads and WebM for video uploads.
 * Originals in Strapi DB stay unchanged; feed resolves sidecars at runtime.
 *
 * Usage:
 *   npm run catalog:optimize-media
 *   node scripts/optimize-catalog-uploads.mjs [--dry-run] [--force] [--only=basename.png]
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const uploadsDir = path.join(repoRoot, 'strapi-catalog/public/uploads')

const SKIP_PREFIXES = ['thumbnail_', 'small_', 'medium_', 'large_']
const RASTER_EXT = new Set(['.png', '.jpg', '.jpeg'])
const VIDEO_EXT = new Set(['.mp4', '.mov'])
const SIDECAR_EXT = new Set(['.avif', '.webp', '.webm'])

const AVIF_QUALITY = 50
const WEBP_QUALITY = 82

function parseArgs(argv) {
  const options = { dryRun: false, force: false, only: null }
  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--force') options.force = true
    else if (arg.startsWith('--only=')) options.only = arg.slice('--only='.length).trim()
  }
  return options
}

function isOriginalUpload(fileName) {
  if (SIDECAR_EXT.has(path.extname(fileName).toLowerCase())) return false
  return !SKIP_PREFIXES.some((prefix) => fileName.startsWith(prefix))
}

function hasFfmpeg() {
  const result = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' })
  return result.status === 0
}

async function loadSharp() {
  try {
    const mod = await import('sharp')
    return mod.default
  } catch (error) {
    console.error('[catalog:optimize-media] sharp is required — run npm install')
    throw error
  }
}

async function optimizeRaster(sharp, inputPath, options) {
  const base = inputPath.slice(0, inputPath.lastIndexOf('.'))
  const avifPath = `${base}.avif`
  const webpPath = `${base}.webp`
  const tasks = []

  if (options.force || !fs.existsSync(avifPath)) {
    tasks.push(async () => {
      if (options.dryRun) {
        console.log(`[dry-run] avif ${path.basename(avifPath)}`)
        return
      }
      await sharp(inputPath).avif({ quality: AVIF_QUALITY, effort: 4 }).toFile(avifPath)
      console.log(`avif ${path.basename(avifPath)}`)
    })
  }

  if (options.force || !fs.existsSync(webpPath)) {
    tasks.push(async () => {
      if (options.dryRun) {
        console.log(`[dry-run] webp ${path.basename(webpPath)}`)
        return
      }
      await sharp(inputPath).webp({ quality: WEBP_QUALITY }).toFile(webpPath)
      console.log(`webp ${path.basename(webpPath)}`)
    })
  }

  for (const task of tasks) await task()
  return tasks.length
}

function optimizeVideo(inputPath, options) {
  const webmPath = `${inputPath.slice(0, inputPath.lastIndexOf('.'))}.webm`
  if (!options.force && fs.existsSync(webmPath)) return 0
  if (!hasFfmpeg()) {
    console.warn(`[catalog:optimize-media] ffmpeg not found — skip ${path.basename(inputPath)}`)
    return 0
  }
  if (options.dryRun) {
    console.log(`[dry-run] webm ${path.basename(webmPath)}`)
    return 1
  }
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-i', inputPath, '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-an', webmPath],
    { stdio: 'ignore' },
  )
  if (result.status !== 0) {
    console.warn(`[catalog:optimize-media] ffmpeg failed for ${path.basename(inputPath)}`)
    return 0
  }
  console.log(`webm ${path.basename(webmPath)}`)
  return 1
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (!fs.existsSync(uploadsDir)) {
    console.error(`[catalog:optimize-media] uploads dir not found: ${uploadsDir}`)
    process.exit(1)
  }

  const sharp = await loadSharp()
  const entries = fs.readdirSync(uploadsDir)
  let generated = 0
  let scanned = 0

  for (const fileName of entries) {
    if (options.only && fileName !== options.only) continue
    if (!isOriginalUpload(fileName)) continue

    const ext = path.extname(fileName).toLowerCase()
    const inputPath = path.join(uploadsDir, fileName)
    if (!fs.statSync(inputPath).isFile()) continue

    scanned += 1

    if (RASTER_EXT.has(ext)) {
      generated += await optimizeRaster(sharp, inputPath, options)
    } else if (VIDEO_EXT.has(ext)) {
      generated += optimizeVideo(inputPath, options)
    }
  }

  console.log('')
  console.log(
    `[catalog:optimize-media] done: scanned=${scanned}, generated=${generated}${options.dryRun ? ' (dry-run)' : ''}`,
  )
}

main().catch((error) => {
  console.error('[catalog:optimize-media] failed:', error)
  process.exit(1)
})
