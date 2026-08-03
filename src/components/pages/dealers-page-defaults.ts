/**
 * Hardcoded-first defaults for Dealers CMS hydrate (Phase 4C).
 * Shape matches public GET /api/pages/dealers `data`.
 * quality video/play remain code-owned; quality_image is merge-only (optional poster).
 */

import { CONTACT_ICON_SRC } from './hotels-page-defaults'

export { CONTACT_ICON_SRC }

export type PagesMedia = { url: string } | null

export type DealersPageContent = {
  hero: {
    title: string
    description: string
    image: PagesMedia
    image_alt: string
    cta_label: string
    cta_url: string
  }
  stats: Array<{ label: string; value: string }>
  conditions_title: string
  conditions_subtitle: string
  conditions: Array<{ title: string; text: string; href: string }>
  conditions_icon: PagesMedia
  offers_title: string
  offers_subtitle: string
  offers: Array<{
    title: string
    icon: PagesMedia
    bullets: Array<{ title: string; text: string; href: string }>
  }>
  geography_title: string
  geography_subtitle: string
  geography_map_image: PagesMedia
  geography_cities: Array<{ name: string; badge: string; sort_order: number }>
  quality_title: string
  quality_body: string
  quality_image: PagesMedia
  requirements_title: string
  requirements_subtitle: string
  requirements: Array<{
    title: string
    icon: PagesMedia
    bullets: Array<{ title: string; text: string; href: string }>
  }>
  packages_title: string
  packages_subtitle: string
  packages: Array<{
    value: 'standard' | 'individual' | 'exclusive'
    title: string
    price: string
    form_option_label: string
    cta_label: string
    featured: boolean
    features: Array<{ title: string; text: string; href: string }>
  }>
  contact_section_title: string
  contact_form_title: string
  contact_submit_label: string
  contact_package_field_label: string
  contact_package_placeholder: string
  contact_info: Array<{
    title: string
    value: string
    note: string
    href: string
    icon_key: 'phone' | 'email' | 'location'
  }>
  faq_title: string
  faq_items: Array<{ question: string; answer: string; open_by_default: boolean }>
}

export const DEALERS_CONTACT_FORM_FIELDS = [
  { id: 'name', label: 'Имя', placeholder: 'Иван Иванов', type: 'text' as const },
  { id: 'city', label: 'Город', placeholder: 'Москва', type: 'text' as const },
  { id: 'email', label: 'E-mail', placeholder: 'example@company.com', required: true, type: 'email' as const },
  { id: 'phone', label: 'Телефон', placeholder: '+7 (999) 123-45-67', type: 'tel' as const },
  { id: 'message', label: 'Сообщение', placeholder: 'Ваше сообщение', type: 'textarea' as const },
] as const

/** Code-owned quality video chrome (CMS quality_image is poster-only / merge-only). */
export const DEALERS_QUALITY_VIDEO = {
  poster: '/quality-video-poster.avif',
  webm: '/quality-video.webm',
  mp4: '/quality-video.mp4',
  posterFallbackJpg: '/quality-video-poster.jpg',
  posterWebp: '/quality-video-poster.webp',
} as const

export const DEALERS_BASELINE_SECTIONS = [
  'page-hero',
  'conditions-section',
  'offers-section',
  'geography-section',
  'quality-section',
  'requirements-section',
  'packages-section',
  'contact-section',
  'faq-section',
] as const

function media(url: string): PagesMedia {
  return { url }
}

function feature(title: string) {
  return { title, text: '', href: '' }
}

function bullet(title: string) {
  return { title, text: '', href: '' }
}

