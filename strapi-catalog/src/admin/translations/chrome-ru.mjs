const components = {
  'chrome.link': ['Ссылка сайта', { key: 'Системный ключ', label: 'Текст', href: 'Ссылка' }],
  'chrome.navigation-group': ['Группа ссылок', { key: 'Системный ключ', title: 'Заголовок', links: 'Ссылки' }],
  'chrome.header': ['Шапка сайта', {
    greeting: 'Приветствие', phone_label: 'Телефон — текст', phone_href: 'Телефон — ссылка', schedule: 'Режим работы', logo: 'Логотип', logo_alt: 'Описание логотипа', logo_home_href: 'Ссылка логотипа', primary_navigation: 'Основная навигация', contact_cta_label: 'Кнопка связи — текст', contact_cta_href: 'Кнопка связи — ссылка',
  }],
  'chrome.footer': ['Подвал сайта', {
    logo: 'Логотип', logo_alt: 'Описание логотипа', description: 'Описание', inn_label: 'ИНН — подпись', inn: 'ИНН', ogrn_label: 'ОГРН — подпись', ogrn: 'ОГРН', navigation_groups: 'Группы навигации', contacts_title: 'Заголовок контактов', phone_label: 'Телефон — подпись', phone_value: 'Телефон — текст', phone_href: 'Телефон — ссылка', email_label: 'Электронная почта — подпись', email_value: 'Электронная почта — текст', email_href: 'Электронная почта — ссылка', schedule_label: 'Режим работы — подпись', schedule: 'Режим работы', policy_links: 'Юридические ссылки', copyright_brand: 'Копирайт бренда', copyright_legal_text: 'Юридический текст',
  }],
};

const translations = {};
for (const [uid, [displayName, attrs]] of Object.entries(components)) {
  translations[uid] = displayName;
  translations[displayName] = displayName;
  for (const [name, label] of Object.entries(attrs)) {
    translations[`content-manager.components.${uid}.${name}`] = label;
    translations[`content-type-builder.components.${uid}.attributes.${name}`] = label;
  }
}
const typeUid = 'api::site-chrome.site-chrome';
translations['Шапка и подвал сайта'] = 'Шапка и подвал сайта';
translations[typeUid] = 'Шапка и подвал сайта';
for (const [name, label] of Object.entries({ header: 'Шапка сайта', footer: 'Подвал сайта' })) {
  translations[`content-manager.content-types.${typeUid}.${name}`] = label;
  translations[`content-type-builder.content-types.${typeUid}.attributes.${name}`] = label;
}

export default translations;
