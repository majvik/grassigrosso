/**
 * Настройки админ-панели Strapi (языки интерфейса).
 * @see https://docs.strapi.io/cms/admin-panel-customization/locales-translations
 *
 * Локаль `en` нельзя убрать из сборки — она fallback и дефолт при первом входе.
 * После включения `ru` каждый пользователь может выбрать русский один раз:
 * аватар (правый верх) → Profile / Профиль → Experience → Interface language → Русский.
 */
export default {
  config: {
    locales: ['ru', 'en'],
  },
  async registerTrads({ locales }) {
    return Promise.all(
      locales.map(async (locale) => {
        try {
          const { default: data } = await import(`./translations/${locale}.json`)
          return { data, locale }
        } catch {
          return { data: {}, locale }
        }
      })
    )
  },
  bootstrap() {},
};
