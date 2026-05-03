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

      <section className="contact-section" id="contact-form">
        <h2 className="section-title">Доброе утро!</h2>
        <div className="contact-grid">
          <div className="contact-form-wrapper">
            <h3 className="contact-form-title">Стать дилером</h3>
            <form className="contact-form" data-contact-form>
              <div style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="form-group form-group-package" data-form-group>
                <label htmlFor="dealer-package">Пакет</label>
                <select id="dealer-package" name="package" className="form-select" aria-label="Выберите пакет">
                  <option value="">Выберите пакет</option>
                  <option value="standard">СТАНДАРТ – От 100 000 р</option>
                  <option value="individual">ИНДИВИДУАЛЬНЫЙ – От 300 000 р</option>
                  <option value="exclusive">ЭКСКЛЮЗИВНЫЙ – От 800 000 р</option>
                </select>
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
            <div className="contact-info-item"><div className="contact-info-icon"><img src="./public/icon-email-vectorly.svg" alt="" /></div><div className="contact-info-content"><h4 className="contact-info-title">Email</h4><p className="contact-info-value"><a href="mailto:b2b@grassigrosso.com">b2b@grassigrosso.com</a></p><p className="contact-info-note">Ответим в течение 24 часов в рамках рабочего времени</p></div></div>
            <div className="contact-info-divider" />
            <div className="contact-info-item"><div className="contact-info-icon"><img src="./public/icon-location-vectorly.svg" alt="" /></div><div className="contact-info-content"><h4 className="contact-info-title">Адрес</h4><p className="contact-info-value">Симферополь, ул. Кубанская д. 25</p><p className="contact-info-note">Главный офис</p></div></div>
          </div>
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
                <p>{item.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
