const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || ''
const CONTACTS_MARKER_COLOR = '#283e37'
const CONTACTS_OFFICES = [
  { id: 'main', center: [44.970737, 34.152577], zoom: 16, title: 'Главный офис', address: 'Симферополь, ул. Кубанская д. 25' },
  { id: 'voronezh', center: [51.681129, 39.297287], zoom: 16, title: 'Представительство в Центральной России', address: 'Воронеж, ул. Остужева 43 И' },
  { id: 'lnr', center: [48.541403, 39.32438], zoom: 16, title: 'Представительство в ЛНР', address: 'Луганск, ул. Фабричная д 1' },
  { id: 'dnr', center: [48.035223, 38.147954], zoom: 16, title: 'Представительство в ДНР', address: 'Харцизск, ул. Вокзальная, д. 52' },
]

function applyMapGrayscale(mapContainer) {
  if (!mapContainer) return
  const groundPane = mapContainer.querySelector('[class*="ground-pane"]')
  if (groundPane) groundPane.style.filter = 'grayscale(1)'
}

function frameNeedsJsMap(frame) {
  if (!frame) return false
  if (frame.tagName === 'IFRAME') return false
  if (frame.getAttribute('data-map-embed') === '1') return false
  if (frame.querySelector('iframe')) return false
  if (frame.dataset.ymapsReady === '1') return false
  return true
}

function initContactMaps() {
  if (typeof ymaps === 'undefined') return

  CONTACTS_OFFICES.forEach((office) => {
    const container = document.getElementById(`map-${office.id}`)
    if (!container || !frameNeedsJsMap(container)) return

    const map = new ymaps.Map(`map-${office.id}`, {
      center: office.center,
      zoom: office.zoom,
      controls: ['zoomControl'],
    })

    container.dataset.ymapsReady = '1'
    map.behaviors.disable('scrollZoom')
    map.events.add('load', () => applyMapGrayscale(container))
    setTimeout(() => applyMapGrayscale(container), 300)

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

    placemark.events.add('mouseenter', () => placemark.balloon.open())
    placemark.events.add('mouseleave', () => placemark.balloon.close())
    map.geoObjects.add(placemark)
  })
}

function activateContactsMapTab(tab) {
  if (!tab) return
  const contactsMapTabs = document.querySelectorAll('.contacts-map-tab, [data-map-tab]')
  const contactsMapFrames = document.querySelectorAll('.contacts-map-frame, [data-map-frame]')
  contactsMapTabs.forEach((item) => item.classList.remove('active'))
  tab.classList.add('active')
  const office = tab.getAttribute('data-office')
  contactsMapFrames.forEach((frame) => {
    frame.hidden = frame.getAttribute('data-office') !== office
  })
}

function ensureYandexMapsForPlaceholders() {
  const jsMapFrames = [...document.querySelectorAll('.contacts-map-frame, [data-map-frame]')].filter(
    frameNeedsJsMap,
  )
  if (jsMapFrames.length === 0) return

  if (typeof ymaps !== 'undefined') {
    ymaps.ready(initContactMaps)
    return
  }

  if (document.getElementById('contacts-yandex-maps-sdk')) {
    return
  }

  const yandexMapsUrl =
    'https://api-maps.yandex.ru/2.1/?lang=ru_RU' +
    (YANDEX_MAPS_API_KEY ? `&apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}` : '')

  const script = document.createElement('script')
  script.id = 'contacts-yandex-maps-sdk'
  script.src = yandexMapsUrl
  script.onload = () => ymaps.ready(initContactMaps)
  document.head.appendChild(script)
}

export function initContactsMaps() {
  if (!document.body.dataset.contactsMapsInit) {
    document.body.dataset.contactsMapsInit = '1'
    // Delegation survives React re-renders that replace tab nodes after CMS hydrate.
    document.addEventListener('click', (event) => {
      const tab = event.target?.closest?.('.contacts-map-tab, [data-map-tab]')
      if (!tab || !document.contains(tab)) return
      activateContactsMapTab(tab)
    })
  }

  const contactsMapTabs = document.querySelectorAll('.contacts-map-tab, [data-map-tab]')
  const contactsMapFrames = document.querySelectorAll('.contacts-map-frame, [data-map-frame]')
  if (contactsMapTabs.length === 0 || contactsMapFrames.length === 0) return

  const activeTab =
    [...contactsMapTabs].find((tab) => tab.classList.contains('active')) || contactsMapTabs[0]
  activateContactsMapTab(activeTab)

  ensureYandexMapsForPlaceholders()

  // Placeholders may appear after CMS hydrate (embed → null). Re-check once DOM settles.
  if (!document.body.dataset.contactsMapsObserve) {
    document.body.dataset.contactsMapsObserve = '1'
    const root = document.querySelector('[data-react-page="contacts"]') || document.body
    const observer = new MutationObserver(() => {
      ensureYandexMapsForPlaceholders()
    })
    observer.observe(root, { childList: true, subtree: true })
  }
}
