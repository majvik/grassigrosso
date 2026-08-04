type Link = { key: string; label: string; href: string }
type Media = { url: string }
type SiteChrome = {
  header: { greeting: string; phone_label: string; phone_href: string; schedule: string; logo: Media; logo_alt: string; logo_home_href: string; primary_navigation: Link[]; contact_cta_label: string; contact_cta_href: string }
  footer: { logo: Media; logo_alt: string; description: string; inn_label: string; inn: string; ogrn_label: string; ogrn: string; navigation_groups: Array<{ key: string; title: string; links: Link[] }>; contacts_title: string; phone_label: string; phone_value: string; phone_href: string; email_label: string; email_value: string; email_href: string; schedule_label: string; schedule: string; policy_links: Link[]; copyright_brand: string; copyright_legal_text: string }
}

const hrefs = new Set(['/', '/hotels', '/dealers', '/catalog', '/documents', '/contacts', '/contacts#contact-form', '/privacy', '/terms', '/cookies'])
const expected = { primary: ['hotels','dealers','catalog','documents','contacts'], groups: ['solutions','information'], solutions: ['hotels','dealers','catalog'], information: ['documents','contacts'], policies: ['privacy','terms','cookies'] }
const text = (value: unknown): value is string => typeof value === 'string' && Boolean(value.trim()) && !/[<>]/.test(value)
const media = (value: unknown): value is Media => Boolean(value) && typeof value === 'object' && typeof (value as Media).url === 'string' && /^\/(?!\/)/.test((value as Media).url)
const links = (value: unknown, keys: string[]): value is Link[] => Array.isArray(value) && value.length === keys.length && value.every((item, index) => item?.key === keys[index] && text(item.label) && hrefs.has(item.href))

export function parseSiteChrome(value: unknown): SiteChrome {
  if (!value || typeof value !== 'object') throw new Error('site chrome object required')
  const data = value as SiteChrome; const h = data.header; const f = data.footer
  if (!h || !f || !media(h.logo) || !media(f.logo)) throw new Error('site chrome roots/media')
  const headerTexts = [h.greeting,h.phone_label,h.schedule,h.logo_alt,h.contact_cta_label]
  const footerTexts = [f.logo_alt,f.description,f.inn_label,f.inn,f.ogrn_label,f.ogrn,f.contacts_title,f.phone_label,f.phone_value,f.email_label,f.email_value,f.schedule_label,f.schedule,f.copyright_brand,f.copyright_legal_text]
  if (![...headerTexts, ...footerTexts].every(text)) throw new Error('site chrome text')
  if (h.phone_href !== 'tel:+79782484380' || h.logo_home_href !== '/' || !hrefs.has(h.contact_cta_href)) throw new Error('site chrome header href')
  if (f.phone_href !== 'tel:+79782484380' || f.email_href !== 'mailto:sales@grassigrosso.com') throw new Error('site chrome contact href')
  if (!/^\d{10}$/.test(f.inn) || !/^\d{13}$/.test(f.ogrn) || !links(h.primary_navigation, expected.primary) || !links(f.policy_links, expected.policies)) throw new Error('site chrome collections')
  if (!Array.isArray(f.navigation_groups) || f.navigation_groups.length !== 2 || f.navigation_groups.some((group, i) => group.key !== expected.groups[i] || !text(group.title) || !links(group.links, expected[group.key as 'solutions'|'information']))) throw new Error('site chrome groups')
  return structuredClone(data)
}

function exact<T extends Element>(selector: string, count?: number): T[] {
  const nodes = [...document.querySelectorAll<T>(selector)]
  if (count !== undefined && nodes.length !== count) throw new Error(`${selector}: expected ${count}, got ${nodes.length}`)
  return nodes
}

