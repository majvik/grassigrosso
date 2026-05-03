export interface CatalogPictureSourceSet {
  avif: string
  png?: string
  webp: string
}

export interface CatalogPictureImage {
  alt: string
  decoding?: 'async' | 'auto' | 'sync'
  fetchPriority?: 'auto' | 'high' | 'low'
  loading?: 'eager' | 'lazy'
  poster?: never
  sources: CatalogPictureSourceSet
  src: string
  type: 'image'
}

export interface CatalogVideoImage {
  ariaLabel: string
  poster: string
  sources: Array<{ src: string; type: string }>
  type: 'video'
}

export type CatalogHeroSlideAsset = CatalogPictureImage | CatalogVideoImage

export interface CatalogHeroSlideData {
  asset: CatalogHeroSlideAsset
  id: number
}

export interface CatalogChipOptionData {
  kind: 'chip'
  label: string
  value: string
}

export interface CatalogSelectOptionData {
  kind: 'select'
  label: string
  value: string
}

export type CatalogFilterOptionData = CatalogChipOptionData | CatalogSelectOptionData

export interface CatalogFilterGroupData {
  action?: 'load-range-reset' | 'size-help' | 'size-reset'
  actionLabel?: string
  defaultLabel: string
  expanded: boolean
  filterGroup: string
  headLabel?: string
  helpLabel: string
  helpOpen: string
  helpRowAriaLabel: string
  kind: 'chip' | 'select'
  options: CatalogFilterOptionData[]
  resetAction?: 'load-range-reset' | 'size-reset'
  resetLabel?: string
  searchPlaceholder?: string
  searchValueLabel?: string
  title: string
}

export interface CatalogFallbackCardData {
  collection: string
  firmness: string
  height: string
  image: CatalogPictureImage
  load: string
  metaHeightLabel: string
  metaLoadLabel: string
  slug: string
  tags: string[]
  title: string
  type: string
}

export const CATALOG_HERO_SLIDES: CatalogHeroSlideData[] = [
  {
    id: 0,
    asset: {
      alt: 'Интерьер спальни',
      decoding: 'async',
      fetchPriority: 'high',
      loading: 'eager',
      sources: {
        avif: '/catalog-hero@2x.avif 2x, /catalog-hero.avif 1x',
        png: '/catalog-hero@2x.png 2x, /catalog-hero.png 1x',
        webp: '/catalog-hero@2x.webp 2x, /catalog-hero.webp 1x',
      },
      src: '/catalog-hero.png',
      type: 'image',
    },
  },
  {
    id: 1,
    asset: {
      alt: 'Интерьер в тёплых тонах',
      decoding: 'async',
      loading: 'lazy',
      sources: {
        avif: '/dealers-hero@2x.avif 2x, /dealers-hero.avif 1x',
        png: '/dealers-hero@2x.png 2x, /dealers-hero.png 1x',
        webp: '/dealers-hero@2x.webp 2x, /dealers-hero.webp 1x',
      },
      src: '/dealers-hero.png',
      type: 'image',
    },
  },
  {
    id: 2,
    asset: {
      alt: 'Номер отеля',
      decoding: 'async',
      loading: 'lazy',
      sources: {
        avif: '/hotels-hero@2x.avif 2x, /hotels-hero.avif 1x',
        png: '/hotels-hero@2x.png 2x, /hotels-hero.png 1x',
        webp: '/hotels-hero@2x.webp 2x, /hotels-hero.webp 1x',
      },
      src: '/hotels-hero.png',
      type: 'image',
    },
  },
  {
    id: 3,
    asset: {
      alt: 'Светлая спальня',
      decoding: 'async',
      loading: 'lazy',
      sources: {
        avif: '/contacts-hero@2x.avif 2x, /contacts-hero.avif 1x',
        png: '/contacts-hero@2x.png 2x, /contacts-hero.png 1x',
        webp: '/contacts-hero@2x.webp 2x, /contacts-hero.webp 1x',
      },
      src: '/contacts-hero.png',
      type: 'image',
    },
  },
  {
    id: 4,
    asset: {
      ariaLabel: 'Производство',
      poster: '/quality-video-poster.jpg',
      sources: [
        { src: '/quality-video.webm', type: 'video/webm' },
        { src: '/quality-video.mp4', type: 'video/mp4' },
      ],
      type: 'video',
    },
  },
]

