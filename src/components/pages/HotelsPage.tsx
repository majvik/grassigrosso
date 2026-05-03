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

      <section className="contact-section" id="contact-form">
        <h2 className="section-title">Доброе утро!</h2>
        <div className="contact-grid">
          <div className="contact-form-wrapper">
            <h3 className="contact-form-title">Форма обратной связи</h3>
            <form className="contact-form" data-contact-form>
              <div style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="form-group" data-form-group><label htmlFor="name">Имя</label><input type="text" id="name" placeholder="Иван Иванов" /></div>
              <div className="form-group" data-form-group><label htmlFor="city">Город</label><input type="text" id="city" placeholder="Москва" /></div>
              <div className="form-group" data-form-group><label htmlFor="email">E-mail</label><input type="email" id="email" placeholder="example@company.com" required /></div>
              <div className="form-group" data-form-group><label htmlFor="phone">Телефон</label><input type="tel" id="phone" placeholder="+7 (999) 123-45-67" /></div>
              <div className="form-group" data-form-group><label htmlFor="message">Сообщение</label><textarea id="message" placeholder="Ваше сообщение" /></div>
              <div className="form-checkbox">
                <input type="checkbox" id="privacy" defaultChecked />
                <label htmlFor="privacy">
                  <span className="checkbox-custom"><svg className="checkbox-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white" /><path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" strokeOpacity="0.1" /><path className="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" strokeWidth="2" /></svg></span>
                  <span className="checkbox-text">Я согласен на обработку моих персональных данных в соответствии с <a href="/privacy">Политикой конфиденциальности</a></span>
                </label>
              </div>
              <button type="submit" className="btn-primary">Отправить</button>
            </form>
          </div>
          <div className="contact-info">
            <div className="contact-info-item"><div className="contact-info-icon"><img src="./public/icon-phone-vectorly.svg" alt="" /></div><div className="contact-info-content"><h4 className="contact-info-title">Телефон</h4><p className="contact-info-value"><a href="tel:+79782484380">+ 7 (978) 248-43-80</a></p><p className="contact-info-note">Пн-Пт: 9:00 - 18:00 МСК</p></div></div>
            <div className="contact-info-divider" />
            <div className="contact-info-item"><div className="contact-info-icon"><img src="./public/icon-email-vectorly.svg" alt="" /></div><div className="contact-info-content"><h4 className="contact-info-title">Email</h4><p className="contact-info-value"><a href="mailto:hotels@grassigrosso.com">hotels@grassigrosso.com</a></p><p className="contact-info-note">Ответим в течение 24 часов в рамках рабочего времени</p></div></div>
            <div className="contact-info-divider" />
            <div className="contact-info-item"><div className="contact-info-icon"><img src="./public/icon-location-vectorly.svg" alt="" /></div><div className="contact-info-content"><h4 className="contact-info-title">Адрес</h4><p className="contact-info-value">Симферополь, ул. Кубанская д. 25</p><p className="contact-info-note">Главный офис</p></div></div>
          </div>
        </div>
      </section>

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

      <section className="faq-section">
        <h2 className="section-title">Часто задаваемые вопросы</h2>
        <div className="faq-list">
          {faqItems.map((item) => (
            <div className={`faq-item${item.active ? ' active' : ''}`} data-faq-item data-open={item.active ? 'true' : 'false'} key={item.question}>
              <div className="faq-question" data-faq-question>
                <h3>{item.question}</h3>
                <span className="faq-toggle" />
              </div>
              <div className="faq-answer">
                <p>
                  {item.answer.split('\n').map((line, index, lines) => (
                    <span key={line}>
                      {line}
                      {index < lines.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
