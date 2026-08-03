/**
 * Hardcoded-first defaults for Hotels CMS hydrate (Phase 4C).
 * Shape matches public GET /api/pages/hotels `data`.
 * Hydrate only fills existing baseline slots — no new sections/cards.
 */

export type PagesMedia = { url: string } | null

export type HotelsPageContent = {
  hero: {
    title: string
    description: string
    image: PagesMedia
    image_alt: string
    cta_label: string
    cta_url: string
  }
  stats: Array<{ label: string; value: string }>
  stats_note: string
  categories_title: string
  categories: Array<{ name: string; text: string; active: boolean }>
  products: Array<{
    catalog_key: string
    title: string
    description: string
    image: PagesMedia
    image_alt: string
    cta_label: string
  }>
  discount_title: string
  discount_subtitle: string
  discount_col_amount: string
  discount_col_discount: string
  discount_col_terms: string
  discount_rows: Array<{
    amount_label: string
    discount_label: string
    terms_label: string
    highlight: boolean
  }>
  discount_note: string
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
  refresh_badge: string
  refresh_title: string
  refresh_description: string
  refresh_features: Array<{ title: string; text: string; icon: PagesMedia }>
  refresh_cta_label: string
  faq_title: string
  faq_items: Array<{ question: string; answer: string; open_by_default: boolean }>
}

/** Code-owned contact icons (never from CMS URL). */
export const CONTACT_ICON_SRC: Readonly<Record<'phone' | 'email' | 'location', string>> = {
  phone: '/icon-phone-vectorly.svg',
  email: '/icon-email-vectorly.svg',
  location: '/icon-location-vectorly.svg',
}

/** Code-owned responsive picture sources by catalog_key. */
export const HOTELS_PRODUCT_PICTURE: Readonly<
  Record<string, { avif: string; webp: string; fallback: string; src: string; fallbackType: string }>
> = {
  boxspring: {
    avif: '/boxspring@2x.avif 2x, /boxspring.avif 1x',
    webp: '/boxspring@2x.webp 2x, /boxspring.webp 1x',
    fallback: '/boxspring@2x.jpg 2x, /boxspring.jpg 1x',
    src: '/boxspring.jpg',
    fallbackType: 'image/jpeg',
  },
  accessories: {
    avif: '/accessories@2x.avif 2x, /accessories.avif 1x',
    webp: '/accessories@2x.webp 2x, /accessories.webp 1x',
    fallback: '/accessories@2x.png 2x, /accessories.png 1x',
    src: '/accessories.png',
    fallbackType: 'image/png',
  },
}

/** Code-owned form field chrome (not CMS). */
export const HOTELS_CONTACT_FORM_FIELDS = [
  { id: 'name', label: 'Имя', placeholder: 'Иван Иванов', type: 'text' as const },
  { id: 'city', label: 'Город', placeholder: 'Москва', type: 'text' as const },
  { id: 'email', label: 'E-mail', placeholder: 'example@company.com', required: true, type: 'email' as const },
  { id: 'phone', label: 'Телефон', placeholder: '+7 (999) 123-45-67', type: 'tel' as const },
  { id: 'message', label: 'Сообщение', placeholder: 'Ваше сообщение', type: 'textarea' as const },
] as const

/** Code-owned categories CTA copy (not in CMS schema). */
export const HOTELS_CATEGORIES_CTA = {
  question: 'Хотите узнать больше о характеристиках и стоимости этих моделей?',
  button: 'Подобрать наилучшее предложение',
} as const

function media(url: string): PagesMedia {
  return { url }
}