export const CATALOG_FILTER_GROUPS: CatalogFilterGroupData[] = [
  {
    defaultLabel: 'Все коллекции',
    expanded: true,
    filterGroup: 'collection',
    helpLabel: 'Как выбрать?',
    helpOpen: 'collection',
    helpRowAriaLabel: 'Как выбрать коллекцию',
    kind: 'chip',
    options: [
      { kind: 'chip', label: 'Все коллекции', value: 'all' },
      { kind: 'chip', label: 'Classic', value: 'classic' },
      { kind: 'chip', label: 'Flexi', value: 'flexi' },
      { kind: 'chip', label: 'Relax', value: 'relax' },
      { kind: 'chip', label: 'Trend', value: 'trend' },
      { kind: 'chip', label: 'Топеры', value: 'topper' },
    ],
    title: 'Коллекция',
  },
  {
    action: 'size-help',
    actionLabel: 'Нет нужного?',
    defaultLabel: 'Любой',
    expanded: false,
    filterGroup: 'size',
    headLabel: 'Выберите размер',
    helpLabel: 'Как выбрать?',
    helpOpen: 'size',
    helpRowAriaLabel: 'Как выбрать размер',
    kind: 'select',
    options: [
      { kind: 'select', label: '80 × 190', value: '80x190' },
      { kind: 'select', label: '80 × 200', value: '80x200' },
      { kind: 'select', label: '90 × 190', value: '90x190' },
      { kind: 'select', label: '90 × 200', value: '90x200' },
      { kind: 'select', label: '120 × 190', value: '120x190' },
      { kind: 'select', label: '120 × 200', value: '120x200' },
      { kind: 'select', label: '140 × 190', value: '140x190' },
      { kind: 'select', label: '140 × 200', value: '140x200' },
      { kind: 'select', label: '160 × 190', value: '160x190' },
      { kind: 'select', label: '180 × 190', value: '180x190' },
      { kind: 'select', label: '160 × 200', value: '160x200' },
      { kind: 'select', label: '180 × 200', value: '180x200' },
    ],
    resetAction: 'size-reset',
    resetLabel: 'Сбросить',
    searchPlaceholder: 'Начните вводить размер',
    searchValueLabel: 'Поиск размера',
    title: 'Размер',
  },
  {
    defaultLabel: 'Любая',
    expanded: false,
    filterGroup: 'firmness',
    helpLabel: 'Как выбрать?',
    helpOpen: 'firmness',
    helpRowAriaLabel: 'Как выбрать жёсткость',
    kind: 'chip',
    options: [
      { kind: 'chip', label: 'Любая', value: 'all' },
      { kind: 'chip', label: 'Мягкий', value: 'soft' },
      { kind: 'chip', label: 'Средний', value: 'medium' },
      { kind: 'chip', label: 'Жесткий', value: 'hard' },
      { kind: 'chip', label: 'Разная жесткость сторон', value: 'dualFirmness' },
    ],
    title: 'Жесткость',
  },
  {
    defaultLabel: 'Любая',
    expanded: false,
    filterGroup: 'type',
    helpLabel: 'Как выбрать?',
    helpOpen: 'type',
    helpRowAriaLabel: 'Как выбрать тип конструкции',
    kind: 'chip',
    options: [
      { kind: 'chip', label: 'Любая', value: 'all' },
      { kind: 'chip', label: 'Пружинный', value: 'spring' },
      { kind: 'chip', label: 'Беспружинный', value: 'nospring' },
      { kind: 'chip', label: 'Топер', value: 'topper' },
      { kind: 'chip', label: 'Двухсторонние', value: 'doubleSided' },
      { kind: 'chip', label: 'Односторонние', value: 'singleSided' },
    ],
    title: 'Тип конструкции',
  },
  {
    defaultLabel: 'Любая',
    expanded: false,
    filterGroup: 'loadRange',
    headLabel: 'Макс. нагрузка на спальное место',
    helpLabel: 'Как выбрать?',
    helpOpen: 'loadRange',
    helpRowAriaLabel: 'Как выбрать нагрузку',
    kind: 'select',
    options: [
      { kind: 'select', label: 'до 120кг', value: 'upTo120' },
      { kind: 'select', label: 'до 160кг', value: 'upTo160' },
      { kind: 'select', label: 'до 180кг', value: 'upTo180' },
      { kind: 'select', label: 'Без ограничений', value: 'over160' },
    ],
    resetAction: 'load-range-reset',
    resetLabel: 'Сбросить',
    title: 'Нагрузка',
  },
  {
    defaultLabel: 'Любая',
    expanded: false,
    filterGroup: 'heightRange',
    helpLabel: 'Как выбрать?',
    helpOpen: 'heightRange',
    helpRowAriaLabel: 'Как выбрать высоту матраса',
    kind: 'chip',
    options: [
      { kind: 'chip', label: 'Любая', value: 'all' },
      { kind: 'chip', label: 'Компактные до 16 см', value: 'low' },
      { kind: 'chip', label: 'Средние 16-20 см', value: 'mid' },
      { kind: 'chip', label: 'Высокие свыше 20 см', value: 'high' },
    ],
    title: 'Высота матраса',
  },
  {
    defaultLabel: 'Любая',
    expanded: false,
    filterGroup: 'fillings',
    helpLabel: 'Как выбрать?',
    helpOpen: 'fillings',
    helpRowAriaLabel: 'Как выбрать наполнитель',
    kind: 'chip',
    options: [
      { kind: 'chip', label: 'Любая', value: 'all' },
      { kind: 'chip', label: 'Кокосовая койра', value: 'coir' },
      { kind: 'chip', label: 'Натуральный латекс', value: 'latex' },
      { kind: 'chip', label: 'Орто-пена', value: 'orthoFoam' },
      { kind: 'chip', label: 'С эффектом памяти', value: 'memoryEffect' },
      { kind: 'chip', label: 'Нано-пена', value: 'nanoFoam' },
      { kind: 'chip', label: 'Форплит', value: 'forplit' },
    ],
    title: 'Состав / Наполнитель',
  },
  {
    defaultLabel: 'Любые',
    expanded: false,
    filterGroup: 'features',
    helpLabel: 'Как выбрать?',
    helpOpen: 'features',
    helpRowAriaLabel: 'Как выбрать особенности',
    kind: 'chip',
    options: [
      { kind: 'chip', label: 'Любые', value: 'all' },
      { kind: 'chip', label: 'Съемный чехол', value: 'removableCover' },
      { kind: 'chip', label: 'Эффект зима-лето', value: 'winterSummer' },
      { kind: 'chip', label: 'Усиленный периметр', value: 'edgeSupport' },
    ],
    title: 'Доп. особенности',
  },
]

