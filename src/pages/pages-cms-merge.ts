/**
 * Atomic typed merge of CMS page data onto hardcoded fallback (Phase 4A).
 * See docs/superpowers/specs/2026-08-03-pages-cms-react-hydrate-design.md §1–§2.
 */
import {
  BEHAVIOR_BOUND_ARRAYS,
  CONTENT_ONLY_ARRAYS,
  NULLABLE_STRING_KEYS,
  OPTIONAL_EMPTY_STRING_KEYS,
  type PagesCmsSlug,
} from './pages-cms-constants'
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

function isMediaShape(value: unknown): boolean {
  if (value === null) return true
  return isPlainObject(value) && 'url' in value
}

function mergeString(key: string, fallback: string, cms: unknown): string {
  if (typeof cms !== 'string') {
    if (cms === null && NULLABLE_STRING_KEYS.has(key)) {
      throw new MergeReject(`${key}: unexpected null for non-nullable context`)
    }
    if (cms === null) throw new MergeReject(`${key}: null string not allowed`)
    throw new MergeReject(`${key}: expected string`)
  }
  if (cms.trim().length === 0) {
    if (OPTIONAL_EMPTY_STRING_KEYS.has(key)) return cms
    throw new MergeReject(`${key}: empty string not allowed`)
  }
  return cms
}

function mergeNullableString(key: string, cms: unknown): string | null {
  if (cms === null) return null
  if (typeof cms !== 'string') throw new MergeReject(`${key}: expected string|null`)
  if (cms.trim().length === 0) throw new MergeReject(`${key}: empty string not allowed (use null)`)
  return cms
}

function mergeMedia(key: string, fallback: unknown, cms: unknown): unknown {
  if (cms === null) {
    if (fallback === null || isMediaShape(fallback)) return null
    throw new MergeReject(`${key}: null media not allowed`)
  }
  if (!isPlainObject(cms) || typeof cms.url !== 'string') {
    throw new MergeReject(`${key}: media must be { url } or null`)
  }
  if (cms.url.trim().length === 0) throw new MergeReject(`${key}: media.url empty`)

  const base = isPlainObject(fallback) ? fallback : { url: '' }
  const out: Record<string, unknown> = { ...cloneUnknown(base), url: cms.url }
  for (const [k, v] of Object.entries(cms)) {
    if (k === 'url') continue
    if (!(k in base)) throw new MergeReject(`${key}.${k}: unknown media key`)
    if (typeof v === 'string') {
      if (v.trim().length === 0 && !OPTIONAL_EMPTY_STRING_KEYS.has(k)) {
        throw new MergeReject(`${key}.${k}: empty string`)
      }
      out[k] = v
    } else if (typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    } else {
      throw new MergeReject(`${key}.${k}: unsupported media field type`)
    }
  }
  return out
}

function mergeScalarOrStructure(key: string, fallback: unknown, cms: unknown): unknown {
  if (NULLABLE_STRING_KEYS.has(key)) {
    return mergeNullableString(key, cms)
  }
  if (typeof fallback === 'string') {
    return mergeString(key, fallback, cms)
  }
  if (typeof fallback === 'boolean') {
    if (typeof cms !== 'boolean') throw new MergeReject(`${key}: expected boolean`)
    return cms
  }
  if (typeof fallback === 'number') {
    if (typeof cms !== 'number' || !Number.isFinite(cms)) {
      throw new MergeReject(`${key}: expected finite number`)
    }
    return cms
  }
  if (isMediaShape(fallback) || (fallback === null && isMediaShape(cms))) {
    return mergeMedia(key, fallback, cms)
  }
  if (Array.isArray(fallback)) {
    return mergeArray(key, fallback, cms)
  }
  if (isPlainObject(fallback)) {
    if (!isPlainObject(cms)) throw new MergeReject(`${key}: expected object`)
    return mergeObject(fallback, cms, key)
  }
  if (fallback === null && typeof cms === 'string' && NULLABLE_STRING_KEYS.has(key)) {
    return mergeNullableString(key, cms)
  }
  throw new MergeReject(`${key}: unsupported fallback type`)
}

