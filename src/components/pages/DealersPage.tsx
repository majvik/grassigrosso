import { ContactSection, FaqSection } from '@/components/marketing/shared-page-sections'

const geographyCities: Array<[string, string?]> = [
  ['Г. Краснодар', 'скоро'],
  ['Г. Тула'], ['Г. Саратов'], ['Г. Воронеж'], ['Г. Волгоград'], ['Г. Орел'], ['Г. Курск'], ['Г. Кашира'], ['Г. Пенза'],
  ['Г. Липецк'], ['Г. Самара'], ['Г. Новомосковск'], ['Г. Белгород'], ['Г. Тамбов'], ['Г. Павловск'], ['Г. Таганрог'],
  ['Г. Ростов на Дону'], ['Г. Алексеевка'], ['Г. Острогорск'], ['Г. Старый оскол'], ['Г. Новый оскол'], ['Г. Валуйки'],
  ['Г. Моршанск'], ['Г. Мичуринск'], ['Г. Мценск'], ['Г. Серпухов'], ['Г. Миллерово'], ['Г. Богучар'], ['Г. Калач'],
  ['Г. Симферополь'], ['Г. Севастополь'], ['Г. Ялта'], ['Г. Керчь'], ['Г. Евпатория'], ['Г. Саки'], ['Г. Джанкой'],
  ['Г. Феодосия'], ['Г. Луганск'], ['Г. Донецк'], ['Г. Лисичанск'], ['Г. Мариуполь'], ['Г. Макеевка'], ['Г. Мелитополь'],
]

