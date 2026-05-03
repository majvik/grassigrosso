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

function initContactMaps() {
  if (typeof ymaps === 'undefined') return

  CONTACTS_OFFICES.forEach((office) => {
    const container = document.getElementById(`map-${office.id}`)
    if (!container) return

    const map = new ymaps.Map(`map-${office.id}`, {
      center: office.center,
      zoom: office.zoom,
      controls: ['zoomControl'],
    })

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

export function initContactsMaps() {
  const contactsMapTabs = document.querySelectorAll('.contacts-map-tab')
  const contactsMapFrames = document.querySelectorAll('.contacts-map-frame')
  if (contactsMapTabs.length === 0 || contactsMapFrames.length === 0) return

  const yandexMapsUrl = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU'
    + (YANDEX_MAPS_API_KEY ? `&apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}` : '')

  const script = document.createElement('script')
  script.src = yandexMapsUrl
  script.onload = () => ymaps.ready(initContactMaps)
  document.head.appendChild(script)

  contactsMapTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      contactsMapTabs.forEach((item) => item.classList.remove('active'))
      tab.classList.add('active')
      const office = tab.getAttribute('data-office')
      contactsMapFrames.forEach((frame) => {
        frame.hidden = frame.getAttribute('data-office') !== office
      })
    })
  })
}
