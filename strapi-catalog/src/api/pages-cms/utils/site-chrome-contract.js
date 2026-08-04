'use strict';

const { canonicalPagesCmsPublicUrl } = require('./canonical-media-url');

const ALLOWED_HREFS = new Set(['/', '/hotels', '/dealers', '/catalog', '/documents', '/contacts', '/contacts#contact-form', '/privacy', '/terms', '/cookies']);
const PRIMARY_KEYS = ['hotels', 'dealers', 'catalog', 'documents', 'contacts'];
const GROUP_KEYS = ['solutions', 'information'];
const GROUP_LINK_KEYS = { solutions: ['hotels', 'dealers', 'catalog'], information: ['documents', 'contacts'] };
const POLICY_KEYS = ['privacy', 'terms', 'cookies'];
const HREF_BY_KEY = { hotels: '/hotels', dealers: '/dealers', catalog: '/catalog', documents: '/documents', contacts: '/contacts', privacy: '/privacy', terms: '/terms', cookies: '/cookies' };
const META_KEYS = new Set(['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations', 'status']);

class SiteChromeContractError extends Error {}
function text(value, path) {
  if (typeof value !== 'string' || !value.trim() || /[<>]/.test(value)) throw new SiteChromeContractError(`${path}: invalid text`);
  return value;
}
function href(value, path) {
  if (!ALLOWED_HREFS.has(value)) throw new SiteChromeContractError(`${path}: invalid href`);
  return value;
}
function exactHref(value, expected, path) {
  if (value !== expected) throw new SiteChromeContractError(`${path}: invalid exact href`);
  return value;
}
function keys(items, expected, path) {
  if (!Array.isArray(items) || items.length !== expected.length || items.some((item, index) => item?.key !== expected[index])) throw new SiteChromeContractError(`${path}: invalid keys`);
}
function onlyKeys(value, allowed, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new SiteChromeContractError(`${path}: object required`);
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) throw new SiteChromeContractError(`${path}: unknown ${unknown.join(',')}`);
}
function clean(node) {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== 'object') return node;
  if (typeof node.url === 'string') return { url: canonicalPagesCmsPublicUrl(node) || node.url };
  return Object.fromEntries(Object.entries(node).filter(([key]) => !META_KEYS.has(key)).map(([key, value]) => [key, clean(value)]));
}
function validateLink(item, path) { onlyKeys(item, ['key','label','href'], path); text(item?.key, `${path}.key`); text(item?.label, `${path}.label`); href(item?.href, `${path}.href`); if (HREF_BY_KEY[item.key] !== item.href) throw new SiteChromeContractError(`${path}: key/href mismatch`); }
function canonicalizeSiteChrome(input) {
  const data = clean(input);
  if (!data || typeof data !== 'object' || !data.header || !data.footer) throw new SiteChromeContractError('root: header/footer required');
  const h = data.header; const f = data.footer;
  onlyKeys(data, ['header','footer'], 'root');
  onlyKeys(h, ['greeting','phone_label','phone_href','schedule','logo','logo_alt','logo_home_href','primary_navigation','contact_cta_label','contact_cta_href'], 'header');
  onlyKeys(f, ['logo','logo_alt','description','inn_label','inn','ogrn_label','ogrn','navigation_groups','contacts_title','phone_label','phone_value','phone_href','email_label','email_value','email_href','schedule_label','schedule','policy_links','copyright_brand','copyright_legal_text'], 'footer');
  ['greeting','phone_label','schedule','logo_alt','contact_cta_label'].forEach((key) => text(h[key], `header.${key}`));
  exactHref(h.phone_href, 'tel:+79782484380', 'header.phone_href'); exactHref(h.logo_home_href, '/', 'header.logo_home_href'); href(h.contact_cta_href, 'header.contact_cta_href');
  if (!h.logo?.url || !/^\/(?!\/)/.test(h.logo.url)) throw new SiteChromeContractError('header.logo');
  keys(h.primary_navigation, PRIMARY_KEYS, 'header.primary_navigation'); h.primary_navigation.forEach((item, index) => validateLink(item, `header.primary_navigation[${index}]`));
  ['logo_alt','description','inn_label','inn','ogrn_label','ogrn','contacts_title','phone_label','phone_value','email_label','email_value','schedule_label','schedule','copyright_brand','copyright_legal_text'].forEach((key) => text(f[key], `footer.${key}`));
  if (!/^\d{10}$/.test(f.inn) || !/^\d{13}$/.test(f.ogrn)) throw new SiteChromeContractError('footer: invalid requisites');
  if (!f.logo?.url || !/^\/(?!\/)/.test(f.logo.url)) throw new SiteChromeContractError('footer.logo');
  exactHref(f.phone_href, 'tel:+79782484380', 'footer.phone_href'); exactHref(f.email_href, 'mailto:sales@grassigrosso.com', 'footer.email_href');
  keys(f.navigation_groups, GROUP_KEYS, 'footer.navigation_groups');
  f.navigation_groups.forEach((group, index) => { onlyKeys(group, ['key','title','links'], `footer.navigation_groups[${index}]`); text(group.title, `footer.navigation_groups[${index}].title`); keys(group.links, GROUP_LINK_KEYS[group.key], `footer.navigation_groups[${index}].links`); group.links.forEach((item, linkIndex) => validateLink(item, `footer.navigation_groups[${index}].links[${linkIndex}]`)); });
  keys(f.policy_links, POLICY_KEYS, 'footer.policy_links'); f.policy_links.forEach((item, index) => validateLink(item, `footer.policy_links[${index}]`));
  return data;
}
const SITE_CHROME_POPULATE = { header: { populate: { logo: true, primary_navigation: true } }, footer: { populate: { logo: true, navigation_groups: { populate: { links: true } }, policy_links: true } } };
async function loadCanonicalSiteChrome(strapi) {
  const docs = strapi.documents('api::site-chrome.site-chrome');
  const entry = (await docs.findFirst({ status: 'published', populate: SITE_CHROME_POPULATE })) || (await docs.findFirst({ populate: SITE_CHROME_POPULATE }));
  return entry ? canonicalizeSiteChrome(entry) : null;
}
module.exports = { canonicalizeSiteChrome, loadCanonicalSiteChrome, SITE_CHROME_POPULATE, SiteChromeContractError, PRIMARY_KEYS, GROUP_KEYS, POLICY_KEYS };
