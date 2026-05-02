import leadRouting from './lead-routing.json'

export const FORM_PAGE_LABELS = leadRouting.labels

export type FormPageLabel = (typeof FORM_PAGE_LABELS)[number]

export interface LeadPayload {
  name: string
  phone: string
  email: string
  comment?: string
  city?: string
  page: FormPageLabel | string
}

export const CONTACT_FORM_PAGE_LABEL_BY_SLUG = {
  index: 'Главная страница',
  hotels: 'Страница "Отелям"',
  dealers: 'Страница "Дилерам"',
  catalog: 'Страница "Каталог"',
  contacts: 'Страница "Контакты"',
} as const satisfies Record<string, FormPageLabel>

export function getPageLabelBySlug(slug: string): FormPageLabel | string {
  return CONTACT_FORM_PAGE_LABEL_BY_SLUG[slug as keyof typeof CONTACT_FORM_PAGE_LABEL_BY_SLUG] || slug
}
