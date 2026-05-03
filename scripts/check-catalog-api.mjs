#!/usr/bin/env node

const baseUrl = String(process.env.CATALOG_API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const failures = []
let catalogFilterSlugSets = null

const requiredFilterGroups = [
  'collection',
  'size',
  'firmness',
  'type',
  'loadRange',
  'heightRange',
  'fillings',
  'features',
]

const requiredFilterSlugs = {
  collection: ['classic', 'flexi', 'relax', 'trend'],
  firmness: ['soft', 'medium', 'hard'],
  type: ['spring', 'nospring'],
  fillings: ['memoryEffect'],
}

async function readJson(path) {
  const url = `${baseUrl}${path}`
  let response
  try {
    response = await fetch(url)
  } catch (error) {
    failures.push(`${path}: request failed: ${error.message}`)
    return null
  }

  if (!response.ok) {
    failures.push(`${path}: expected 2xx, got ${response.status}`)
    return null
  }

  try {
    return await response.json()
  } catch (error) {
    failures.push(`${path}: invalid JSON: ${error.message}`)
    return null
  }
}

function assertList(path, value, label) {
  if (!Array.isArray(value)) {
    failures.push(`${path}: ${label} must be an array`)
    return []
  }
  if (value.length === 0) failures.push(`${path}: ${label} must not be empty`)
  return value
}

function assertOptionShape(path, groupName, options) {
  for (const option of options) {
    if (!option || typeof option !== 'object') {
      failures.push(`${path}: ${groupName} contains a non-object option`)
      continue
    }
    if (!option.slug || typeof option.slug !== 'string') {
      failures.push(`${path}: ${groupName} option is missing string slug`)
    }
    if (!option.name || typeof option.name !== 'string') {
      failures.push(`${path}: ${groupName} option ${option.slug || '(unknown)'} is missing string name`)
    }
  }
}

const filters = await readJson('/api/catalog/filters')
if (filters) {
  const groups = filters.groups && typeof filters.groups === 'object' ? filters.groups : null
  if (!groups) {
    failures.push('/api/catalog/filters: missing groups object')
  } else {
    for (const groupName of requiredFilterGroups) {
      const options = assertList('/api/catalog/filters', groups[groupName], `groups.${groupName}`)
      assertOptionShape('/api/catalog/filters', groupName, options)
    }

    for (const [groupName, slugs] of Object.entries(requiredFilterSlugs)) {
      const actualSlugs = new Set((groups[groupName] || []).map((option) => option.slug))
      for (const slug of slugs) {
        if (!actualSlugs.has(slug)) {
          failures.push(`/api/catalog/filters: groups.${groupName} missing slug ${slug}`)
        }
      }
    }

    const expectedMattressSizeSlugs = [
      '80x190',
      '80x200',
      '90x190',
      '90x200',
      '120x190',
      '120x200',
      '140x190',
      '140x200',
      '160x190',
      '180x190',
      '160x200',
      '180x200',
    ]
    const sizeSlugsFromFeed = (groups.size || []).map((option) => option.slug)
    if (sizeSlugsFromFeed.length !== expectedMattressSizeSlugs.length) {
      failures.push(
        `/api/catalog/filters: groups.size expected ${expectedMattressSizeSlugs.length} entries, got ${sizeSlugsFromFeed.length} (${sizeSlugsFromFeed.join(', ')})`,
      )
    }
    for (let i = 0; i < expectedMattressSizeSlugs.length; i += 1) {
      if (sizeSlugsFromFeed[i] !== expectedMattressSizeSlugs[i]) {
        failures.push(
          `/api/catalog/filters: groups.size[${i}] expected slug ${expectedMattressSizeSlugs[i]}, got ${sizeSlugsFromFeed[i] ?? '(missing)'}`,
        )
        break
      }
    }

    catalogFilterSlugSets = Object.fromEntries(
      requiredFilterGroups.map((groupName) => [
        groupName,
        new Set((groups[groupName] || []).map((option) => option.slug)),
      ]),
    )
  }
}

const products = await readJson('/api/catalog/products')
if (products) {
  const items = assertList('/api/catalog/products', products.items, 'items')
  for (const product of items) {
    if (!product.slug || typeof product.slug !== 'string') failures.push('/api/catalog/products: product missing slug')
    if (!product.name || typeof product.name !== 'string') failures.push('/api/catalog/products: product missing name')
    if (!product.collectionSlug || typeof product.collectionSlug !== 'string') {
      failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} missing collectionSlug`)
    }
    if (!Array.isArray(product.sizes) || product.sizes.length === 0) {
      failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} missing sizes`)
    }
    if (!Array.isArray(product.fillings)) {
      failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} fillings must be an array`)
    }
    if (catalogFilterSlugSets) {
      if (!catalogFilterSlugSets.collection.has(product.collectionSlug)) {
        failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown collectionSlug ${product.collectionSlug}`)
      }
      if (!catalogFilterSlugSets.firmness.has(product.firmness)) {
        failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown firmness ${product.firmness}`)
      }
      if (!catalogFilterSlugSets.type.has(product.mattressType)) {
        failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown mattressType ${product.mattressType}`)
      }
      if (!catalogFilterSlugSets.loadRange.has(product.loadRange)) {
        failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown loadRange ${product.loadRange}`)
      }
      if (!catalogFilterSlugSets.heightRange.has(product.heightRange)) {
        failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown heightRange ${product.heightRange}`)
      }
      for (const size of product.sizes || []) {
        if (!catalogFilterSlugSets.size.has(size)) {
          failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown size ${size}`)
        }
      }
      for (const filling of product.fillings || []) {
        if (!catalogFilterSlugSets.fillings.has(filling)) {
          failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown filling ${filling}`)
        }
      }
      for (const feature of product.features || []) {
        if (!catalogFilterSlugSets.features.has(feature)) {
          failures.push(`/api/catalog/products: ${product.slug || '(unknown)'} has unknown feature ${feature}`)
        }
      }
    }
  }
}

const heroSlides = await readJson('/api/catalog/hero-slides')
if (heroSlides) {
  const slides = assertList('/api/catalog/hero-slides', heroSlides.slides, 'slides')
  for (const slide of slides) {
    if (!slide.type || !['image', 'video'].includes(slide.type)) {
      failures.push('/api/catalog/hero-slides: slide type must be image or video')
    }
    if (!slide.src || typeof slide.src !== 'string') {
      failures.push('/api/catalog/hero-slides: slide missing src')
    }
  }
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Catalog API ok: ${baseUrl}`)
