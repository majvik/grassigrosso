# Яндекс.Карты API: метка фирменным цветом и балун по наведению

## Текущая схема на сайте

Сейчас карты подключаются через **Конструктор карт** (iframe/script по `data-map-src`). Конструктор сам рендерит карту в контейнер; метки и стили задаются в интерфейсе на [yandex.ru/map-constructor](https://yandex.ru/map-constructor/). **Программно** изменить цвет метки и сделать открытие балуна по наведению в этой схеме **нельзя**.

---

## Что нужно для кастомной метки и балуна по наведению

Нужно перейти на **JavaScript API 2.1** (ymaps): инициализировать карту в своём контейнере и добавлять метки через `ymaps.Placemark` с нужными опциями и обработчиками событий.

### 1. Подключение API

```html
<script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=ВАШ_КЛЮЧ" type="text/javascript"></script>
```

Ключ API: [developer.tech.yandex.ru](https://developer.tech.yandex.ru/) → JavaScript API и HTTP Геокодер.

### 2. Метка фирменным цветом

- **preset** — один из: `'islands#circleDotIcon'`, `'islands#circleIcon'`, `'islands#dotIcon'`, `'islands#icon'` (только с ними работает `iconColor`).
- **iconColor** — цвет в любом CSS-формате (название, hex, rgb).

Пример (фирменный цвет из стилей сайта `#283e37`):

```javascript
var placemark = new ymaps.Placemark(
  [55.75, 37.61],
  {
    balloonContentBody: 'Симферополь, ул. Кубанская д. 25',
    hintContent: 'Адрес офиса'
  },
  {
    preset: 'islands#circleDotIcon',
    iconColor: '#283e37'
  }
);
map.geoObjects.add(placemark);
```

### 3. Балун по наведению (вместо клика)

По умолчанию балун открывается по **клику** (`openBalloonOnClick: true`). Чтобы показывать балун **по наведению**:

- Отключить открытие по клику: `openBalloonOnClick: false` (по желанию).
- Подписаться на события метки: `mouseenter` — открыть балун, `mouseleave` — закрыть.

```javascript
placemark.events.add('mouseenter', function () {
  placemark.balloon.open();
});
placemark.events.add('mouseleave', function () {
  placemark.balloon.close();
});
```

У метки уже есть `balloon` (экземпляр балуна); контент берётся из `properties.balloonContent` / `balloonContentBody` / `balloonContentHeader`.

### 4. Полезные опции Placemark

| Опция | Описание |
|--------|----------|
| `preset` | Стиль иконки (для цвета — только circleDotIcon, circleIcon, dotIcon, icon) |
| `iconColor` | Цвет иконки (CSS) |
| `hasBalloon` | Есть ли балун (по умолчанию true) |
| `hasHint` | Показывать ли hint при наведении (можно false, если используем балун) |
| `openBalloonOnClick` | Открывать балун по клику (по умолчанию true) |
| `hideIconOnBalloonOpen` | Скрывать метку при открытом балуне (по умолчанию true, можно false) |

### 5. Документация

- [Placemark (метка)](https://yandex.ru/dev/jsapi-v2-1/doc/ru/v2-1/ref/reference/Placemark)
- [Balloon](https://yandex.ru/dev/jsapi-v2-1/doc/ru/v2-1/ref/reference/Balloon)
- [События геообъектов](https://yandex.ru/dev/jsapi-v2-1/doc/ru/v2-1/ref/reference/GeoObject#events) — `mouseenter`, `mouseleave`, `click` и др.

---

## Итог

- **Конструктор** — быстрая вставка карты, но без кастомного цвета метки и балуна по наведению из кода.
- **JS API 2.1** — полный контроль: `iconColor` для фирменного цвета, `placemark.balloon.open()/close()` в `mouseenter`/`mouseleave` для балуна с адресом по наведению.

В `docs/yandex-maps-example.js` приведён готовый пример инициализации карт офисов с метками и балуном по наведению.
