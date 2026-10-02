declare module '@/contacts-maps' {
  export function mountOfficeMap(host: HTMLElement, slug: string): void
  export function initContactsMaps(): void
  export function destroyOfficeMaps(): void
}
