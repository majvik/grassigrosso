import { ContactSection, FaqSection } from '@/components/marketing/shared-page-sections'

const categoryItems: Array<{ active?: boolean; name: string; text: string }> = [
  {
    name: 'Люкс',
    text: 'Бескомпромиссный комфорт для самых взыскательных гостей. Высокие матрасы с натуральными наполнителями премиум-класса. Индивидуальный подход к каждому номеру.',
  },
  {
    name: 'Полулюкс',
    text: 'Баланс комфорта и практичности для требовательных гостей. Качественные материалы и продуманная эргономика. Оптимальное соотношение цены и качества.',
  },
  {
    active: true,
    name: 'Стандарт',
    text: 'Мы подобрали оптимальные модели для каждого сегмента. Надежные матрасы с отличной поддержкой. Долговечность и простота в обслуживании.',
  },
  {
    name: 'Мини-отели',
    text: 'Компактные решения для небольших номеров. Функциональность без компромиссов по качеству сна. Экономичные варианты для оптимизации бюджета.',
  },
] 

const productCards = [
  {
    catalog: 'boxspring',
    title: 'BoxSpring',
    description: 'Основания для кроватей и изголовья. Надежная база и стильный дизайн для любого интерьера.',
    image: {
      avif: './public/boxspring@2x.avif 2x, ./public/boxspring.avif 1x',
      webp: './public/boxspring@2x.webp 2x, ./public/boxspring.webp 1x',
      fallback: './public/boxspring@2x.jpg 2x, ./public/boxspring.jpg 1x',
      src: './public/boxspring.jpg',
    },
  },
  {
    catalog: 'accessories',
    title: 'Аксессуары',
    description: 'Корректирующие топперы, наматрасники и другие финальные штрихи для идеального спального места.',
    image: {
      avif: './public/accessories@2x.avif 2x, ./public/accessories.avif 1x',
      webp: './public/accessories@2x.webp 2x, ./public/accessories.webp 1x',
      fallback: './public/accessories@2x.png 2x, ./public/accessories.png 1x',
      src: './public/accessories.png',
    },
  },
] as const

const faqItems: Array<{ active?: boolean; answer: string; question: string }> = [
  {
    active: true,
    answer: 'Срок производства составляет от 3 дней в зависимости от объёма заказа и выбранных моделей.',
    question: 'Как быстро производите?',
  },
  {
    answer: 'Да, мы осуществляем доставку по всей России. Стоимость и сроки доставки рассчитываются индивидуально в зависимости от региона и объема заказа.',
    question: 'Доставляете ли в регионы?',
  },
  {
    answer: 'Мы принимаем все способы оплаты, а также работаем по системе отсрочки платежа для постоянных клиентов.\nВсе условия оплаты обсуждаются индивидуально.',
    question: 'Какие есть способы оплаты?',
  },
]

const contactInfoItems = [
  {
    href: 'tel:+79782484380',
    iconSrc: './public/icon-phone-vectorly.svg',
    note: 'Пн-Пт: 9:00 - 18:00 МСК',
    title: 'Телефон',
    value: '+ 7 (978) 248-43-80',
  },
  {
    href: 'mailto:hotels@grassigrosso.com',
    iconSrc: './public/icon-email-vectorly.svg',
    note: 'Ответим в течение 24 часов в рамках рабочего времени',
    title: 'Email',
    value: 'hotels@grassigrosso.com',
  },
  {
    iconSrc: './public/icon-location-vectorly.svg',
    note: 'Главный офис',
    title: 'Адрес',
    value: 'Симферополь, ул. Кубанская д. 25',
  },
] as const

const contactFormFields = [
  { id: 'name', label: 'Имя', placeholder: 'Иван Иванов', type: 'text' },
  { id: 'city', label: 'Город', placeholder: 'Москва', type: 'text' },
  { id: 'email', label: 'E-mail', placeholder: 'example@company.com', required: true, type: 'email' },
  { id: 'phone', label: 'Телефон', placeholder: '+7 (999) 123-45-67', type: 'tel' },
  { id: 'message', label: 'Сообщение', placeholder: 'Ваше сообщение', type: 'textarea' },
] as const

