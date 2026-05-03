import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import styles from './contacts-page.module.css'

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
] as const

const primaryOffice = offices[0]

export function ContactsPage() {
  return (
    <div className={styles.page}>
      <section className={`${styles.section} ${styles.hero}`}>
        <div className={styles.heroText}>
          <div className={styles.eyebrow}>Grassigrosso</div>
          <div>
            <h1 className={styles.heroTitle}>Контакты</h1>
            <p className={styles.heroDescription}>
              Свяжитесь с нами удобным способом. Мы всегда готовы ответить на ваши вопросы.
            </p>
          </div>
        </div>
        <div className={styles.heroMedia}>
          <picture>
            <source type="image/avif" srcSet="./public/contacts-hero@2x.avif 2x, ./public/contacts-hero.avif 1x" />
            <source type="image/webp" srcSet="./public/contacts-hero@2x.webp 2x, ./public/contacts-hero.webp 1x" />
            <source type="image/png" srcSet="./public/contacts-hero@2x.png 2x, ./public/contacts-hero.png 1x" />
            <img src="./public/contacts-hero.png" alt="Интерьер спальни" />
          </picture>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Наши офисы</h2>
        </div>
        <div className={styles.officeGrid}>
          {offices.map((office) => (
            <Card className={styles.officeCard} key={office.id}>
              <CardHeader className={styles.officeHeader}>
                <Badge variant={office.id === 'main' ? 'default' : 'muted'}>{office.badge}</Badge>
                {office.region ? <p className={styles.officeRegion}>{office.region}</p> : null}
                <h3 className={styles.officeCity}>{office.city}</h3>
              </CardHeader>
              <CardContent className={styles.officeInfo}>
                <div className={styles.officeItem}>
                  <span className={styles.officeLabel}>Адрес:</span>
                  <span className={styles.officeValue}>{office.address}</span>
                </div>
                <div className={styles.officeItem}>
                  <span className={styles.officeLabel}>Телефон:</span>
                  <span className={styles.officeValue}>
                    <a href={office.phoneHref}>{office.phone}</a>
                  </span>
                </div>
                <div className={styles.officeItem}>
                  <span className={styles.officeLabel}>Email:</span>
                  <span className={styles.officeValue}>
                    <span className={styles.officeEmailRow} data-office-email-row>
                      <a href={`mailto:${office.email}`}>{office.email}</a>
                      <button
                        aria-label="Скопировать email"
                        className={styles.copyEmail}
                        data-copy-email={office.email}
                        data-copy-email-trigger
                        type="button"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                          <path d="M15.8 4H12.2C9.8804 4 8 5.8804 8 8.2V11.8C8 14.1196 9.8804 16 12.2 16H15.8C18.1196 16 20 14.1196 20 11.8V8.2C20 5.8804 18.1196 4 15.8 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M14.5 16V16.4C14.5 18.6644 12.6644 20.5 10.4 20.5H8.1C5.83563 20.5 4 18.6644 4 16.4V13C4 10.7909 5.79086 9 8 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </span>
                  </span>
                </div>
                <div className={styles.officeItem}>
                  <span className={styles.officeLabel}>Время работы:</span>
                  <span className={styles.officeValue}>{office.schedule}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.mapHeader}>
          <h2 className={styles.sectionTitle}>Как нас найти</h2>
          <div className={styles.mapTabs}>
            {offices.map((office, index) => (
              <button
                className={`${styles.mapTab}${index === 0 ? ' active' : ''}`}
                data-map-tab
                data-office={office.id}
                key={office.id}
                type="button"
              >
                {office.tabLabel}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.mapContainer}>
          {offices.map((office, index) => (
            <div
              className={styles.mapFrame}
              data-map-frame
              data-office={office.id}
              hidden={index !== 0}
              id={`map-${office.id}`}
              key={office.id}
            />
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.contactSection}`} id="contact-form">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Доброе утро!</h2>
        </div>
        <div className={styles.contactGrid}>
          <Card className={styles.contactCard}>
            <CardHeader>
              <h3 className={styles.contactFormTitle}>Форма обратной связи</h3>
            </CardHeader>
            <CardContent>
              <form className={styles.contactForm} data-contact-form>
                <div style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
                </div>

                <div className={styles.formGroup} data-form-group>
                  <label className={styles.formLabel} htmlFor="name">Имя</label>
                  <Input id="name" placeholder="Иван Иванов" />
                </div>
                <div className={styles.formGroup} data-form-group>
                  <label className={styles.formLabel} htmlFor="city">Город</label>
                  <Input id="city" placeholder="Москва" />
                </div>
                <div className={styles.formGroup} data-form-group>
                  <label className={styles.formLabel} htmlFor="email">E-mail</label>
                  <Input id="email" placeholder="example@company.com" required type="email" />
                </div>
                <div className={styles.formGroup} data-form-group>
                  <label className={styles.formLabel} htmlFor="phone">Телефон</label>
                  <Input id="phone" placeholder="+7 (999) 123-45-67" type="tel" />
                </div>
                <div className={styles.formGroup} data-form-group>
                  <label className={styles.formLabel} htmlFor="message">Сообщение</label>
                  <Textarea id="message" placeholder="Ваше сообщение" />
                </div>
                <label className={styles.privacyRow}>
                  <input defaultChecked id="privacy" type="checkbox" />
                  <span className={styles.privacyText}>
                    Я согласен на обработку моих персональных данных в соответствии с <a href="/privacy">Политикой конфиденциальности</a>
                  </span>
                </label>
                <Button className={styles.submitButton} size="lg" type="submit">
                  Отправить
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className={styles.contactInfoCard}>
            <CardContent className={styles.contactInfo}>
              <div className={styles.contactInfoItem}>
                <div className={styles.contactInfoIcon}>
                  <img src="./public/icon-phone-vectorly.svg" alt="" />
                </div>
                <div className={styles.contactInfoContent}>
                  <h4 className={styles.contactInfoTitle}>Телефон</h4>
                  <p className={styles.contactInfoValue}><a href={primaryOffice.phoneHref}>{primaryOffice.phone}</a></p>
                  <p className={styles.contactInfoNote}>Пн-Пт: 9:00 - 18:00 МСК</p>
                </div>
              </div>
              <div className={styles.contactInfoDivider} />
              <div className={styles.contactInfoItem}>
                <div className={styles.contactInfoIcon}>
                  <img src="./public/icon-email-vectorly.svg" alt="" />
                </div>
                <div className={styles.contactInfoContent}>
                  <h4 className={styles.contactInfoTitle}>Email</h4>
                  <p className={styles.contactInfoValue}><a href={`mailto:${primaryOffice.email}`}>{primaryOffice.email}</a></p>
                  <p className={styles.contactInfoNote}>Ответим в течение 24 часов в рамках рабочего времени</p>
                </div>
              </div>
              <div className={styles.contactInfoDivider} />
              <div className={styles.contactInfoItem}>
                <div className={styles.contactInfoIcon}>
                  <img src="./public/icon-location-vectorly.svg" alt="" />
                </div>
                <div className={styles.contactInfoContent}>
                  <h4 className={styles.contactInfoTitle}>Адрес</h4>
                  <p className={styles.contactInfoValue}>Симферополь, ул. Кубанская д. 25</p>
                  <p className={styles.contactInfoNote}>Главный офис</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
