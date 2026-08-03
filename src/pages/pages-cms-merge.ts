/**
 * Atomic typed merge of CMS page data onto hardcoded fallback (Phase 4A).
 * See docs/superpowers/specs/2026-08-03-pages-cms-react-hydrate-design.md §1–§2.
 */
import {
  BEHAVIOR_ARRAY_ITEMS,
  CONTENT_ARRAY_ITEMS,
  ROOT_FIELD_HINTS,
  resolveItemDescriptor,
  type FieldDesc,
  type ItemDescName,
} from './pages-cms-descriptors'
import type { PagesCmsSlug } from './pages-cms-constants'
import { isPlainObject } from './pages-cms-validate'

export type MergeSuccess<T> = { ok: true; value: T }
export type MergeFailure = { ok: false; reason: string }
export type MergeResult<T> = MergeSuccess<T> | MergeFailure

class MergeReject extends Error {
  reason: string
  constructor(reason: string) {
    super(reason)
    this.name = 'MergeReject'
    this.reason = reason
  }
}

function cloneUnknown<T>(value: T): T {
  return structuredClone(value)
}

function isMediaObject(value: unknown): value is Record<string, unknown> & { url: string } {
  return isPlainObject(value) && typeof value.url === 'string'
}

function parseString(path: string, cms: unknown, desc: Extract<FieldDesc, { kind: 'string' }>): string {
  if (cms === null) throw new MergeReject(`${path}: null string not allowed`)
  if (typeof cms !== 'string') throw new MergeReject(`${path}: expected string`)
  if (cms.trim().length === 0) {
    if (desc.optionalEmpty) return cms
    throw new MergeReject(`${path}: empty string not allowed`)
  }
  return cms
}

function parseNullableString(path: string, cms: unknown): string | null {
  if (cms === null) return null
  if (typeof cms !== 'string') throw new MergeReject(`${path}: expected string|null`)
  if (cms.trim().length === 0) throw new MergeReject(`${path}: empty string not allowed (use null)`)
  return cms
}

function parseMedia(
  path: string,
  cms: unknown,
  desc: Extract<FieldDesc, { kind: 'media' }>,
): unknown {
  if (cms === null) {
    if (desc.optional) return null
    throw new MergeReject(`${path}: required media cannot be null`)
  }
  if (!isMediaObject(cms)) throw new MergeReject(`${path}: media must be { url: string }`)
  if (cms.url.trim().length === 0) throw new MergeReject(`${path}: media.url empty`)
  const out: Record<string, unknown> = { url: cms.url }
  for (const [k, v] of Object.entries(cms)) {
    if (k === 'url') continue
    // media objects only allow string/number/boolean extras already on payload; unknown extras reject
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    } else {
      throw new MergeReject(`${path}.${k}: unsupported media field type`)
    }
  }
  return out
}

function parseByDescriptor(path: string, cms: unknown, desc: FieldDesc): unknown {
  switch (desc.kind) {
    case 'string':
      return parseString(path, cms, desc)
    case 'nullableString':
      return parseNullableString(path, cms)
    case 'boolean':
      if (typeof cms !== 'boolean') throw new MergeReject(`${path}: expected boolean`)
      return cms
    case 'number':
      if (typeof cms !== 'number' || !Number.isFinite(cms)) {
        throw new MergeReject(`${path}: expected finite number`)
      }
      return cms
    case 'media':
      return parseMedia(path, cms, desc)
    case 'object':
      return parseObjectByDescriptor(path, cms, desc.fields)
    case 'contentArray':
      return parseContentArray(path, cms, desc.item)
    case 'behaviorArray':
      throw new MergeReject(`${path}: behavior arrays must be merged against fallback`)
    default:
      throw new MergeReject(`${path}: unknown descriptor kind`)
  }
}

