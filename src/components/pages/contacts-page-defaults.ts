/**
 * Hardcoded-first defaults for Contacts CMS hydrate (Phase 4D).
 * Public shape uses map_embed_url (never map_iframe_html).
 * Hydrate only fills existing baseline slots — no new offices/sections.
 */

import { CONTACT_ICON_SRC } from './hotels-page-defaults'

export { CONTACT_ICON_SRC }

export type PagesMedia = { url: string } | null

export type ContactsOffice = {
  slug: 'main' | 'voronezh' | 'lnr' | 'dnr'
  tab_label: string
  badge: string
  city: string
  region: string
  address: string
  phone: string
  phone_href: string
  email: string
  schedule: string
  /** Allowlisted HTTPS map widget URL, or null → JS/placeholder map path. */
  map_embed_url: string | null
}

export type ContactsPageContent = {
  hero: {
    title: string
    description: string
    image: PagesMedia
    image_alt: string
    cta_label: string
    cta_url: string
  }
  offices_title: string
  offices: ContactsOffice[]
  map_title: string
  contact_section_title: string
  contact_form_title: string
  contact_submit_label: string
  contact_info: Array<{
    title: string
    value: string
    note: string
    href: string
    icon_key: 'phone' | 'email' | 'location'
  }>
}

export const CONTACTS_CONTACT_FORM_FIELDS = [
  { id: 'name', label: 'Имя', placeholder: 'Иван Иванов', type: 'text' as const },
  { id: 'city', label: 'Город', placeholder: 'Москва', type: 'text' as const },
  { id: 'email', label: 'E-mail', placeholder: 'example@company.com', required: true, type: 'email' as const },
  { id: 'phone', label: 'Телефон', placeholder: '+7 (999) 123-45-67', type: 'tel' as const },
  { id: 'message', label: 'Сообщение', placeholder: 'Ваше сообщение', type: 'textarea' as const },
] as const

/** Code-owned responsive hero when CMS hero.image is absent. */
export const CONTACTS_HERO_PICTURE = {
  avif: '/contacts-hero@2x.avif 2x, /contacts-hero.avif 1x',
  webp: '/contacts-hero@2x.webp 2x, /contacts-hero.webp 1x',
  png: '/contacts-hero@2x.png 2x, /contacts-hero.png 1x',
  src: '/contacts-hero.png',
} as const

export const CONTACTS_BASELINE_SECTIONS = [
  'contacts-hero',
  'contacts-offices',
  'contacts-map',
  'contact-section',
] as const

export const CONTACTS_OFFICE_SLUGS = ['main', 'voronezh', 'lnr', 'dnr'] as const

function media(url: string): PagesMedia {
  return { url }
}

export const CONTACTS_PAGE_DEFAULTS: ContactsPageContent = {
  hero: {
    title: 'Контакты',
    description: 'Свяжитесь с нами удобным способом. Мы всегда готовы ответить на ваши вопросы.',
    image: media('/contacts-hero.png'),
    image_alt: 'Интерьер спальни',
    cta_label: '',
    cta_url: '',
  },
  offices_title: 'Наши офисы',
  offices: [
    {
      slug: 'main',
      tab_label: 'Главный офис',
      badge: 'Главный офис',
      city: 'Симферополь',
      region: '',
      address: 'ул. Кубанская д. 25',
      phone: '+ 7 (978) 248-43-80',
      phone_href: 'tel:+79782484380',
      email: 'sales@grassigrosso.com',
      schedule: 'Пн-Пт: 9:00 - 18:00',
      map_embed_url: 'https://yandex.ru/map-widget/v1/?ll=34.152577%2C44.970737&z=16',
    },
    {
      slug: 'voronezh',
      tab_label: 'Центральная Россия',
      badge: 'Представительство',
      city: 'Воронеж',
      region: 'Центральная Россия',
      address: 'ул. Остужева 43 И',
      phone: '+7 (978) 075-71-74',
      phone_href: 'tel:+79780757174',
      email: 'voronezh@grassigrosso.com',
      schedule: 'Пн-Пт: 9:00 - 18:00',
      map_embed_url: 'https://yandex.ru/map-widget/v1/?ll=39.297287%2C51.681129&z=16',
    },
    {
      slug: 'lnr',
      tab_label: 'ЛНР',
      badge: 'Представительство',
      city: 'Луганск',
      region: 'Луганская Народная Республика',
      address: 'ул. Фабричная д 1',
      phone: '+7 (959) 201-18-08',
      phone_href: 'tel:+79592011808',
      email: 'LNR@grassigrosso.com',
      schedule: 'Пн-Пт: 9:00 - 18:00',
      map_embed_url: 'https://yandex.ru/map-widget/v1/?ll=39.32438%2C48.541403&z=16',
    },
    {
      slug: 'dnr',
      tab_label: 'ДНР',
      badge: 'Представительство',
      city: 'Харцизск',
      region: 'Донецкая Народная Республика',
      address: 'ул. Вокзальная, д. 52',
      phone: '+7 (949) 410-67-60',
      phone_href: 'tel:+79494106760',
      email: 'DNR@grassigrosso.com',
      schedule: 'Пн-Пт: 8:00 - 17:00',
      map_embed_url: 'https://yandex.ru/map-widget/v1/?ll=38.147954%2C48.035223&z=16',
    },
  ],
  map_title: 'Как нас найти',
  contact_section_title: 'Доброе утро!',
  contact_form_title: 'Форма обратной связи',
  contact_submit_label: 'Отправить',
  contact_info: [
    {
      title: 'Телефон',
      value: '+ 7 (978) 248-43-80',
      note: 'Пн-Пт: 9:00 - 18:00 МСК',
      href: 'tel:+79782484380',
      icon_key: 'phone',
    },
    {
      title: 'Email',
      value: 'sales@grassigrosso.com',
      note: 'Ответим в течение 24 часов в рамках рабочего времени',
      href: 'mailto:sales@grassigrosso.com',
      icon_key: 'email',
    },
    {
      title: 'Адрес',
      value: 'Симферополь, ул. Кубанская д. 25',
      note: 'Главный офис',
      href: '',
      icon_key: 'location',
    },
  ],
}
