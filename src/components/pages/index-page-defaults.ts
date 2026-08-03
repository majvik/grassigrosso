/**
 * Hardcoded-first defaults for Index CMS hydrate (Phase 4B).
 * Shape matches public GET /api/pages/index `data` (content contract).
 */

export type PagesMedia = { url: string } | null

export type IndexSolutionCard = {
  title: string
  text: string
  href: string
  icon: PagesMedia
}

export type IndexListItem = {
  title: string
  text: string
  href: string
}

export type IndexCollectionCard = {
  name: string
  href: string
  image: PagesMedia
  image_alt: string
  features: IndexListItem[]
}

/** Code-owned: keep these collection cards visually hidden (legacy carousel). */
export const INDEX_HIDDEN_COLLECTION_NAMES = new Set(['Viva Natura'])

export type IndexDocumentCard = {
  document_key: string
  title: string
  type_label: string
  size_label: string
  request_label: string
  request_aria_label: string
  kind: 'certificate' | 'company'
  file: PagesMedia
}

export type IndexTestimonial = {
  tag: string
  company: string
  author_name: string
  author_role: string
  rating: number
  text: string
}

export type IndexPageContent = {
  hero: {
    title: string
    title_tm: string
    description: string
    cta_label: string
    poster: PagesMedia
    poster_alt: string
    video_desktop: PagesMedia
    video_mobile: PagesMedia
  }
  solutions_title: string
  solutions: IndexSolutionCard[]
  philosophy_title: string
  philosophy_cards: IndexSolutionCard[]
  philosophy_presentation: IndexDocumentCard
  collections_title: string
  collections_subtitle: string
  collections_link_label: string
  collections_link_href: string
  collections: IndexCollectionCard[]
  partners_title: string
  partners_image_desktop: PagesMedia
  partners_image_mobile: PagesMedia
  testimonials_title: string
  testimonials: IndexTestimonial[]
  docs_title: string
  docs: IndexDocumentCard[]
}

/** Code-owned link labels for solution cards (not in CMS schema). */
export const INDEX_SOLUTION_LINK_LABELS: Readonly<Record<string, string>> = {
  '/hotels': 'Узнать больше',
  '/dealers': 'Условия партнёрства',
  '/catalog': 'Смотреть коллекции',
}

/** Code-owned intro under philosophy title (not in CMS schema). */
export const INDEX_PHILOSOPHY_DESCRIPTION =
  'Мы создаём условия, в которых природа делает своё для вашего естественного восстановления.\nКаждый слой – осмысленный, каждое решение – логичное.'

function media(url: string): PagesMedia {
  return { url }
}

function feature(title: string): IndexListItem {
  return { title, text: '', href: '' }
}

