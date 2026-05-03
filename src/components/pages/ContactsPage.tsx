import { ContactSection } from '@/components/marketing/shared-page-sections'

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

const contactInfoItems = [
  {
    href: primaryOffice.phoneHref,
    iconSrc: '/icon-phone-vectorly.svg',
    note: 'Пн-Пт: 9:00 - 18:00 МСК',
    title: 'Телефон',
    value: primaryOffice.phone,
  },
  {
    href: `mailto:${primaryOffice.email}`,
    iconSrc: '/icon-email-vectorly.svg',
    note: 'Ответим в течение 24 часов в рамках рабочего времени',
    title: 'Email',
    value: primaryOffice.email,
  },
  {
    iconSrc: '/icon-location-vectorly.svg',
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
              <source type="image/avif" srcSet="/contacts-hero@2x.avif 2x, /contacts-hero.avif 1x" />
              <source type="image/webp" srcSet="/contacts-hero@2x.webp 2x, /contacts-hero.webp 1x" />
              <source type="image/png" srcSet="/contacts-hero@2x.png 2x, /contacts-hero.png 1x" />
              <img src="/contacts-hero.png" alt="Интерьер спальни" />
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

      <ContactSection
        contactInfoItems={contactInfoItems}
        fields={contactFormFields}
        formTitle="Форма обратной связи"
        sectionTitle="Доброе утро!"
      />
    </>
  )
}
