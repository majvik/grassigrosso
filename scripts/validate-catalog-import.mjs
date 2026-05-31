#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const importDir = path.join(root, 'docs/catalog-import')
const productsDir = path.join(importDir, 'products')
const imagesDir = path.join(importDir, 'images')

const IMAGE_SIZE = 1034
const STANDARD_SIZES = [
  '140x190',
  '140x200',
  '160x190',
  '160x200',
  '180x190',
  '180x200',
]

const FILTER_WHITELIST = {
  collection: new Set(['classic', 'flexi', 'relax', 'trend', 'topper']),
  firmness: new Set(['soft', 'medium', 'hard', 'dualFirmness']),
  mattress_type: new Set(['spring', 'nospring', 'topper', 'doubleSided', 'singleSided']),
  load_range: new Set(['upTo120', 'upTo160', 'upTo180', 'over160']),
  height_range: new Set(['low', 'mid', 'high']),
  fillings: new Set(['coir', 'latex', 'orthoFoam', 'memoryEffect', 'nanoFoam', 'forplit']),
  features: new Set(['removableCover', 'winterSummer', 'edgeSupport']),
}

const failures = []
const slugs = new Set()

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null

  const data = {}
  const lines = match[1].split('\n')
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    const kv = line.match(/^([a-z_0-9]+):\s*(.*)$/)
    if (!kv) {
      index += 1
      continue
    }

    const key = kv[1]
    const raw = kv[2].trim()

    if (raw === '') {
      const items = []
      index += 1
      while (index < lines.length && lines[index].startsWith('- ')) {
        items.push(lines[index].slice(2).trim())
        index += 1
      }
      data[key] = items
      continue
    }

    if (raw === 'null') data[key] = null
    else if (raw.startsWith('[') && raw.endsWith(']')) {
      data[key] = raw
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    } else if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
      data[key] = raw.slice(1, -1)
    } else if (/^-?\d+$/.test(raw)) {
      data[key] = Number(raw)
    } else {
      data[key] = raw
    }

    index += 1
  }

  return data
}

function readPngSize(filePath) {
  const buf = fs.readFileSync(filePath)
  if (buf.length < 24 || buf.toString('ascii', 1, 4) !== 'PNG') return null
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

for (const file of fs.readdirSync(productsDir).filter((f) => f.endsWith('.md')).sort()) {
  const rel = `products/${file}`
  const content = fs.readFileSync(path.join(productsDir, file), 'utf8')
  const data = parseFrontmatter(content)
  if (!data) {
    failures.push(`${rel}: missing YAML frontmatter`)
    continue
  }

  const slug = String(data.slug || '')
  if (!slug) failures.push(`${rel}: missing slug`)
  else if (slugs.has(slug)) failures.push(`${rel}: duplicate slug ${slug}`)
  else slugs.add(slug)

  for (const key of ['name', 'collection', 'firmness', 'mattress_type', 'load_range', 'height_range', 'image']) {
    if (!data[key]) failures.push(`${rel}: missing ${key}`)
  }

  if (data.collection && !FILTER_WHITELIST.collection.has(String(data.collection))) {
    failures.push(`${rel}: invalid collection ${data.collection}`)
  }
  if (data.firmness && !FILTER_WHITELIST.firmness.has(String(data.firmness))) {
    failures.push(`${rel}: invalid firmness ${data.firmness}`)
  }
  if (data.mattress_type && !FILTER_WHITELIST.mattress_type.has(String(data.mattress_type))) {
    failures.push(`${rel}: invalid mattress_type ${data.mattress_type}`)
  }
  if (data.load_range && !FILTER_WHITELIST.load_range.has(String(data.load_range))) {
    failures.push(`${rel}: invalid load_range ${data.load_range}`)
  }
  if (data.height_range && !FILTER_WHITELIST.height_range.has(String(data.height_range))) {
    failures.push(`${rel}: invalid height_range ${data.height_range}`)
  }

  const sizes = Array.isArray(data.sizes) ? data.sizes : []
  if (sizes.length !== STANDARD_SIZES.length || !STANDARD_SIZES.every((s, i) => sizes[i] === s)) {
    failures.push(`${rel}: sizes must be full standard list`)
  }

  const fillings = Array.isArray(data.filling_slugs) ? data.filling_slugs : []
  for (const slugValue of fillings) {
    if (!FILTER_WHITELIST.fillings.has(slugValue)) {
      failures.push(`${rel}: invalid filling slug ${slugValue}`)
    }
  }

  const features = Array.isArray(data.features) ? data.features : []
  for (const slugValue of features) {
    if (!FILTER_WHITELIST.features.has(slugValue)) {
      failures.push(`${rel}: invalid feature slug ${slugValue}`)
    }
  }

  const imageRel = String(data.image || '')
  const imagePath = path.join(importDir, imageRel)
  if (!fs.existsSync(imagePath)) {
    failures.push(`${rel}: missing image ${imageRel}`)
  } else {
    const size = readPngSize(imagePath)
    if (!size || size.width !== IMAGE_SIZE || size.height !== IMAGE_SIZE) {
      failures.push(`${rel}: image ${imageRel} must be ${IMAGE_SIZE}×${IMAGE_SIZE}, got ${size?.width ?? '?'}×${size?.height ?? '?'}`)
    }
  }

  if (!content.includes('## Наполнение (полный список для модалки)')) {
    failures.push(`${rel}: missing layers section`)
  }
}

if (failures.length) {
  console.error(`catalog-import validation failed (${failures.length}):`)
  for (const msg of failures) console.error(`- ${msg}`)
  process.exit(1)
}

console.log(`catalog-import validation passed: ${slugs.size} products, ${slugs.size} images ${IMAGE_SIZE}×${IMAGE_SIZE}`)