const faqItems: Array<{ active?: boolean; question: string; answer: string }> = [
  { active: true, question: 'Как быстро происходит запуск?', answer: 'После согласования условий и ассортимента старт возможен в короткие сроки. Срок зависит от объёма входной поставки и комплектации шоурума.' },
  { question: 'Есть ли маркетинговая поддержка?', answer: 'Да, мы предоставляем каталоги, образцы, обучающие материалы и совместные маркетинговые активности.' },
  { question: 'Можно ли подобрать пакет под формат магазина?', answer: 'Да, дилерский пакет можно подобрать под масштаб и формат вашей торговой точки.' },
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
    href: 'mailto:b2b@grassigrosso.com',
    iconSrc: './public/icon-email-vectorly.svg',
    note: 'Ответим в течение 24 часов в рамках рабочего времени',
    title: 'Email',
    value: 'b2b@grassigrosso.com',
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

const packageField = {
  id: 'dealer-package',
  label: 'Пакет',
  options: [
    { value: 'standard', label: 'СТАНДАРТ – От 100 000 р' },
    { value: 'individual', label: 'ИНДИВИДУАЛЬНЫЙ – От 300 000 р' },
    { value: 'exclusive', label: 'ЭКСКЛЮЗИВНЫЙ – От 800 000 р' },
  ],
  placeholderLabel: 'Выберите пакет',
} as const

export function DealersPage() {
  const marqueeItems = [...geographyCities, ...geographyCities]

  return (
    <>
      <section className="page-hero">
        <div className="page-hero-content">
          <div className="page-hero-text">
            <div className="page-hero-text-top">
              <h1 className="page-hero-title">Дилерская программа Grassigrosso</h1>
              <p className="page-hero-description">Станьте официальным дилером премиальных матрасов.<br />Развивайте свой бизнес с надежным производителем.</p>
              <a href="#contact-form" className="btn-primary-large">Стать дилером</a>
            </div>
          </div>
          <div className="page-hero-image">
            <picture>
              <source type="image/avif" srcSet="./public/dealers-hero@2x.avif 2x, ./public/dealers-hero.avif 1x" />
              <source type="image/webp" srcSet="./public/dealers-hero@2x.webp 2x, ./public/dealers-hero.webp 1x" />
              <source type="image/png" srcSet="./public/dealers-hero@2x.png 2x, ./public/dealers-hero.png 1x" />
              <img src="./public/dealers-hero.png" alt="Интерьер спальни" />
            </picture>
          </div>
        </div>
        <div className="section-divider" />
        <div className="stats-wrapper">
          <div className="stats-grid">
            <div className="stat-item"><span className="stat-label">Партнеров</span><span className="stat-value">250+</span></div>
            <div className="stat-item"><span className="stat-label">Городов</span><span className="stat-value">50+</span></div>
            <div className="stat-item"><span className="stat-label">Точек продаж</span><span className="stat-value">350+</span></div>
            <div className="stat-item"><span className="stat-label">Матрасов продано</span><span className="stat-value">35 000</span></div>
            <div className="stat-item"><span className="stat-label">Дней гарантии</span><span className="stat-value">6 500</span></div>
          </div>
        </div>
      </section>

      <section className="conditions-section">
        <div className="conditions-left"><h2 className="section-title">Условия участия</h2><p className="conditions-subtitle">Простые шаги для начала сотрудничества</p></div>
        <div className="conditions-right">
          <div className="condition-item"><h3 className="condition-title">Наличие торговой точки или шоурума</h3><div className="condition-divider" /></div>
          <div className="condition-item"><h3 className="condition-title">Опыт работы в мебельной отрасли приветствуется</h3><div className="condition-divider" /></div>
          <div className="condition-item"><h3 className="condition-title">Фокус на категорию продукта</h3></div>
        </div>
        <div className="conditions-icon"><img src="./public/icon-hand-pointer.svg" alt="Иконка руки с указателем для условий участия" /></div>
      </section>

      <section className="offers-section">
        <div className="offers-header"><h2 className="section-title">Что мы предлагаем</h2><p className="offers-subtitle">Комплексная поддержка для успешного развития вашего бизнеса</p></div>
        <div className="section-divider" />
        <div className="offers-grid">
          <div className="offer-card">
            <div className="offer-icon"><img src="./public/icon-megaphone.svg" alt="Иконка мегафона для маркетинговой поддержки" /></div>
            <div className="offer-content"><h3 className="offer-title">Маркетинговая поддержка</h3><ul className="offer-list"><li>Рекламные материалы</li><li>Каталоги и образцы</li><li>Обучение продажам</li><li>Совместные акции</li></ul></div>
          </div>
          <div className="offer-card">
            <div className="offer-icon"><img src="./public/icon-truck.svg" alt="Иконка грузовика для логистики и сервиса" /></div>
            <div className="offer-content"><h3 className="offer-title">Логистика и сервис</h3><ul className="offer-list"><li>Доставка по России</li><li>Складская программа</li><li>Гарантийное обслуживание</li><li>Техническая поддержка</li></ul></div>
          </div>
        </div>
      </section>

      <section className="geography-section">
        <div className="geography-header"><h2 className="section-title">География дилеров</h2><p className="geography-subtitle">Наши дилеры работают в крупнейших городах России</p></div>
        <div className="geography-map" id="geographyMapContainer"><img src="./public/Map.svg" alt="География дилеров" id="geographyMapImg" /></div>
        <div className="geography-cities-wrapper">
          <div className="geography-cities">
            {marqueeItems.map(([city, tag], index) => (
              <span key={`${city}-${index}`}>
                <span className="city-item">{city}{tag ? <> <span className="city-tag">{tag}</span></> : null}</span>
                {index < marqueeItems.length - 1 ? <span className="city-separator" /> : null}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="quality-section">
        <div className="quality-content-wrapper">
          <div className="quality-content">
            <h2 className="section-title">Качество под контролем</h2>
            <div className="quality-text">
              <p>Собственная система распределенного производства и локализованная сборочная линия позволяет нам гарантировать максимальное качество компонентов продукции и контролировать производство на каждом этапе.</p>
              <p>Срок производства от 3 дней. Стандартные сроки поставки от 5 дней.</p>
              <p>Современное оборудование, сертифицированные материалы и строгий контроль качества – основа нашего успеха и гарантия вашей прибыли.</p>
            </div>
          </div>
          <div className="quality-image" id="qualityVideo">
            <video className="quality-video" poster="./public/quality-video-poster.avif" autoPlay loop muted playsInline>
              <source src="./public/quality-video.webm" type="video/webm" />
              <source src="./public/quality-video.mp4" type="video/mp4" />
            </video>
            <picture className="quality-poster">
              <source type="image/avif" srcSet="./public/quality-video-poster.avif" />
              <source type="image/webp" srcSet="./public/quality-video-poster.webp" />
              <img src="./public/quality-video-poster.jpg" alt="Производство" />
            </picture>
            <button className="hero-play-btn" aria-label="Воспроизвести видео">
              <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="white" fillOpacity="0.9" /><path d="M26 20L46 32L26 44V20Z" fill="#243731" /></svg>
            </button>
          </div>
        </div>
      </section>

      <section className="requirements-section">
        <div className="requirements-header"><h2 className="section-title">Требования к дилерам</h2><p className="requirements-subtitle">Для успешного сотрудничества важны следующие критерии</p></div>
        <div className="section-divider" />
        <div className="requirements-grid">
          <div className="requirement-card"><div className="requirement-icon"><img src="./public/icon-badge.svg" alt="Иконка бейджа для обязательных требований" /></div><div className="requirement-content"><h3 className="requirement-title">Обязательные требования</h3><ul className="requirement-list"><li>Юридическое лицо или ИП</li><li>Торговая площадь от 50 м² или онлайн магазин</li><li>Опыт продаж мебели/матрасов</li><li>Собственный шоурум или магазин</li></ul></div></div>
          <div className="requirement-card"><div className="requirement-icon"><img src="./public/icon-thumbs-up.svg" alt="Иконка большого пальца вверх для желательных требований" /></div><div className="requirement-content"><h3 className="requirement-title">Желательные требования</h3><ul className="requirement-list"><li>Наличие склада</li><li>Собственная служба доставки</li><li>Опыт работы с премиум-сегментом</li><li>База постоянных клиентов</li></ul></div></div>
        </div>
      </section>

      <section className="packages-section">
        <div className="packages-header"><h2 className="section-title">Дилерские пакеты</h2><p className="packages-subtitle">Выберите подходящий уровень сотрудничества</p></div>
        <div className="packages-grid">
          <div className="package-card"><div className="package-header"><h3 className="package-title">СТАНДАРТ</h3><div className="package-price"><span className="price-value">От 100 000 р</span></div></div><ul className="package-features"><li className="feature-included"><span className="feature-check">✓</span> Каталоги и образцы</li><li className="feature-included"><span className="feature-check">✓</span> Обучение</li><li className="feature-included"><span className="feature-check">✓</span> Онлайн и телефон поддержка</li></ul><a href="#contact-form" className="btn-primary" data-package="standard">Выбрать пакет</a></div>
          <div className="package-card package-featured"><div className="package-header"><h3 className="package-title">ИНДИВИДУАЛЬНЫЙ</h3><div className="package-price"><span className="price-value">От 300 000 р</span></div></div><ul className="package-features"><li className="feature-included"><span className="feature-check">✓</span> Каталоги и образцы</li><li className="feature-included"><span className="feature-check">✓</span> Расширенное обучение</li><li className="feature-included"><span className="feature-check">✓</span> Онлайн и телефон поддержка</li><li className="feature-included"><span className="feature-check">✓</span> Персональный менеджер</li><li className="feature-included"><span className="feature-check">✓</span> Сертификат Grassigrosso</li><li className="feature-included"><span className="feature-check">✓</span> Гибкая система скидок</li></ul><a href="#contact-form" className="btn-secondary" data-package="individual">Выбрать пакет</a></div>
          <div className="package-card"><div className="package-header"><h3 className="package-title">ЭКСКЛЮЗИВНЫЙ</h3><div className="package-price"><span className="price-value">От 800 000 р</span></div></div><ul className="package-features"><li className="feature-included"><span className="feature-check">✓</span> Полный комплект материалов</li><li className="feature-included"><span className="feature-check">✓</span> Эксклюзивная программа</li><li className="feature-included"><span className="feature-check">✓</span> Расширенный ассортимент</li><li className="feature-included"><span className="feature-check">✓</span> Приоритетная поддержка</li><li className="feature-included"><span className="feature-check">✓</span> Персональный менеджер</li><li className="feature-included"><span className="feature-check">✓</span> Максимальная скидка</li><li className="feature-included"><span className="feature-check">✓</span> Брендирование торговых площадей</li><li className="feature-included"><span className="feature-check">✓</span> Сертификат Grassigrosso</li><li className="feature-included"><span className="feature-check">✓</span> Эксклюзивная представленность в городе (ТЦ)</li></ul><a href="#contact-form" className="btn-primary" data-package="exclusive">Выбрать пакет</a></div>
        </div>
      </section>

      <ContactSection
        contactInfoItems={contactInfoItems}
        fields={contactFormFields}
        formTitle="Стать дилером"
        sectionTitle="Доброе утро!"
        selectField={packageField}
      />

      <FaqSection items={faqItems} title="Часто задаваемые вопросы" />
    </>
  )
}