function parseObjectByDescriptor(
  path: string,
  cms: unknown,
  fields: Record<string, FieldDesc>,
): Record<string, unknown> {
  if (!isPlainObject(cms)) throw new MergeReject(`${path}: expected object`)
  for (const key of Object.keys(cms)) {
    if (!(key in fields)) throw new MergeReject(`${path}.${key}: unknown key`)
  }
  const out: Record<string, unknown> = {}
  for (const [key, fieldDesc] of Object.entries(fields)) {
    const childPath = path ? `${path}.${key}` : key
    if (!(key in cms)) {
      if (fieldDesc.kind === 'string' && fieldDesc.optional) {
        out[key] = fieldDesc.optionalEmpty ? '' : undefined
        if (out[key] === undefined) delete out[key]
        continue
      }
      if (
        (fieldDesc.kind === 'boolean' || fieldDesc.kind === 'number' || fieldDesc.kind === 'media') &&
        fieldDesc.optional
      ) {
        if (fieldDesc.kind === 'media') out[key] = null
        continue
      }
      if (fieldDesc.kind === 'contentArray') {
        out[key] = []
        continue
      }
      if (fieldDesc.kind === 'nullableString') {
        out[key] = null
        continue
      }
      throw new MergeReject(`${childPath}: missing required field`)
    }
    out[key] = parseByDescriptor(childPath, cms[key], fieldDesc)
  }
  return out
}

function parseContentArray(path: string, cms: unknown, itemName: ItemDescName): unknown[] {
  if (!Array.isArray(cms)) throw new MergeReject(`${path}: expected array`)
  const itemDesc = resolveItemDescriptor(itemName)
  return cms.map((item, i) => parseByDescriptor(`${path}[${i}]`, item, itemDesc))
}

function mergeBehaviorArray(
  path: string,
  fallback: unknown[],
  cms: unknown,
  stableKey: string,
  itemName: ItemDescName,
): unknown[] {
  if (!Array.isArray(cms)) throw new MergeReject(`${path}: expected array`)
  if (cms.length === 0) throw new MergeReject(`${path}: empty array not allowed for behavior-bound`)

  const itemDesc = resolveItemDescriptor(itemName)
  if (itemDesc.kind !== 'object') throw new MergeReject(`${path}: item descriptor must be object`)

  const fallbackKeys: string[] = []
  const fallbackByKey = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < fallback.length; i++) {
    const item = fallback[i]
    if (!isPlainObject(item)) throw new MergeReject(`${path} fallback[${i}]: expected object`)
    const id = item[stableKey]
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new MergeReject(`${path} fallback[${i}]: invalid ${stableKey}`)
    }
    if (fallbackByKey.has(id)) throw new MergeReject(`${path}: duplicate fallback ${stableKey}=${id}`)
    fallbackKeys.push(id)
    fallbackByKey.set(id, item)
  }

  const cmsByKey = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < cms.length; i++) {
    const item = cms[i]
    if (!isPlainObject(item)) throw new MergeReject(`${path}[${i}]: expected object`)
    const id = item[stableKey]
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new MergeReject(`${path}[${i}]: invalid ${stableKey}`)
    }
    if (cmsByKey.has(id)) throw new MergeReject(`${path}: duplicate ${stableKey}=${id}`)
    if (!fallbackByKey.has(id)) throw new MergeReject(`${path}: unknown ${stableKey}=${id}`)
    // Partial CMS patch: unknown keys reject; present keys must match descriptor.
    // Missing keys are filled from fallback during mergeObjectWithHints.
    for (const key of Object.keys(item)) {
      if (!(key in itemDesc.fields)) {
        throw new MergeReject(`${path}[${i}].${key}: unknown key`)
      }
      parseByDescriptor(`${path}[${i}].${key}`, item[key], itemDesc.fields[key])
    }
    cmsByKey.set(id, item)
  }

  for (const id of fallbackKeys) {
    if (!cmsByKey.has(id)) throw new MergeReject(`${path}: missing ${stableKey}=${id}`)
  }

  return fallbackKeys.map((id) => {
    const fb = fallbackByKey.get(id)!
    const cm = cmsByKey.get(id)!
    return mergeObjectWithHints(fb, cm, `${path}[${id}]`, itemDesc.fields)
  })
}

/**
 * Merge CMS onto fallback twin using optional field hints for media/nullability.
 * Unknown CMS keys (not in fallback) reject. Descriptor fields (when provided)
 * enforce type rules for present CMS keys.
 */
