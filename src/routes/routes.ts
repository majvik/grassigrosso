export interface SiteRoute {
  id: string
  title: string
  path: string
  htmlFile: string
  nav?: 'primary' | 'legal' | 'service'
  hasContactForm?: boolean
}

export const SITE_ROUTES = [
  { id: 'index', title: 'Главная', path: '/', htmlFile: 'index.html', nav: undefined },
  { id: 'hotels', title: 'Отелям', path: '/hotels', htmlFile: 'hotels.html', nav: 'primary', hasContactForm: true },
  { id: 'dealers', title: 'Дилерам', path: '/dealers', htmlFile: 'dealers.html', nav: 'primary', hasContactForm: true },
  { id: 'catalog', title: 'Каталог', path: '/catalog', htmlFile: 'catalog.html', nav: 'primary' },
  { id: 'documents', title: 'Документы', path: '/documents', htmlFile: 'documents.html', nav: 'primary' },
  { id: 'contacts', title: 'Контакты', path: '/contacts', htmlFile: 'contacts.html', nav: 'primary', hasContactForm: true },
  { id: 'privacy', title: 'Политика конфиденциальности', path: '/privacy', htmlFile: 'privacy.html', nav: 'legal' },
  { id: 'terms', title: 'Пользовательское соглашение', path: '/terms', htmlFile: 'terms.html', nav: 'legal' },
  { id: 'cookies', title: 'Использование cookie', path: '/cookies', htmlFile: 'cookies.html', nav: 'legal' },
  { id: 'unsubscribe', title: 'Отписка', path: '/unsubscribe', htmlFile: 'unsubscribe.html', nav: 'service' },
  { id: '404', title: 'Страница не найдена', path: '/404', htmlFile: '404.html', nav: 'service' },
] as const satisfies readonly SiteRoute[]

export type SiteRouteId = (typeof SITE_ROUTES)[number]['id']

export const PRIMARY_NAV_ROUTES = SITE_ROUTES.filter((route) => route.nav === 'primary')
export const LEGAL_ROUTES = SITE_ROUTES.filter((route) => route.nav === 'legal')

export function getRouteById(id: SiteRouteId): SiteRoute {
  const route = SITE_ROUTES.find((item) => item.id === id)
  if (!route) throw new Error(`Unknown route id: ${id}`)
  return route
}

export function cleanPathForHtmlFile(htmlFile: string): string {
  const route = SITE_ROUTES.find((item) => item.htmlFile === htmlFile)
  return route?.path || `/${htmlFile.replace(/\.html$/i, '')}`
}
