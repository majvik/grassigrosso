/**
 * Настройки админ-панели Strapi (языки интерфейса).
 * @see https://docs.strapi.io/cms/admin-panel-customization/locales-translations
 *
 * Локаль `en` нельзя убрать из сборки — она fallback и дефолт при первом входе.
 * После включения `ru` каждый пользователь может выбрать русский один раз:
 * аватар (правый верх) → Profile / Профиль → Experience → Interface language → Русский.
 *
 * Важно: кастомные строки подхватываются через `config.translations`
 * (см. StrapiApp.loadTrads(customisations?.config?.translations)).
 * `registerTrads` на корневом app.js Admin не вызывает.
 */
import ru from './translations/ru.json';

export default {
  config: {
    locales: ['ru', 'en'],
    translations: {
      ru,
    },
  },
  bootstrap() {},
};
