const offices = [
  {
    id: 'main',
    address: 'ул. Кубанская д. 25',
    badge: 'Главный офис',
    city: 'Симферополь',
    email: 'sales@grassigrosso.com',
    phone: '+ 7 (978) 248-43-80',
    phoneHref: 'tel:+79782484380',
    region: null,
    schedule: 'Пн-Пт: 9:00 - 18:00',
    tabLabel: 'Главный офис',
  },
  {
    id: 'voronezh',
    address: 'ул. Остужева 43 И',
    badge: 'Представительство',
    city: 'Воронеж',
    email: 'voronezh@grassigrosso.com',
    phone: '+7 (978) 075-71-74',
    phoneHref: 'tel:+79780757174',
    region: 'Центральная Россия',
    schedule: 'Пн-Пт: 9:00 - 18:00',
    tabLabel: 'Центральная Россия',
  },
  {
    id: 'lnr',
    address: 'ул. Фабричная д 1',
    badge: 'Представительство',
    city: 'Луганск',
    email: 'LNR@grassigrosso.com',
    phone: '+7 (959) 201-18-08',
    phoneHref: 'tel:+79592011808',
    region: 'Луганская Народная Республика',
    schedule: 'Пн-Пт: 9:00 - 18:00',
    tabLabel: 'ЛНР',
  },
  {
    id: 'dnr',
    address: 'ул. Вокзальная, д. 52',
    badge: 'Представительство',
    city: 'Харцизск',
    email: 'DNR@grassigrosso.com',
    phone: '+7 (949) 410-67-60',
    phoneHref: 'tel:+79494106760',
    region: 'Донецкая Народная Республика',
    schedule: 'Пн-Пт: 8:00 - 17:00',
    tabLabel: 'ДНР',
  },
]

const primaryOffice = offices[0]

export function ContactsPage() {
  return (
    <>
      <section className="contacts-hero">
        <div className="contacts-hero-content">
          <div className="contacts-hero-text">
            <h1 className="contacts-hero-title">Контакты</h1>
            <p className="contacts-hero-description">Свяжитесь с нами удобным способом. Мы всегда готовы ответить на ваши вопросы.</p>
          </div>
          <div className="contacts-hero-image">
            <picture>
              <source type="image/avif" srcSet="./public/contacts-hero@2x.avif 2x, ./public/contacts-hero.avif 1x" />
              <source type="image/webp" srcSet="./public/contacts-hero@2x.webp 2x, ./public/contacts-hero.webp 1x" />
              <source type="image/png" srcSet="./public/contacts-hero@2x.png 2x, ./public/contacts-hero.png 1x" />
              <img src="./public/contacts-hero.png" alt="Интерьер спальни" />
            </picture>
          </div>
        </div>
      </section>

      <section className="contacts-offices">
        <h2 className="section-title">Наши офисы</h2>
        <div className="contacts-offices-grid">
          {offices.map((office) => (
            <div className="contacts-office-card" key={office.id}>
              <div className="contacts-office-header">
                <span className="contacts-office-badge">{office.badge}</span>
                {office.region ? <p className="contacts-office-region">{office.region}</p> : null}
                <h3 className="contacts-office-city">{office.city}</h3>
              </div>
              <div className="contacts-office-info">
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Адрес:</span>
                  <span className="contacts-office-value">{office.address}</span>
                </div>
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Телефон:</span>
                  <span className="contacts-office-value"><a href={office.phoneHref}>{office.phone}</a></span>
                </div>
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Email:</span>
                  <span className="contacts-office-value">
                    <span className="contacts-office-email-row" data-office-email-row>
                      <a href={`mailto:${office.email}`}>{office.email}</a>
                      <button type="button" className="contacts-office-copy-email" aria-label="Скопировать email" data-copy-email={office.email} data-copy-email-trigger>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                          <path d="M15.8 4H12.2C9.8804 4 8 5.8804 8 8.2V11.8C8 14.1196 9.8804 16 12.2 16H15.8C18.1196 16 20 14.1196 20 11.8V8.2C20 5.8804 18.1196 4 15.8 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M14.5 16V16.4C14.5 18.6644 12.6644 20.5 10.4 20.5H8.1C5.83563 20.5 4 18.6644 4 16.4V13C4 10.7909 5.79086 9 8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </span>
                  </span>
                </div>
                <div className="contacts-office-item">
                  <span className="contacts-office-label">Время работы:</span>
                  <span className="contacts-office-value">{office.schedule}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="contacts-map">
        <div className="contacts-map-header">
          <h2 className="section-title">Как нас найти</h2>
          <div className="contacts-map-tabs">
            {offices.map((office, index) => (
              <button className={`contacts-map-tab${index === 0 ? ' active' : ''}`} data-office={office.id} data-map-tab key={office.id}>
                {office.tabLabel}
              </button>
            ))}
          </div>
        </div>
        <div className="contacts-map-container">
          {offices.map((office, index) => (
            <div className="contacts-map-placeholder contacts-map-frame" id={`map-${office.id}`} data-office={office.id} data-map-frame hidden={index !== 0} key={office.id} />
          ))}
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
                  <span className="checkbox-custom">
                    <svg className="checkbox-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white" />
                      <path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" strokeOpacity="0.1" />
                      <path className="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" strokeWidth="2" />
                    </svg>
                  </span>
                  <span className="checkbox-text">Я согласен на обработку моих персональных данных в соответствии с <a href="/privacy">Политикой конфиденциальности</a></span>
                </label>
              </div>
              <button type="submit" className="btn-primary">Отправить</button>
            </form>
          </div>
          <div className="contact-info">
            <div className="contact-info-item">
              <div className="contact-info-icon"><img src="./public/icon-phone-vectorly.svg" alt="" /></div>
              <div className="contact-info-content">
                <h4 className="contact-info-title">Телефон</h4>
                <p className="contact-info-value"><a href={primaryOffice.phoneHref}>{primaryOffice.phone}</a></p>
                <p className="contact-info-note">Пн-Пт: 9:00 - 18:00 МСК</p>
              </div>
            </div>
            <div className="contact-info-divider" />
            <div className="contact-info-item">
              <div className="contact-info-icon"><img src="./public/icon-email-vectorly.svg" alt="" /></div>
              <div className="contact-info-content">
                <h4 className="contact-info-title">Email</h4>
                <p className="contact-info-value"><a href={`mailto:${primaryOffice.email}`}>{primaryOffice.email}</a></p>
                <p className="contact-info-note">Ответим в течение 24 часов в рамках рабочего времени</p>
              </div>
            </div>
            <div className="contact-info-divider" />
            <div className="contact-info-item">
              <div className="contact-info-icon"><img src="./public/icon-location-vectorly.svg" alt="" /></div>
              <div className="contact-info-content">
                <h4 className="contact-info-title">Адрес</h4>
                <p className="contact-info-value">Симферополь, ул. Кубанская д. 25</p>
                <p className="contact-info-note">Главный офис</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