export const HOTELS_PAGE_DEFAULTS: HotelsPageContent = {
  hero: {
    title: 'Сон, о котором хочется написать в отзыве',
    description:
      'Инвестиция в первое впечатление от утра ваших гостей.\nПродуманные системы для сна, которые дают ощущение пятизвёздочного сна в отеле любой категории.',
    image: media('/hotels-hero.png'),
    image_alt: 'Интерьер спальни',
    cta_label: 'Рассчитать КП',
    cta_url: '#',
  },
  stats: [
    { label: 'Матрасов', value: '30 000+' },
    { label: 'На рынке', value: '3 года' },
    { label: 'Гарантия', value: '18 мес' },
    { label: 'Расширенная гарантия', value: '3 года' },
  ],
  stats_note: '* При заключении договора на плановую замену матрасов',
  categories_title: 'Решения по категории отеля',
  categories: [
    {
      name: 'Люкс',
      text: 'Бескомпромиссный комфорт для самых взыскательных гостей. Высокие матрасы с натуральными наполнителями премиум-класса. Индивидуальный подход к каждому номеру.',
      active: false,
    },
    {
      name: 'Полулюкс',
      text: 'Баланс комфорта и практичности для требовательных гостей. Качественные материалы и продуманная эргономика. Оптимальное соотношение цены и качества.',
      active: false,
    },
    {
      name: 'Стандарт',
      text: 'Мы подобрали оптимальные модели для каждого сегмента. Надежные матрасы с отличной поддержкой. Долговечность и простота в обслуживании.',
      active: true,
    },
    {
      name: 'Мини-отели',
      text: 'Компактные решения для небольших номеров. Функциональность без компромиссов по качеству сна. Экономичные варианты для оптимизации бюджета.',
      active: false,
    },
  ],
  products: [
    {
      catalog_key: 'boxspring',
      title: 'BoxSpring',
      description:
        'Основания для кроватей и изголовья. Надежная база и стильный дизайн для любого интерьера.',
      image: media('/boxspring.jpg'),
      image_alt: 'BoxSpring',
      cta_label: 'Подробнее',
    },
    {
      catalog_key: 'accessories',
      title: 'Аксессуары',
      description:
        'Корректирующие топперы, наматрасники и другие финальные штрихи для идеального спального места.',
      image: media('/accessories.png'),
      image_alt: 'Аксессуары',
      cta_label: 'Подробнее',
    },
  ],
  discount_title: 'Система скидок от объема',
  discount_subtitle:
    'Наша миссия помогать людям восстанавливаться естественным образом через продуманные решения для сна. Мы разделяем ценности индустрии гостеприимства и открыты к гибкому, долгосрочному партнёрству.',
  discount_col_amount: 'Сумма заказа',
  discount_col_discount: 'Скидка',
  discount_col_terms: 'Условия',
  discount_rows: [
    {
      amount_label: 'от 250 000 ₽',
      discount_label: '7%',
      terms_label: 'Базовые условия',
      highlight: true,
    },
    {
      amount_label: 'от 450 000 ₽',
      discount_label: '12%',
      terms_label: 'Расширенные условия',
      highlight: false,
    },
    {
      amount_label: 'от 1 млн ₽',
      discount_label: 'Индивидуально',
      terms_label: 'Персональное предложение',
      highlight: true,
    },
  ],
  discount_note: '* Точную стоимость и размер скидки рассчитает менеджер',
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
      value: 'hotels@grassigrosso.com',
      note: 'Ответим в течение 24 часов в рамках рабочего времени',
      href: 'mailto:hotels@grassigrosso.com',
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
  refresh_badge: 'Refresh-программа',
  refresh_title: 'Плановая замена матрасов',
  refresh_description:
    'Программа регулярного обновления матрасного фонда отеля. Сфокусируйтесь на главном, а мы позаботимся о комфортном восстановлении ваших гостей.',
  refresh_features: [
    {
      title: 'Плановая замена',
      text: 'График замены матрасов согласно регламенту отеля',
      icon: media('/icon-calendar.svg'),
    },
    {
      title: 'Специальные условия',
      text: 'Фиксированные условия сотрудничества и приоритетное производство для участников программы',
      icon: media('/icon-hand-gesture.svg'),
    },
  ],
  refresh_cta_label: 'Подключить Refresh-программу',
  faq_title: 'Часто задаваемые вопросы',
  faq_items: [
    {
      question: 'Как быстро производите?',
      answer: 'Срок производства составляет от 3 дней в зависимости от объёма заказа и выбранных моделей.',
      open_by_default: true,
    },
    {
      question: 'Доставляете ли в регионы?',
      answer:
        'Да, мы осуществляем доставку по всей России. Стоимость и сроки доставки рассчитываются индивидуально в зависимости от региона и объема заказа.',
      open_by_default: false,
    },
    {
      question: 'Какие есть способы оплаты?',
      answer:
        'Мы принимаем все способы оплаты, а также работаем по системе отсрочки платежа для постоянных клиентов.\nВсе условия оплаты обсуждаются индивидуально.',
      open_by_default: false,
    },
  ],
}

/** Baseline section allowlist (exact order). */
export const HOTELS_BASELINE_SECTIONS = [
  'page-hero',
  'hotel-categories-section',
  'product-cards-section',
  'discount-section',
  'contact-section',
  'refresh-section',
  'faq-section',
] as const