export function HotelsPage() {
  return (
    <>
      <section className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-text">
            <div className="page-hero-text-top">
              <h1 className="page-hero-title">Сон, о котором хочется написать в отзыве</h1>
              <p className="page-hero-description">
                Инвестиция в первое впечатление от утра ваших гостей.
                <br />
                Продуманные системы для сна, которые дают ощущение пятизвёздочного сна в отеле любой категории.
              </p>
              <a href="#" className="btn-primary-large" data-open-commercial-offer>
                Рассчитать КП
              </a>
            </div>
            <a href="/catalog" className="catalog-link catalog-link-desktop">
              <span>Смотреть<br />каталог</span>
              <img src="./public/arrow-hero-catalog.svg" alt="" className="catalog-arrow" />
            </a>
          </div>
          <div className="page-hero-image">
            <picture>
              <source type="image/avif" srcSet="./public/hotels-hero@2x.avif 2x, ./public/hotels-hero.avif 1x" />
              <source type="image/webp" srcSet="./public/hotels-hero@2x.webp 2x, ./public/hotels-hero.webp 1x" />
              <source type="image/png" srcSet="./public/hotels-hero@2x.png 2x, ./public/hotels-hero.png 1x" />
              <img src="./public/hotels-hero.png" alt="Интерьер спальни" />
            </picture>
          </div>
          <a href="/catalog" className="catalog-link catalog-link-mobile">
            <span>Смотреть<br />каталог</span>
            <img src="./public/arrow-hero-catalog.svg" alt="" className="catalog-arrow" />
          </a>
        </div>
        <div className="section-divider" />
        <div className="stats-wrapper">
          <div className="stats-grid">
            <div className="stat-item"><span className="stat-label">Матрасов</span><span className="stat-value">30 000+</span></div>
            <div className="stat-item"><span className="stat-label">На рынке</span><span className="stat-value">3 года</span></div>
            <div className="stat-item"><span className="stat-label">Гарантия</span><span className="stat-value">18 мес</span></div>
            <div className="stat-item"><span className="stat-label">Расширенная гарантия</span><span className="stat-value">3 года<span className="stat-note">*</span></span></div>
          </div>
          <p className="stats-note">* При заключении договора на плановую замену матрасов</p>
        </div>
      </section>

      <section className="hotel-categories-section">
        <div className="hotel-categories-header">
          <h2 className="section-title">Решения по категории отеля</h2>
        </div>
        <div className="hotel-categories-content">
          <div className="categories-list">
            {categoryItems.map((item) => (
              <div className={`category-item${item.active ? ' category-active' : ''}`} data-text={item.text} key={item.name}>
                <div className="category-item-row">
                  <span className="category-name">{item.name}</span>
                  <img src="./public/arrow-category.svg" alt="" className="category-arrow" />
                </div>
                <div className="category-divider" />
              </div>
            ))}
          </div>
          <div className="categories-description">
            <p className="categories-text">{categoryItems[2].text}</p>
            <div className="categories-cta">
              <p className="categories-question">Хотите узнать больше о характеристиках и стоимости этих моделей?</p>
              <a href="#contact-form" className="btn-primary-large">Подобрать наилучшее предложение</a>
            </div>
          </div>
        </div>
      </section>

      <section className="product-cards-section">
        {productCards.map((card, index) => (
          <div key={card.catalog}>
            {index > 0 ? <div className="section-divider" /> : null}
            <div className="product-card" data-catalog={card.catalog}>
              <div className="product-card-content">
                <div className="product-card-text">
                  <h3 className="product-card-title">{card.title}</h3>
                  <p className="product-card-description">{card.description}</p>
                </div>
                <a href="#" className="product-card-link" data-open-catalog>
                  <span>Подробнее</span>
                  <img src="./public/arrow-small.svg" alt="" />
                </a>
              </div>
              <div className="product-card-image">
                <picture>
                  <source type="image/avif" srcSet={card.image.avif} />
                  <source type="image/webp" srcSet={card.image.webp} />
                  <source type={card.catalog === 'boxspring' ? 'image/jpeg' : 'image/png'} srcSet={card.image.fallback} />
                  <img src={card.image.src} alt={card.title} />
                </picture>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="discount-section">
        <div className="discount-header">
          <h2 className="section-title">Система скидок от объема</h2>
          <p className="discount-subtitle">Наша миссия помогать людям восстанавливаться естественным образом через продуманные решения для сна. Мы разделяем ценности индустрии гостеприимства и открыты к гибкому, долгосрочному партнёрству.</p>
        </div>
        <div className="discount-wrapper">
          <div className="discount-table">
            <div className="discount-table-header">
              <span className="discount-col">Сумма заказа</span>
              <span className="discount-col">Скидка</span>
              <span className="discount-col">Условия</span>
            </div>
            <div className="discount-table-body">
              <div className="discount-row highlight"><span className="discount-col">от 250 000 ₽</span><span className="discount-col"><span className="discount-badge">7%</span></span><span className="discount-col">Базовые условия</span></div>
              <div className="discount-row"><span className="discount-col">от 450 000 ₽</span><span className="discount-col"><span className="discount-badge">12%</span></span><span className="discount-col">Расширенные условия</span></div>
              <div className="discount-row highlight"><span className="discount-col">от 1 млн ₽</span><span className="discount-col"><span className="discount-badge">Индивидуально</span></span><span className="discount-col">Персональное предложение</span></div>
            </div>
          </div>
          <p className="discount-note">* Точную стоимость и размер скидки рассчитает менеджер</p>
        </div>
      </section>

      <ContactSection
        contactInfoItems={contactInfoItems}
        fields={contactFormFields}
        formTitle="Форма обратной связи"
        sectionTitle="Доброе утро!"
      />

      <section className="refresh-section">
        <div className="refresh-content">
          <div className="refresh-badge">Refresh-программа</div>
          <h2 className="section-title">Плановая замена матрасов</h2>
          <p className="refresh-description">Программа регулярного обновления матрасного фонда отеля. Сфокусируйтесь на главном, а мы позаботимся о комфортном восстановлении ваших гостей.</p>
          <div className="refresh-features">
            <div className="refresh-feature"><div className="refresh-feature-icon"><img src="./public/icon-calendar.svg" alt="" /></div><div className="refresh-feature-content"><h4 className="refresh-feature-title">Плановая замена</h4><p className="refresh-feature-text">График замены матрасов согласно регламенту отеля</p></div></div>
            <div className="refresh-feature-divider" />
            <div className="refresh-feature"><div className="refresh-feature-icon"><img src="./public/icon-hand-gesture.svg" alt="" /></div><div className="refresh-feature-content"><h4 className="refresh-feature-title">Специальные условия</h4><p className="refresh-feature-text">Фиксированные условия сотрудничества и приоритетное производство для участников программы</p></div></div>
          </div>
          <a href="#" className="btn-primary-large" data-open-commercial-offer="seasonal">Подключить Refresh-программу</a>
        </div>
        <div className="refresh-image">
          <picture>
            <source type="image/avif" srcSet="./public/refresh@2x.avif 2x, ./public/refresh.avif 1x" />
            <source type="image/webp" srcSet="./public/refresh@2x.webp 2x, ./public/refresh.webp 1x" />
            <source type="image/png" srcSet="./public/refresh@2x.png 2x, ./public/refresh.png 1x" />
            <img src="./public/refresh.png" alt="Refresh программа" />
          </picture>
        </div>
      </section>

      <FaqSection items={faqItems} title="Часто задаваемые вопросы" />
    </>
  )
}
