import rows from './responsive-media-slots.json'

export type ResponsiveMediaSlot = {
  id: string
  width: number
  height: number
  width2x: number
  height2x: number
  fit: 'cover' | 'contain' | 'inside'
  placeholder: boolean
}

export const RESPONSIVE_MEDIA_SLOTS: ResponsiveMediaSlot[] = rows.map((row) => ({
  ...row,
  fit: row.fit as ResponsiveMediaSlot['fit'],
  width2x: row.width * 2,
  height2x: row.height * 2,
}))

export function getResponsiveMediaSlot(id: string): ResponsiveMediaSlot {
  const slot = RESPONSIVE_MEDIA_SLOTS.find((item) => item.id === id)
  if (!slot) throw new Error(`Unknown responsive media slot: ${id}`)
  return slot
}