const GEOGRAPHY_CITIES: DealersPageContent['geography_cities'] = [
  { name: 'Г. Краснодар', badge: 'скоро', sort_order: 0 },
  { name: 'Г. Тула', badge: '', sort_order: 1 },
  { name: 'Г. Саратов', badge: '', sort_order: 2 },
  { name: 'Г. Воронеж', badge: '', sort_order: 3 },
  { name: 'Г. Волгоград', badge: '', sort_order: 4 },
  { name: 'Г. Орел', badge: '', sort_order: 5 },
  { name: 'Г. Курск', badge: '', sort_order: 6 },
  { name: 'Г. Кашира', badge: '', sort_order: 7 },
  { name: 'Г. Пенза', badge: '', sort_order: 8 },
  { name: 'Г. Липецк', badge: '', sort_order: 9 },
  { name: 'Г. Самара', badge: '', sort_order: 10 },
  { name: 'Г. Новомосковск', badge: '', sort_order: 11 },
  { name: 'Г. Белгород', badge: '', sort_order: 12 },
  { name: 'Г. Тамбов', badge: '', sort_order: 13 },
  { name: 'Г. Павловск', badge: '', sort_order: 14 },
  { name: 'Г. Таганрог', badge: '', sort_order: 15 },
  { name: 'Г. Ростов на Дону', badge: '', sort_order: 16 },
  { name: 'Г. Алексеевка', badge: '', sort_order: 17 },
  { name: 'Г. Острогорск', badge: '', sort_order: 18 },
  { name: 'Г. Старый оскол', badge: '', sort_order: 19 },
  { name: 'Г. Новый оскол', badge: '', sort_order: 20 },
  { name: 'Г. Валуйки', badge: '', sort_order: 21 },
  { name: 'Г. Моршанск', badge: '', sort_order: 22 },
  { name: 'Г. Мичуринск', badge: '', sort_order: 23 },
  { name: 'Г. Мценск', badge: '', sort_order: 24 },
  { name: 'Г. Серпухов', badge: '', sort_order: 25 },
  { name: 'Г. Миллерово', badge: '', sort_order: 26 },
  { name: 'Г. Богучар', badge: '', sort_order: 27 },
  { name: 'Г. Калач', badge: '', sort_order: 28 },
  { name: 'Г. Симферополь', badge: '', sort_order: 29 },
  { name: 'Г. Севастополь', badge: '', sort_order: 30 },
  { name: 'Г. Ялта', badge: '', sort_order: 31 },
  { name: 'Г. Керчь', badge: '', sort_order: 32 },
  { name: 'Г. Евпатория', badge: '', sort_order: 33 },
  { name: 'Г. Саки', badge: '', sort_order: 34 },
  { name: 'Г. Джанкой', badge: '', sort_order: 35 },
  { name: 'Г. Феодосия', badge: '', sort_order: 36 },
  { name: 'Г. Луганск', badge: '', sort_order: 37 },
  { name: 'Г. Донецк', badge: '', sort_order: 38 },
  { name: 'Г. Лисичанск', badge: '', sort_order: 39 },
  { name: 'Г. Мариуполь', badge: '', sort_order: 40 },
  { name: 'Г. Макеевка', badge: '', sort_order: 41 },
  { name: 'Г. Мелитополь', badge: '', sort_order: 42 },
]

