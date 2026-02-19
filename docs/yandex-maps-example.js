/**
 * Пример: Яндекс.Карты API 2.1 — метки фирменным цветом, балун с адресом по наведению.
 * Подключение: <script src="https://api-maps.yandex.ru/2.1/?lang=ru_RU" type="text/javascript"></script>
 * Затем: ymaps.ready(initContactMaps);
 *
 * Координаты нужно уточнить (например, через Геокодер или из текущих карт Конструктора).
 */
(function () {
  var BRAND_COLOR = '#283e37'; // --color-primary

  var OFFICES = [
    { id: 'main', center: [44.9522, 34.1027], zoom: 16, name: 'Главный офис', address: 'Симферополь, ул. Кубанская д. 25' },
    { id: 'voronezh', center: [51.6605, 39.2006], zoom: 16, name: 'Центральная Россия', address: 'Воронеж, ул. Остужева 43 И' },
    { id: 'lnr', center: [48.567, 39.3172], zoom: 16, name: 'ЛНР', address: 'Луганск, ул. Фабричная д 1' },
    { id: 'dnr', center: [48.0333, 38.2667], zoom: 16, name: 'ДНР', address: 'Харцизск, ул. Вокзальная, д. 52' }
  ];

  function createPlacemark(coord, address, options) {
    var opts = Object.assign({
      preset: 'islands#circleDotIcon',
      iconColor: BRAND_COLOR,
      hasHint: false,
      openBalloonOnClick: false,
      hideIconOnBalloonOpen: false
    }, options || {});

    var placemark = new ymaps.Placemark(
      coord,
      {
        balloonContentBody: address,
        balloonContentHeader: '<strong>Офис</strong>'
      },
      opts
    );

    // Балун по наведению
    placemark.events.add('mouseenter', function () {
      placemark.balloon.open();
    });
    placemark.events.add('mouseleave', function () {
      placemark.balloon.close();
    });

    return placemark;
  }

  function initMap(containerId, office) {
    var container = document.getElementById(containerId);
    if (!container || !office) return;

    var map = new ymaps.Map(containerId, {
      center: office.center,
      zoom: office.zoom,
      controls: ['zoomControl']
    });

    var placemark = createPlacemark(office.center, office.address);
    map.geoObjects.add(placemark);
  }

  function initContactMaps() {
    OFFICES.forEach(function (office) {
      var containerId = 'map-' + office.id;
      initMap(containerId, office);
    });
  }

  if (typeof ymaps !== 'undefined') {
    ymaps.ready(initContactMaps);
  }
  window.initContactMaps = initContactMaps;
})();
