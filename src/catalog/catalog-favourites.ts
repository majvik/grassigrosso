export const CATALOG_FAV_STORAGE_KEY = 'grassigrosso-catalog-favourites'
const CATALOG_FAV_STORAGE_KEY_LEGACY = 'grassigrosso-catalogue-new-favourites'

export function migrateCatalogFavouritesStorageOnce(): void {
  try {
    if (localStorage.getItem(CATALOG_FAV_STORAGE_KEY)) return
    const legacyValue = localStorage.getItem(CATALOG_FAV_STORAGE_KEY_LEGACY)
    if (legacyValue != null) {
      localStorage.setItem(CATALOG_FAV_STORAGE_KEY, legacyValue)
      localStorage.removeItem(CATALOG_FAV_STORAGE_KEY_LEGACY)
    }
  } catch {
    // localStorage can be unavailable in strict privacy modes.
  }
}

export function readCatalogFavourites(): Set<string> {
  try {
    migrateCatalogFavouritesStorageOnce()
    const raw = localStorage.getItem(CATALOG_FAV_STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? new Set(list.map(String)) : new Set()
  } catch {
    return new Set()
  }
}

export function writeCatalogFavourites(set: Set<string>): void {
  localStorage.setItem(CATALOG_FAV_STORAGE_KEY, JSON.stringify([...set]))
}