export const INDEX_PAGE_DEFAULTS: IndexPageContent = {
  hero: {
    title: 'Любовь с первого утра',
    title_tm: 'Ⓒ',
    description:
      'Мы создаем продуманные системы для сна и естественного восстановления, чтобы каждое утро начиналось легко и спокойно.',
    cta_label: 'Получить подробную информацию',
    poster: media('/grassigrosso-poster.avif'),
    poster_alt: 'Grassigrosso',
    video_desktop: media('/grassigrosso-silent.mp4'),
    video_mobile: media('/grassigrosso-silent-mobile.mp4'),
  },
  solutions_title: 'Решения для бизнеса',
  solutions: [
    {
      title: 'Отелям',
      text: 'Сон, о котором хочется написать в отзыве.\nМатрасы, которые создают впечатление и повышают лояльность гостей.',
      href: '/hotels',
      icon: media('/icon-hotels.svg'),
    },
    {
      title: 'Дилерам',
      text: 'Продуманные решения для ваших клиентов. Инвестиция в восстановление каждого утра ближайших 10 лет.',
      href: '/dealers',
      icon: media('/icon-dealers.svg'),
    },
    {
      title: 'Каталог',
      text: 'Инженерная точность сна в каждой модели.\nМатрасы, в которых все на своем месте − и вы тоже.',
      href: '/catalog',
      icon: media('/icon-catalog.svg'),
    },
  ],
  philosophy_title: 'Наша философия',
  philosophy_cards: [
    {
      title: 'Инженерная точность сна',
      text: 'Мы собираем современные технологии и лучшие инженерные решения в продуманные продукты для сна.',
      href: '',
      icon: media('/icon-engineering.svg'),
    },
    {
      title: 'Естественное восстановление',
      text: 'Оставлено только то, что действительно работает.\nЧистые формы снаружи и внутри.',
      href: '',
      icon: media('/icon-nature.svg'),
    },
  ],
  philosophy_presentation: {
    document_key: 'presentation',
    title: 'Презентация компании',
    type_label: 'PDF документ',
    size_label: '',
    request_label: 'Запросить',
    request_aria_label: 'Запросить презентацию компании',
    kind: 'company',
    file: media('/documents/presentation.pdf'),
  },
  collections_title: 'Коллекции',
  collections_subtitle:
    'Каждая коллекция вдохновлена своей историей и проблемой, которую мы хотим решить. Но все они объединены общими принципами инженерной осознанности.',
  collections_link_label: 'смотреть Все коллекции',
  collections_link_href: '/catalog',
  collections: [
    {
      name: 'Classic',
      href: '/catalog',
      image: media('/collection-Classic.png'),
      image_alt: 'Classic',
      features: [
        feature('Доступные модели'),
        feature('Классические технологии'),
        feature('Базовый, понятный комфорт'),
      ],
    },
    {
      name: 'Flexi',
      href: '/catalog',
      image: media('/collection-Flexi.png'),
      image_alt: 'Flexi',
      features: [
        feature('Современные пены'),
        feature('Упругая адаптивная поддержка'),
        feature('Минималистичный дизайн'),
      ],
    },
    {
      name: 'Relax',
      href: '/catalog',
      image: media('/collection-Relax.png'),
      image_alt: 'Relax',
      features: [
        feature('Пружины малого диаметра'),
        feature('Высокая адаптивность поддержки'),
        feature('Высокая несущая способность'),
      ],
    },
    {
      name: 'Trend',
      href: '/catalog',
      image: media('/collection-Trend.png'),
      image_alt: 'Trend',
      features: [
        feature('Проверенные решения'),
        feature('Популярный дизайн'),
        feature('Для современных интерьеров'),
      ],
    },
    {
      name: 'Viva Natura',
      href: '/catalog',
      image: media('/collection-Viva-Natura@0.5x.png'),
      image_alt: 'Viva Natura',
      features: [
        feature('Натуральные компоненты'),
        feature('Экологичность'),
        feature('Премиальный комфорт'),
      ],
    },
  ],
  partners_title: 'Партнеры и технологии',
  partners_image_desktop: media('/logos@2x-normal.png'),
  partners_image_mobile: media('/logos@2x-mobile.png'),
  testimonials_title: 'Нам доверяют',
  testimonials: [
    {
      tag: 'Партнёр',
      company: 'ИП Левченко Т.А.',
      author_name: 'Воронина Е.С.',
      author_role: 'Директор розничной торговли',
      rating: 5,
      text: 'Больше всего ценим логистику, ассортимент, качество, профессиональную работу менеджеров. Особенно хочется отметить менеджера, с которым мы работаем продолжительное время. Спасибо за ваш труд.',
    },
    {
      tag: 'Дилер',
      company: 'Кубань Матрас',
      author_name: 'Грушко Пётр Леонидович',
      author_role: 'Директор',
      rating: 5,
      text: 'Отмечаем сроки и качество продукции. Работа персонала организована на высшем уровне.',
    },
    {
      tag: 'Санаторий',
      company: 'ГУП РК «СОК «Руссия»',
      author_name: 'Инна',
      author_role: 'Специалист по закупкам',
      rating: 5,
      text: 'Остались довольны качеством, сроками, ценовой политикой.',
    },
    {
      tag: 'Дилер',
      company: 'ИП Корнилов А.И.',
      author_name: 'Корнилов Александр Иванович',
      author_role: 'Предприниматель',
      rating: 5,
      text: 'Впечатлил индивидуальный подход – погружение в ситуацию! Продуманная логистика, молодые, энергичные менеджеры!',
    },
    {
      tag: 'Дилер',
      company: 'ПРОМЭКС',
      author_name: 'Елена',
      author_role: 'Заместитель управляющего',
      rating: 5,
      text: 'Выделяем скорость реакции на запросы, оперативность согласования заказов и работу в тандеме с менеджерами фабрики. Производитель гибко подходит к подбору решений под потребности разных розничных точек, помогает формировать ассортимент. Логистика и сроки поставки стабильны. Качество продукции на высоком уровне, рекламаций от покупателей минимум. Компания предоставляет материалы для обучения продавцов, каталоги, образцы, помогает в продвижении.',
    },
    {
      tag: 'Дилер',
      company: 'ИП Мачульский А.В.',
      author_name: 'Найденова А.Н.',
      author_role: 'Консультант',
      rating: 5,
      text: 'Радует качество продукции – нареканий нет. Быстрая доставка, широкий ассортимент.',
    },
    {
      tag: 'Дилер',
      company: 'Стильный дом',
      author_name: 'Иванова Кристина Александровна',
      author_role: 'Менеджер по продажам',
      rating: 5,
      text: 'Особенно довольны сроками доставки.',
    },
    {
      tag: 'Санаторий',
      company: 'ГУП РК «СОК «Руссия»',
      author_name: 'Инна',
      author_role: 'Специалист по закупкам',
      rating: 5,
      text: 'Остались довольны качеством, сроками, ценовой политикой.',
    },
    {
      tag: 'Дилер',
      company: 'Мебель «Эра»',
      author_name: 'Данцева',
      author_role: 'Администратор',
      rating: 5,
      text: 'Хочу отметить отличное качество продукции и профессиональный подход к работе. Заказы приходят быстро и всё без проблем. Матрасы оказались именно такими, как и ожидали: удобными, высококачественными и хорошо поддерживающими. Особо радует внимательное отношение, быстрые ответы на все вопросы и индивидуальный подход.',
    },
    {
      tag: 'Дилер',
      company: 'ИП Адров С.А.',
      author_name: 'Сергей',
      author_role: 'Руководитель',
      rating: 5,
      text: 'От принятия заказа до поставки матрасов всё проходит быстро. По любому вопросу можно позвонить и получить консультацию. За время работы с браком не сталкивались. Качество продукции высокое.',
    },
    {
      tag: 'Дилер',
      company: 'ИП Семенов Ф.В.',
      author_name: 'Борзенко Наталья Юрьевна',
      author_role: 'Бухгалтер',
      rating: 5,
      text: 'Высоко оцениваем скорость доставки, работу с рекламациями, качество продукции.',
    },
    {
      tag: 'Санаторий',
      company: 'ГУП РК «СОК «Руссия»',
      author_name: 'Инна',
      author_role: 'Специалист по закупкам',
      rating: 5,
      text: 'Остались довольны качеством, сроками, ценовой политикой.',
    },
    {
      tag: 'Дилер',
      company: 'ИП Мишустин',
      author_name: 'Юлия',
      author_role: 'Администратор',
      rating: 5,
      text: 'Приятно удивило, что наш салон посещали представители фабрики и проводили подробное обучение, рассказывали о характеристиках товара и отвечали на интересующие нас вопросы.',
    },
    {
      tag: 'Дилер',
      company: 'ООО Парк М',
      author_name: 'Елена',
      author_role: 'Продавец-консультант',
      rating: 5,
      text: 'Цена, сроки, качество, логистика – всё на высоте. Ни одной рекламации не было за всё время работы. Молодцы, так держать!',
    },
  ],
  docs_title: 'Сертификация и документация',
  docs: [
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
  ],
}