export const DEALERS_PAGE_DEFAULTS: DealersPageContent = {
  hero: {
    title: 'Дилерская программа Grassigrosso',
    description: 'Станьте официальным дилером премиальных матрасов.\nРазвивайте свой бизнес с надежным производителем.',
    image: media('/dealers-hero.png'),
    image_alt: 'Интерьер спальни',
    cta_label: 'Стать дилером',
    cta_url: '#contact-form',
  },
  stats: [
    { label: 'Партнеров', value: '250+' },
    { label: 'Городов', value: '50+' },
    { label: 'Точек продаж', value: '350+' },
    { label: 'Матрасов продано', value: '35 000' },
    { label: 'Дней гарантии', value: '6 500' },
  ],
  conditions_title: 'Условия участия',
  conditions_subtitle: 'Простые шаги для начала сотрудничества',
  conditions: [
    { title: 'Наличие торговой точки или шоурума', text: '', href: '' },
    { title: 'Опыт работы в мебельной отрасли приветствуется', text: '', href: '' },
    { title: 'Фокус на категорию продукта', text: '', href: '' },
  ],
  conditions_icon: media('/icon-hand-pointer.svg'),
  offers_title: 'Что мы предлагаем',
  offers_subtitle: 'Комплексная поддержка для успешного развития вашего бизнеса',
  offers: [
    {
      title: 'Маркетинговая поддержка',
      icon: media('/icon-megaphone.svg'),
      bullets: [
        bullet('Рекламные материалы'),
        bullet('Каталоги и образцы'),
        bullet('Обучение продажам'),
        bullet('Совместные акции'),
      ],
    },
    {
      title: 'Логистика и сервис',
      icon: media('/icon-truck.svg'),
      bullets: [
        bullet('Доставка по России'),
        bullet('Складская программа'),
        bullet('Гарантийное обслуживание'),
        bullet('Техническая поддержка'),
      ],
    },
  ],
  geography_title: 'География дилеров',
  geography_subtitle: 'Наши дилеры работают в крупнейших городах России',
  geography_map_image: media('/Map.svg'),
  geography_cities: GEOGRAPHY_CITIES,
  quality_title: 'Качество под контролем',
  quality_body:
    'Собственная система распределенного производства и локализованная сборочная линия позволяет нам гарантировать максимальное качество компонентов продукции и контролировать производство на каждом этапе.\nСрок производства от 3 дней. Стандартные сроки поставки от 5 дней.\nСовременное оборудование, сертифицированные материалы и строгий контроль качества – основа нашего успеха и гарантия вашей прибыли.',
  quality_image: media('/quality-video-poster.avif'),
  requirements_title: 'Требования к дилерам',
  requirements_subtitle: 'Для успешного сотрудничества важны следующие критерии',
  requirements: [
    {
      title: 'Обязательные требования',
      icon: media('/icon-badge.svg'),
      bullets: [
        bullet('Юридическое лицо или ИП'),
        bullet('Торговая площадь от 50 м² или онлайн магазин'),
        bullet('Опыт продаж мебели/матрасов'),
        bullet('Собственный шоурум или магазин'),
      ],
    },
    {
      title: 'Желательные требования',
      icon: media('/icon-thumbs-up.svg'),
      bullets: [
        bullet('Наличие склада'),
        bullet('Собственная служба доставки'),
        bullet('Опыт работы с премиум-сегментом'),
        bullet('База постоянных клиентов'),
      ],
    },
  ],
  packages_title: 'Дилерские пакеты',
  packages_subtitle: 'Выберите подходящий уровень сотрудничества',
  packages: [
    {
      value: 'standard',
      title: 'СТАНДАРТ',
      price: 'От 100 000 р',
      form_option_label: 'СТАНДАРТ – От 100 000 р',
      cta_label: 'Выбрать пакет',
      featured: false,
      features: [
        feature('Каталоги и образцы'),
        feature('Обучение'),
        feature('Онлайн и телефон поддержка'),
      ],
    },
    {
      value: 'individual',
      title: 'ИНДИВИДУАЛЬНЫЙ',
      price: 'От 300 000 р',
      form_option_label: 'ИНДИВИДУАЛЬНЫЙ – От 300 000 р',
      cta_label: 'Выбрать пакет',
      featured: true,
      features: [
        feature('Каталоги и образцы'),
        feature('Расширенное обучение'),
        feature('Онлайн и телефон поддержка'),
        feature('Персональный менеджер'),
        feature('Сертификат Grassigrosso'),
        feature('Гибкая система скидок'),
      ],
    },
    {
      value: 'exclusive',
      title: 'ЭКСКЛЮЗИВНЫЙ',
      price: 'От 800 000 р',
      form_option_label: 'ЭКСКЛЮЗИВНЫЙ – От 800 000 р',
      cta_label: 'Выбрать пакет',
      featured: false,
      features: [
        feature('Полный комплект материалов'),
        feature('Эксклюзивная программа'),
        feature('Расширенный ассортимент'),
        feature('Приоритетная поддержка'),
        feature('Персональный менеджер'),
        feature('Максимальная скидка'),
        feature('Брендирование торговых площадей'),
        feature('Сертификат Grassigrosso'),
        feature('Эксклюзивная представленность в городе (ТЦ)'),
      ],
    },
  ],
  contact_section_title: 'Доброе утро!',
  contact_form_title: 'Стать дилером',
  contact_submit_label: 'Отправить',
  contact_package_field_label: 'Пакет',
  contact_package_placeholder: 'Выберите пакет',
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
      value: 'b2b@grassigrosso.com',
      note: 'Ответим в течение 24 часов в рамках рабочего времени',
      href: 'mailto:b2b@grassigrosso.com',
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
  faq_title: 'Часто задаваемые вопросы',
  faq_items: [
    {
      question: 'Как быстро происходит запуск?',
      answer:
        'После согласования условий и ассортимента старт возможен в короткие сроки. Срок зависит от объёма входной поставки и комплектации шоурума.',
      open_by_default: true,
    },
    {
      question: 'Есть ли маркетинговая поддержка?',
      answer: 'Да, мы предоставляем каталоги, образцы, обучающие материалы и совместные маркетинговые активности.',
      open_by_default: false,
    },
    {
      question: 'Можно ли подобрать пакет под формат магазина?',
      answer: 'Да, дилерский пакет можно подобрать под масштаб и формат вашей торговой точки.',
      open_by_default: false,
    },
  ],
}