function mergeObjectWithHints(
  fallback: Record<string, unknown>,
  cms: Record<string, unknown>,
  path: string,
  itemFields?: Record<string, FieldDesc>,
): Record<string, unknown> {
  for (const key of Object.keys(cms)) {
    if (!(key in fallback)) {
      throw new MergeReject(`${path ? `${path}.` : ''}${key}: unknown key`)
    }
  }

  const out: Record<string, unknown> = {}
  for (const key of Object.keys(fallback)) {
    const childPath = path ? `${path}.${key}` : key
    if (!(key in cms)) {
      out[key] = cloneUnknown(fallback[key])
      continue
    }

    const hint: FieldDesc | undefined =
      itemFields?.[key] ||
      ROOT_FIELD_HINTS[key] ||
      (key in BEHAVIOR_ARRAY_ITEMS
        ? {
            kind: 'behaviorArray',
            key: BEHAVIOR_ARRAY_ITEMS[key].key,
            item: BEHAVIOR_ARRAY_ITEMS[key].item,
          }
        : key in CONTENT_ARRAY_ITEMS
          ? { kind: 'contentArray', item: CONTENT_ARRAY_ITEMS[key] }
          : undefined)

    // Stable identity fields: must match fallback exactly
    if (
      (key === 'document_key' ||
        key === 'value' ||
        key === 'slug' ||
        key === 'catalog_key' ||
        key === 'icon_key') &&
      typeof fallback[key] === 'string'
    ) {
      if (cms[key] !== fallback[key]) {
        throw new MergeReject(`${childPath}: stable key mismatch`)
      }
      out[key] = fallback[key]
      continue
    }

    if (hint) {
      if (hint.kind === 'behaviorArray') {
        if (!Array.isArray(fallback[key])) throw new MergeReject(`${childPath}: fallback not array`)
        out[key] = mergeBehaviorArray(
          childPath,
          fallback[key] as unknown[],
          cms[key],
          hint.key,
          hint.item,
        )
        continue
      }
      if (hint.kind === 'contentArray') {
        out[key] = parseContentArray(childPath, cms[key], hint.item)
        continue
      }
      out[key] = parseByDescriptor(childPath, cms[key], hint)
      continue
    }

    // Infer from fallback type for plain scalars/objects without hint
    const fb = fallback[key]
    if (typeof fb === 'string') {
      out[key] = parseString(childPath, cms[key], { kind: 'string' })
      continue
    }
    if (typeof fb === 'boolean') {
      out[key] = parseByDescriptor(childPath, cms[key], { kind: 'boolean' })
      continue
    }
    if (typeof fb === 'number') {
      out[key] = parseByDescriptor(childPath, cms[key], { kind: 'number' })
      continue
    }
    if (isMediaObject(fb)) {
      // Media without explicit hint: treat as required (null rejects)
      out[key] = parseMedia(childPath, cms[key], { kind: 'media', optional: false })
      continue
    }
    if (Array.isArray(fb)) {
      throw new MergeReject(
        `${childPath}: array not classified as content-only or behavior-bound`,
      )
    }
    if (isPlainObject(fb)) {
      if (!isPlainObject(cms[key])) throw new MergeReject(`${childPath}: expected object`)
      out[key] = mergeObjectWithHints(fb, cms[key], childPath)
      continue
    }
    if (fb === null) {
      // Fallback null is not "media" — only nullableString keys via hints allowed
      throw new MergeReject(`${childPath}: cannot merge onto null fallback without field hint`)
    }
    throw new MergeReject(`${childPath}: unsupported fallback type`)
  }
  return out
}

/**
 * Atomic merge. On any violation returns ok:false and does not partially apply.
 */
export function mergePageContent<T extends Record<string, unknown>>(
  _slug: PagesCmsSlug,
  fallback: T,
  data: unknown,
): MergeResult<T> {
  try {
    if (!isPlainObject(data)) {
      return { ok: false, reason: 'cms data must be a plain object' }
    }
    const value = mergeObjectWithHints(fallback, data, '') as T
    return { ok: true, value }
  } catch (err) {
    if (err instanceof MergeReject) return { ok: false, reason: err.reason }
    return { ok: false, reason: err instanceof Error ? err.message : 'merge failed' }
  }
}