function mergeObject(
  fallback: Record<string, unknown>,
  cms: Record<string, unknown>,
  path: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(cms)) {
    if (!(key in fallback)) {
      throw new MergeReject(`${path ? `${path}.` : ''}${key}: unknown key`)
    }
  }
  for (const key of Object.keys(fallback)) {
    const childPath = path ? `${path}.${key}` : key
    if (!(key in cms)) {
      out[key] = cloneUnknown(fallback[key])
      continue
    }
    // Stable identity fields on objects: if present in CMS must match fallback
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
    out[key] = mergeScalarOrStructure(key, fallback[key], cms[key])
  }
  return out
}

function mergeContentArray(key: string, cms: unknown): unknown[] {
  if (!Array.isArray(cms)) throw new MergeReject(`${key}: expected array`)
  // Empty array is explicit CMS clear (≠ absence)
  return cms.map((item, i) => {
    if (item === null || typeof item !== 'object') {
      throw new MergeReject(`${key}[${i}]: expected object`)
    }
    if (Array.isArray(item)) throw new MergeReject(`${key}[${i}]: nested array not allowed`)
    // Content items: validate by merging onto itself as both fallback and cms
    // so scalar rules apply without requiring a twin fallback item.
    return mergeObject(item as Record<string, unknown>, item as Record<string, unknown>, `${key}[${i}]`)
  })
}

function mergeBehaviorArray(key: string, fallback: unknown[], cms: unknown): unknown[] {
  if (!Array.isArray(cms)) throw new MergeReject(`${key}: expected array`)
  if (cms.length === 0) throw new MergeReject(`${key}: empty array not allowed for behavior-bound`)

  const stableKey = BEHAVIOR_BOUND_ARRAYS[key]
  if (!stableKey) throw new MergeReject(`${key}: missing behavior key config`)

  const fallbackKeys: string[] = []
  const fallbackByKey = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < fallback.length; i++) {
    const item = fallback[i]
    if (!isPlainObject(item)) throw new MergeReject(`${key} fallback[${i}]: expected object`)
    const id = item[stableKey]
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new MergeReject(`${key} fallback[${i}]: invalid ${stableKey}`)
    }
    if (fallbackByKey.has(id)) throw new MergeReject(`${key}: duplicate fallback ${stableKey}=${id}`)
    fallbackKeys.push(id)
    fallbackByKey.set(id, item)
  }

  const cmsByKey = new Map<string, Record<string, unknown>>()
  for (let i = 0; i < cms.length; i++) {
    const item = cms[i]
    if (!isPlainObject(item)) throw new MergeReject(`${key}[${i}]: expected object`)
    const id = item[stableKey]
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new MergeReject(`${key}[${i}]: invalid ${stableKey}`)
    }
    if (cmsByKey.has(id)) throw new MergeReject(`${key}: duplicate ${stableKey}=${id}`)
    if (!fallbackByKey.has(id)) throw new MergeReject(`${key}: unknown ${stableKey}=${id}`)
    cmsByKey.set(id, item)
  }

  for (const id of fallbackKeys) {
    if (!cmsByKey.has(id)) throw new MergeReject(`${key}: missing ${stableKey}=${id}`)
  }
  if (cmsByKey.size !== fallbackByKey.size) {
    throw new MergeReject(`${key}: membership mismatch`)
  }

  return fallbackKeys.map((id) => {
    const fb = fallbackByKey.get(id)!
    const cm = cmsByKey.get(id)!
    return mergeObject(fb, cm, `${key}[${id}]`)
  })
}

function mergeArray(key: string, fallback: unknown[], cms: unknown): unknown[] {
  if (key in BEHAVIOR_BOUND_ARRAYS) {
    return mergeBehaviorArray(key, fallback, cms)
  }
  if (CONTENT_ONLY_ARRAYS.has(key)) {
    return mergeContentArray(key, cms)
  }
  throw new MergeReject(`${key}: array not classified as content-only or behavior-bound`)
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
    const value = mergeObject(fallback, data, '') as T
    return { ok: true, value }
  } catch (err) {
    if (err instanceof MergeReject) return { ok: false, reason: err.reason }
    return { ok: false, reason: err instanceof Error ? err.message : 'merge failed' }
  }
}
