/**
 * Hardcoded-first defaults for Documents CMS hydrate (Phase 4D).
 * Behavior-bound document_key values drive data-document hooks.
 * Hydrate only fills existing baseline slots — no new cards/sections.
 */

export type PagesMedia = { url: string } | null

export type DocumentsCard = {
  document_key: string
  title: string
  type_label: string
  size_label: string
  request_label: string
  request_aria_label: string
  kind: string
  file: PagesMedia
}

export type DocumentsPageContent = {
  hero: {
    title: string
    description: string
    image: PagesMedia
    image_alt: string
    cta_label: string
    cta_url: string
  }
  certificates_title: string
  certificates: DocumentsCard[]
  company_title: string
  company_illustration: PagesMedia
  company_documents: DocumentsCard[]
  help_title: string
  help_body: string
  help_cta_label: string
  faq_title: string
  faq_items: Array<{ question: string; answer: string; open_by_default: boolean }>
}

/** Code-owned responsive hero when CMS hero.image is absent. */
export const DOCUMENTS_HERO_PICTURE = {
  avif: '/docs-hero@2x.avif 2x, /docs-hero.avif 1x',
  webp: '/docs-hero@2x.webp 2x, /docs-hero.webp 1x',
  png: '/docs-hero@2x.png 2x, /docs-hero.png 1x',
  src: '/docs-hero.png',
} as const

export const DOCUMENTS_COMPANY_ILLUSTRATION_FALLBACK = '/catalog-illustration.svg'

export const DOCUMENTS_BASELINE_SECTIONS = [
  'documents-hero',
  'documents-certification',
  'documents-commercial',
  'documents-help',
  'documents-faq',
] as const

export const DOCUMENTS_CERTIFICATE_KEYS = ['declaration', 'certificate', 'trademark'] as const
export const DOCUMENTS_COMPANY_KEYS = ['catalog', 'presentation'] as const

function media(url: string): PagesMedia {
  return { url }
}

export const DOCUMENTS_PAGE_DEFAULTS: DocumentsPageContent = {
  hero: {
    title: 'Документы и сертификаты',
    description:
      'Полная прозрачность и соответствие стандартам. Мы предоставляем всю необходимую документацию для работы.',
    image: media('/docs-hero.png'),
    image_alt: 'Интерьер спальни',
    cta_label: '',
    cta_url: '',
  },
  certificates_title: 'Официальная сертификация',
  certificates: [
    {
      document_key: 'declaration',
      title: 'Евразийский Экономический Союз. Декларация о соответствии',
      type_label: 'Декларация',
      size_label: '2.5 MB',
      request_label: 'ЗАПРОСИТЬ',
      request_aria_label: 'Запросить декларацию',
      kind: 'certificate',
      file: media('/documents/Deklaraciya.pdf'),
    },
    {
      document_key: 'certificate',
      title: 'Результаты лабораторных испытаний «ПромМаш Тест»',
      type_label: 'Сертификат',
      size_label: '1.8 MB',
      request_label: 'ЗАПРОСИТЬ',
      request_aria_label: 'Запросить сертификат',
      kind: 'certificate',
      file: media('/documents/Sertifikat.pdf'),
    },
    {
      document_key: 'trademark',
      title: 'Свидетельство на товарный знак GrassiGrosso',
      type_label: 'Товарный знак',
      size_label: '1.2 MB',
      request_label: 'ЗАПРОСИТЬ',
      request_aria_label: 'Запросить свидетельство',
      kind: 'certificate',
      file: media('/documents/Trademark.pdf'),
    },
  ],
  company_title: 'О компании Grassigrosso',
  company_illustration: media('/catalog-illustration.svg'),
  company_documents: [
    {
      document_key: 'catalog',
      title: 'Каталог продукции',
      type_label: 'PDF документ',
      size_label: '',
      request_label: 'Запросить',
      request_aria_label: 'Запросить каталог продукции',
      kind: 'company',
      file: media('/documents/Catalog_v1.2.pdf'),
    },
    {
      document_key: 'presentation',
      title: 'Презентация компании',
      type_label: 'PDF документ',
      size_label: '',
      request_label: 'Запросить',
      request_aria_label: 'Запросить презентацию компании',
      kind: 'company',
      file: media('/documents/presentation.pdf'),
    },
  ],
  help_title: 'Нужна помощь с документами?',
  help_body: 'Наши менеджеры готовы предоставить любые необходимые документы по запросу',
  help_cta_label: 'Связаться с менеджером',
  faq_title: 'Часто задаваемые вопросы',
  faq_items: [
    {
      question: 'Как быстро производите?',
      answer:
        'Стандартные сроки производства составляют 3 рабочих дня с момента подтверждения заказа. Для индивидуальных проектов сроки согласовываются отдельно.',
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
