import { COOKIE_CONSENT_EVENT, grantYandexMapsConsent, readEffectiveConsent } from './cookie-consent'

const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''
const CONTACTS_MARKER_COLOR = '#283e37'

export const CONTACTS_OFFICES = [
  { id: 'main', center: [44.970737, 34.152577], zoom: 16, title: 'Главный офис', address: 'Симферополь, ул. Кубанская д. 25' },
  { id: 'voronezh', center: [51.681129, 39.297287], zoom: 16, title: 'Представительство в Центральной России', address: 'Воронеж, ул. Остужева 43 И' },
  { id: 'lnr', center: [48.541403, 39.32438], zoom: 16, title: 'Представительство в ЛНР', address: 'Луганск, ул. Фабричная д 1' },
  { id: 'dnr', center: [48.035223, 38.147954], zoom: 16, title: 'Представительство в ДНР', address: 'Харцызск, ул. Вокзальная, д. 52' },
]

const mapsBySlug = new Map()
const mountToken = new Map()
let sdkPromise = null

function officeById(id) {
  return CONTACTS_OFFICES.find((office) => office.id === id) || null
}

function applyMapGrayscale(mapContainer) {
  const groundPane = mapContainer?.querySelector('[class*="ground-pane"]')
  if (groundPane) groundPane.style.filter = 'grayscale(1)'
}

function loadYandexMapsSdk() {
  if (typeof ymaps !== 'undefined') return Promise.resolve()
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('contacts-yandex-maps-sdk')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Yandex Maps SDK failed')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'contacts-yandex-maps-sdk'
    script.src =
      'https://api-maps.yandex.ru/2.1/?lang=ru_RU' +
      (YANDEX_MAPS_API_KEY ? `&apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}` : '')
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Yandex Maps SDK failed'))
    document.head.appendChild(script)
  })
  return sdkPromise
}

function createOfficeMap(host, office) {
  const canvas = document.createElement('div')
  canvas.dataset.mapCanvas = office.id
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  host.appendChild(canvas)
  const map = new ymaps.Map(canvas, {
    center: office.center,
    zoom: office.zoom,
    controls: ['zoomControl'],
  })
  map.behaviors.disable('scrollZoom')
  const placemark = new ymaps.Placemark(
    office.center,
    {
      balloonContentHeader: `<strong>${office.title}</strong>`,
      balloonContentBody: office.address,
    },
    {
      preset: 'islands#circleDotIcon',
      iconColor: CONTACTS_MARKER_COLOR,
      hasHint: false,
      openBalloonOnClick: false,
      hideIconOnBalloonOpen: false,
    },
  )
  placemark.events.add('mouseenter', () => {
    placemark.balloon.open()
  })
  placemark.events.add('mouseleave', () => {
    placemark.balloon.close()
  })
  map.geoObjects.add(placemark)
  mapsBySlug.set(office.id, { canvas, map, placemark, host })
  host.dataset.ymapsReady = '1'
  map.events.add('load', () => applyMapGrayscale(host))
  setTimeout(() => applyMapGrayscale(host), 300)
  return map
}

export function mountOfficeMap(host, slug) {
  if (!host || readEffectiveConsent().yandexMaps !== 'granted') return
  if (host.hidden) return
  const office = officeById(slug)
  if (!office) return
  const existing = mapsBySlug.get(slug)
  if (existing) {
    if (existing.canvas.parentNode !== host) host.appendChild(existing.canvas)
    existing.map.container.fitToViewport()
    existing.map.setCenter(office.center, office.zoom)
    return
  }
  const token = (mountToken.get(slug) || 0) + 1
  mountToken.set(slug, token)
  loadYandexMapsSdk()
    .then(() => new Promise((resolve) => ymaps.ready(resolve)))
    .then(() => {
      if (mountToken.get(slug) !== token) return
      if (!host.isConnected || host.hidden || readEffectiveConsent().yandexMaps !== 'granted') return
      if (mapsBySlug.has(slug)) {
        mountOfficeMap(host, slug)
        return
      }
      createOfficeMap(host, office)
    })
    .catch(() => {})
}

export function destroyOfficeMaps() {
  for (const [slug, entry] of mapsBySlug) {
    try {
      entry.map.destroy()
    } catch {
      /* map node may already be gone */
    }
    entry.canvas.remove()
    mapsBySlug.delete(slug)
  }
}

function onConsentChange() {
  if (readEffectiveConsent().yandexMaps === 'granted') return
  if (document.getElementById('contacts-yandex-maps-sdk')) {
    window.location.reload()
    return
  }
  destroyOfficeMaps()
}

export function initContactsMaps() {
  if (!document.body.dataset.contactsMapsInit) {
    document.body.dataset.contactsMapsInit = '1'
    document.addEventListener('click', (event) => {
      const accept = event.target?.closest?.('[data-map-consent-accept]')
      if (accept && document.contains(accept)) {
        event.preventDefault()
        grantYandexMapsConsent()
        return
      }
      const tab = event.target?.closest?.('.contacts-map-tab, [data-map-tab]')
      if (!tab || !document.contains(tab)) return
      const office = tab.getAttribute('data-office')
      document.querySelectorAll('.contacts-map-tab, [data-map-tab]').forEach((item) => {
        item.classList.toggle('active', item === tab)
      })
      document.querySelectorAll('.contacts-map-frame, [data-map-frame]').forEach((frame) => {
        frame.hidden = frame.getAttribute('data-office') !== office
      })
      const host = document.getElementById(`map-${office}`)
      if (host) mountOfficeMap(host, office)
    })
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange)
  }

  if (readEffectiveConsent().yandexMaps !== 'granted') return
  const active =
    document.querySelector('.contacts-map-tab.active, [data-map-tab].active') ||
    document.querySelector('.contacts-map-tab, [data-map-tab]')
  const office = active?.getAttribute('data-office')
  const host = office ? document.getElementById(`map-${office}`) : null
  if (host) mountOfficeMap(host, office)
}
