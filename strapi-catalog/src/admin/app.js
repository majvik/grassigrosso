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
  bootstrap() {},
};
