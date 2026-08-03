/**
 * Настройки админ-панели Strapi (языки интерфейса).
 * @see https://docs.strapi.io/cms/admin-panel-customization/locales-translations
 *
 * Локаль `en` нельзя убрать из сборки — она fallback и дефолт при первом входе.
 * После включения `ru` каждый пользователь может выбрать русский один раз:
 * аватар (правый верх) → Profile / Профиль → Experience → Interface language → Русский.
 *
 * Кастомные строки: только `config.translations` (StrapiApp.loadTrads).
 * `registerTrads` на корневом app.js Admin не вызывает — не использовать.
 *
 * Enum Select: до апгрейда с #26837 регистрируем EnumerationInput через addFields,
 * чтобы option labels шли через formatMessage(id=value), а schema values оставались
 * техническими (image_only, certificate, …).
 */
import ru from './translations/ru.json';
import EnumerationInput from './extensions/EnumerationInput';

export default {
  config: {
    locales: ['ru', 'en'],
    translations: {
      ru,
    },
  },
  bootstrap(app) {
    app.addFields({ type: 'enumeration', Component: EnumerationInput });
  },
};
