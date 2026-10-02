import { useEffect, useLayoutEffect, useState } from 'react'
import { COOKIE_CONSENT_EVENT, readEffectiveConsent } from '@/cookie-consent'
import { mountOfficeMap } from '@/contacts-maps'

export const MAP_PLACEHOLDER_KEY_BY_SLUG = {
  main: 'simferopol',
  voronezh: 'voronezh',
  lnr: 'lugansk',
  dnr: 'khartsyzsk',
} as const

type OfficeSlug = keyof typeof MAP_PLACEHOLDER_KEY_BY_SLUG

const MAP_CONSENT_TEXT =
  'В соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» интерактивная карта Яндекса не загружается без вашего согласия. При загрузке карты сервису могут передаваться технические данные, включая IP-адрес. '

function useYandexMapsGranted() {
  const [granted, setGranted] = useState(() => readEffectiveConsent().yandexMaps === 'granted')
  useEffect(() => {
    const sync = () => setGranted(readEffectiveConsent().yandexMaps === 'granted')
    window.addEventListener(COOKIE_CONSENT_EVENT, sync)
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, sync)
  }, [])
  return granted
}

export function OfficeMapSlot({ slug, active }: { slug: OfficeSlug; active: boolean }) {
  const granted = useYandexMapsGranted()
  const placeholderKey = MAP_PLACEHOLDER_KEY_BY_SLUG[slug]
  const base = `/images/map-consent/${placeholderKey}`

  useLayoutEffect(() => {
    if (!granted || !active) return
    const host = document.getElementById(`map-${slug}`)
    if (host) mountOfficeMap(host, slug)
  })

  return (
    <div
      className="contacts-map-frame"
      id={`map-${slug}`}
      data-office={slug}
      data-map-frame
      data-map-placeholder={placeholderKey}
      hidden={!active}
    >
      {granted ? null : (
        <>
          <picture>
            <source type="image/avif" srcSet={`${base}@2x.avif 2x, ${base}.avif 1x`} />
            <source type="image/webp" srcSet={`${base}@2x.webp 2x, ${base}.webp 1x`} />
            <source type="image/png" srcSet={`${base}@2x.png 2x, ${base}.png 1x`} />
            <img src={`${base}.png`} alt="" aria-hidden="true" />
          </picture>
          <div className="contacts-map-consent-copy">
            <p>
              {MAP_CONSENT_TEXT}
              <a href="/cookies#yandex-maps">Подробнее</a>
            </p>
            <button type="button" className="btn-contact" data-map-consent-accept>
              Принять и отобразить карту
            </button>
          </div>
        </>
      )}
    </div>
  )
}
