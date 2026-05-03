import type { ReactNode } from 'react'

interface ContactInfoItemData {
  href?: string
  iconSrc: string
  note: string
  title: string
  value: ReactNode
}

interface FormFieldData {
  id: string
  label: string
  placeholder?: string
  required?: boolean
  type: 'email' | 'tel' | 'text' | 'textarea'
}

interface SelectOptionData {
  label: string
  value: string
}

interface ContactFormSelectFieldData {
  id: string
  label: string
  options: readonly SelectOptionData[]
  placeholderLabel: string
}

interface ContactSectionProps {
  contactInfoItems: readonly ContactInfoItemData[]
  fields: readonly FormFieldData[]
  formTitle: string
  sectionTitle: string
  selectField?: ContactFormSelectFieldData
  submitLabel?: string
}

interface FaqItemData {
  active?: boolean
  answer: string
  question: string
}

interface FaqSectionProps {
  items: readonly FaqItemData[]
  sectionClassName?: string
  title: string
  toggleElement?: 'div' | 'span'
}

function PrivacyCheckbox() {
  return (
    <div className="form-checkbox">
      <input type="checkbox" id="privacy" defaultChecked />
      <label htmlFor="privacy">
        <span className="checkbox-custom">
          <svg
            className="checkbox-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white" />
            <path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" strokeOpacity="0.1" />
            <path className="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" strokeWidth="2" />
          </svg>
        </span>
        <span className="checkbox-text">
          Я согласен на обработку моих персональных данных в соответствии с{' '}
          <a href="/privacy">Политикой конфиденциальности</a>
        </span>
      </label>
    </div>
  )
}

function HiddenTrapField() {
  return (
    <div
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      aria-hidden="true"
    >
      <label htmlFor="website">Website</label>
      <input type="text" id="website" name="website" tabIndex={-1} autoComplete="off" />
    </div>
  )
}

function renderField(field: FormFieldData) {
  if (field.type === 'textarea') {
    return <textarea id={field.id} placeholder={field.placeholder} />
  }

  return <input type={field.type} id={field.id} placeholder={field.placeholder} required={field.required} />
}

export function ContactSection({
  contactInfoItems,
  fields,
  formTitle,
  sectionTitle,
  selectField,
  submitLabel = 'Отправить',
}: ContactSectionProps) {
  return (
    <section className="contact-section" id="contact-form">
      <h2 className="section-title">{sectionTitle}</h2>
      <div className="contact-grid">
        <div className="contact-form-wrapper">
          <h3 className="contact-form-title">{formTitle}</h3>
          <form className="contact-form" data-contact-form>
            <HiddenTrapField />
            {selectField ? (
              <div className="form-group form-group-package" data-form-group>
                <label htmlFor={selectField.id}>{selectField.label}</label>
                <select id={selectField.id} name="package" className="form-select" aria-label={selectField.label}>
                  <option value="">{selectField.placeholderLabel}</option>
                  {selectField.options.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {fields.map((field) => (
              <div className="form-group" data-form-group key={field.id}>
                <label htmlFor={field.id}>{field.label}</label>
                {renderField(field)}
              </div>
            ))}
            <PrivacyCheckbox />
            <button type="submit" className="btn-primary">
              {submitLabel}
            </button>
          </form>
        </div>
        <div className="contact-info">
          {contactInfoItems.map((item, index) => (
            <div key={`${item.title}-${index}`}>
              <div className="contact-info-item">
                <div className="contact-info-icon">
                  <img src={item.iconSrc} alt="" />
                </div>
                <div className="contact-info-content">
                  <h4 className="contact-info-title">{item.title}</h4>
                  <p className="contact-info-value">
                    {item.href ? <a href={item.href}>{item.value}</a> : item.value}
                  </p>
                  <p className="contact-info-note">{item.note}</p>
                </div>
              </div>
              {index < contactInfoItems.length - 1 ? <div className="contact-info-divider" /> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FaqSection({
  items,
  sectionClassName = 'faq-section',
  title,
  toggleElement = 'span',
}: FaqSectionProps) {
  const ToggleTag = toggleElement

  return (
    <section className={sectionClassName}>
      <h2 className="section-title">{title}</h2>
      <div className="faq-list">
        {items.map((item) => (
          <div
            className={`faq-item${item.active ? ' active' : ''}`}
            data-faq-item
            data-open={item.active ? 'true' : 'false'}
            key={item.question}
          >
            <div className="faq-question" data-faq-question>
              <h3>{item.question}</h3>
              <ToggleTag className="faq-toggle" />
            </div>
            <div className="faq-answer">
              <p>
                {item.answer.split('\n').map((line, index, lines) => (
                  <span key={`${item.question}-${index}`}>
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
  )
}