export const CATALOG_SORT_OPTIONS = [
  { label: 'Сортировка по умолчанию', value: 'default' },
  { label: 'Высота: по возрастанию', value: 'height-asc' },
  { label: 'Высота: по убыванию', value: 'height-desc' },
  { label: 'Максимальная нагрузка', value: 'load-desc' },
  { label: 'Жесткость: по возрастанию', value: 'firmness-asc' },
  { label: 'Жесткость: по убыванию', value: 'firmness-desc' },
] as const

export const CATALOG_FALLBACK_CARDS: CatalogFallbackCardData[] = [
  {
    collection: 'classic',
    firmness: 'medium',
    height: '22',
    image: {
      alt: 'Коллекция Classic',
      sources: {
        avif: '/collection-Classic@2x.avif 2x, /collection-Classic.avif 1x',
        webp: '/collection-Classic@2x.webp 2x, /collection-Classic.webp 1x',
      },
      src: '/collection-Classic.png',
      type: 'image',
    },
    load: '140',
    metaHeightLabel: '22см',
    metaLoadLabel: 'до 140 кг',
    slug: 'classic',
    tags: ['Пружинный', 'Средняя жесткость'],
    title: 'Classic',
    type: 'spring',
  },
  {
    collection: 'flexi',
    firmness: 'hard',
    height: '24',
    image: {
      alt: 'Коллекция Flexi',
      sources: {
        avif: '/collection-Flexi@2x.avif 2x, /collection-Flexi.avif 1x',
        webp: '/collection-Flexi@2x.webp 2x, /collection-Flexi.webp 1x',
      },
      src: '/collection-Flexi.png',
      type: 'image',
    },
    load: '160',
    metaHeightLabel: '24см',
    metaLoadLabel: 'до 160 кг',
    slug: 'flexi',
    tags: ['Беспружинный', 'Жесткий'],
    title: 'Flexi',
    type: 'nospring',
  },
  {
    collection: 'relax',
    firmness: 'soft',
    height: '26',
    image: {
      alt: 'Коллекция Relax',
      sources: {
        avif: '/collection-Relax@2x.avif 2x, /collection-Relax.avif 1x',
        webp: '/collection-Relax@2x.webp 2x, /collection-Relax.webp 1x',
      },
      src: '/collection-Relax.png',
      type: 'image',
    },
    load: '170',
    metaHeightLabel: '26см',
    metaLoadLabel: 'до 170 кг',
    slug: 'relax',
    tags: ['Беспружинный', 'Мягкий'],
    title: 'Relax',
    type: 'nospring',
  },
  {
    collection: 'trend',
    firmness: 'medium',
    height: '23',
    image: {
      alt: 'Коллекция Trend',
      sources: {
        avif: '/collection-Trend@2x.avif 2x, /collection-Trend.avif 1x',
        webp: '/collection-Trend@2x.webp 2x, /collection-Trend.webp 1x',
      },
      src: '/collection-Trend.png',
      type: 'image',
    },
    load: '150',
    metaHeightLabel: '23см',
    metaLoadLabel: 'до 150 кг',
    slug: 'trend',
    tags: ['Пружинный', 'Средняя жесткость'],
    title: 'Trend',
    type: 'spring',
  },
]