export function applySiteChrome(data: SiteChrome): void {
  const h = data.header; const f = data.footer
  const desktopNav = exact<HTMLAnchorElement>('.nav-menu a', 5); const mobileNav = exact<HTMLAnchorElement>('.mobile-nav a', 5)
  const headerLogos = exact<HTMLImageElement>('.header-main .logo-img, .mobile-menu .logo-img', 2)
  const headerLogoLinks = exact<HTMLAnchorElement>('.header-main a.logo, .mobile-menu a.logo', 2)
  const footerColumns = exact<HTMLElement>('.footer-content > .footer-column:not(.footer-about):not(.footer-contacts)', 2)
  const footerContacts = exact<HTMLElement>('.footer-contacts .contact-item', 3)
  const policies = exact<HTMLAnchorElement>('.footer-policies a', 3)
  const topSlot = exact<HTMLElement>('.header-top-right', 1)[0]
  if (!topSlot.querySelector('a') || !topSlot.querySelector('span:last-child')) throw new Error('header top slots')
  if (footerColumns.some((column, i) => !column.querySelector('.footer-heading') || column.querySelectorAll('.footer-links a').length !== f.navigation_groups[i].links.length)) throw new Error('footer group slots')
  if (footerContacts.some((row) => !row.querySelector('.contact-label') || !row.querySelector('.contact-value'))) throw new Error('footer contact slots')
  const copyrightSlot = exact<HTMLElement>('.footer-copyright-legal', 1)[0]
  if (!copyrightSlot.querySelector('.footer-copyright-brand')) throw new Error('copyright slot')
  // All selectors/counts are resolved before the first write: invalid DOM leaves baseline untouched.
  exact<HTMLElement>('.header-top-left', 1)[0].textContent = h.greeting
  const top = topSlot; const topPhone = top.querySelector('a')!; const topSchedule = top.querySelector('span:last-child')!
  topPhone.textContent = h.phone_label; topPhone.href = h.phone_href; topSchedule.textContent = h.schedule
  headerLogos.forEach((img) => { img.src = h.logo.url; img.alt = h.logo_alt }); headerLogoLinks.forEach((a) => { a.href = h.logo_home_href })
  ;[desktopNav, mobileNav].forEach((nav) => nav.forEach((a, i) => { a.textContent = h.primary_navigation[i].label; a.href = h.primary_navigation[i].href }))
  exact<HTMLAnchorElement>('.btn-contact, .mobile-menu-cta', 2).forEach((a) => { a.textContent = h.contact_cta_label; a.href = h.contact_cta_href })
  const footerLogo = exact<HTMLImageElement>('.footer-logo img', 1)[0]; footerLogo.src = f.logo.url; footerLogo.alt = f.logo_alt
  exact<HTMLElement>('.footer-description', 1)[0].textContent = f.description
  const requisites = exact<HTMLElement>('.footer-legal p', 2); requisites[0].textContent = `${f.inn_label} ${f.inn}`; requisites[1].textContent = `${f.ogrn_label} ${f.ogrn}`
  footerColumns.forEach((column, i) => { const title = column.querySelector<HTMLElement>('.footer-heading')!; const anchors = [...column.querySelectorAll<HTMLAnchorElement>('.footer-links a')]; title.textContent = f.navigation_groups[i].title; anchors.forEach((a, j) => { a.textContent = f.navigation_groups[i].links[j].label; a.href = f.navigation_groups[i].links[j].href }) })
  exact<HTMLElement>('.footer-contacts .footer-heading', 1)[0].textContent = f.contacts_title
  const contactRows = [[f.phone_label,f.phone_value,f.phone_href],[f.email_label,f.email_value,f.email_href],[f.schedule_label,f.schedule,'']] as const
  footerContacts.forEach((row, i) => { const label = row.querySelector<HTMLElement>('.contact-label')!; const target = row.querySelector<HTMLElement>('.contact-value')!; label.textContent = contactRows[i][0]; const anchor = target.querySelector<HTMLAnchorElement>('a'); if (anchor) { anchor.textContent = contactRows[i][1]; anchor.href = contactRows[i][2] } else target.textContent = contactRows[i][1] })
  policies.forEach((a, i) => { a.textContent = f.policy_links[i].label; a.href = f.policy_links[i].href })
  const copyright = copyrightSlot; const brand = copyright.querySelector<HTMLElement>('.footer-copyright-brand')!; brand.textContent = f.copyright_brand; [...copyright.childNodes].filter((node) => node !== brand).forEach((node) => node.remove()); copyright.append(document.createTextNode(` ${f.copyright_legal_text}`))
}

let inFlight: Promise<void> | null = null
export function hydrateSiteChrome(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = fetch('/api/site-chrome', { headers: { Accept: 'application/json' } }).then(async (response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); const envelope = await response.json(); if (!envelope || !['strapi','memory-cache','disk-snapshot'].includes(envelope.source)) throw new Error('invalid site chrome envelope'); applySiteChrome(parseSiteChrome(envelope.data)) }).catch(() => { inFlight = null })
  return inFlight
}
