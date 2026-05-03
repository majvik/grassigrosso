export const MARKETING_PAGE_CONTENT = {
  index: `<!-- Hero Section -->
      <section class="hero">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">Любовь с первого утра<sup class="hero-title-tm" aria-label="Торговая марка">Ⓒ</sup></h1>
            <p class="hero-description">Мы создаем продуманные системы для сна и естественного восстановления, чтобы каждое утро начиналось легко и спокойно.</p>
          </div>
          <div class="hero-link-wrapper">
            <a href="#" class="hero-link" id="heroCommercialOfferLink" aria-haspopup="dialog">
              <span>Получить подробную<br>информацию</span>
              <span class="arrow-icon">
                <img src="./public/arrow-down.svg" alt="" />
              </span>
            </a>
          </div>
        </div>
        <div class="hero-image" id="heroVideo">
          <video
            class="hero-video hero-video--desktop"
            poster="./public/grassigrosso-poster.avif"
            autoplay
            loop
            muted
            playsinline
          >
            <source src="./public/grassigrosso-silent.av1.mp4" type="video/mp4; codecs=av01.0.08M.08" />
            <source src="./public/grassigrosso-silent.webm" type="video/webm" />
            <source src="./public/grassigrosso-silent.mp4" type="video/mp4" />
          </video>
          <video
            class="hero-video hero-video--mobile"
            poster="./public/grassigrosso-poster.avif"
            autoplay
            loop
            muted
            playsinline
          >
            <source src="./public/grassigrosso-silent-mobile.webm" type="video/webm" />
            <source src="./public/grassigrosso-silent-mobile.mp4" type="video/mp4" />
          </video>
          <picture class="hero-poster">
            <source type="image/avif" srcset="./public/grassigrosso-poster.avif" />
            <source type="image/webp" srcset="./public/grassigrosso-poster.webp" />
            <img
              src="./public/grassigrosso-poster.jpg"
              alt="Grassigrosso"
            />
          </picture>
          <button class="hero-play-btn" aria-label="Воспроизвести видео">
            <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="32" r="32" fill="white" fill-opacity="0.9"/>
              <path d="M26 20L46 32L26 44V20Z" fill="#243731"/>
            </svg>
          </button>
        </div>
      </section>

      <!-- Business Solutions -->
      <section class="business-solutions">
        <h2 class="section-title">Решения для бизнеса</h2>
        <div class="solutions-grid">
          <div class="solution-card">
            <div class="solution-icon">
              <img src="./public/icon-hotels.svg" alt="" />
            </div>
            <div class="solution-content">
              <h3 class="solution-title">Отелям</h3>
              <p class="solution-text">Сон, о котором хочется написать в отзыве.<br> Матрасы, которые создают впечатление и повышают лояльность гостей.</p>
              <a href="/hotels" class="solution-link">
                Узнать больше
                <img src="./public/arrow-small.svg" alt="" class="arrow-small" />
              </a>
            </div>
          </div>
          <div class="solution-divider"></div>
          <div class="solution-card">
            <div class="solution-icon">
              <img src="./public/icon-dealers.svg" alt="" />
            </div>
            <div class="solution-content">
              <h3 class="solution-title">Дилерам</h3>
              <p class="solution-text">Продуманные решения для ваших клиентов. Инвестиция в восстановление каждого утра ближайших 10 лет.</p>
              <a href="/dealers" class="solution-link">
                Условия партнёрства
                <img src="./public/arrow-small.svg" alt="" class="arrow-small" />
              </a>
            </div>
          </div>
          <div class="solution-divider"></div>
          <div class="solution-card">
            <div class="solution-icon">
              <img src="./public/icon-catalog.svg" alt="" />
            </div>
            <div class="solution-content">
              <h3 class="solution-title">Каталог</h3>
              <p class="solution-text">Инженерная точность сна в каждой модели.<br>Матрасы, в которых все на своем месте − и вы тоже.</p>
              <a href="/catalog" class="solution-link">
                Смотреть коллекции
                <img src="./public/arrow-small.svg" alt="" class="arrow-small" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Philosophy -->
      <section class="philosophy">
        <div class="philosophy-left">
          <h2 class="section-title">Наша философия</h2>
          <p class="philosophy-description">Мы создаём условия, в которых природа делает своё для вашего естественного восстановления.<br> Каждый слой – осмысленный, каждое решение – логичное.</p>
        </div>
        <div class="philosophy-right">
          <div class="philosophy-feature">
            <div class="feature-icon">
              <img src="./public/icon-engineering.svg" alt="" />
            </div>
            <div class="feature-content">
              <h3 class="feature-title">Инженерная точность сна</h3>
              <p class="feature-text">Мы собираем современные технологии и лучшие инженерные решения в продуманные продукты для сна.</p>
            </div>
          </div>
          <div class="philosophy-divider"></div>
          <div class="philosophy-feature">
            <div class="feature-icon">
              <img src="./public/icon-nature.svg" alt="" />
            </div>
            <div class="feature-content">
              <h3 class="feature-title">Естественное восстановление</h3>
              <p class="feature-text">Оставлено только то, что действительно работает.<br> Чистые формы снаружи и внутри.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Collections -->
      <section class="collections">
        <div class="collections-header">
          <div class="collections-header-left">
            <h2 class="section-title">Коллекции</h2>
            <p class="collections-subtitle">Каждая коллекция вдохновлена своей историей и проблемой, которую мы хотим решить. Но все они объединены общими принципами инженерной осознанности.</p>
          </div>
          <a href="/catalog" class="collections-link">
            смотреть Все коллекции
            <img src="./public/arrow-small.svg" alt="" class="arrow-small" />
          </a>
        </div>
        <div class="collections-grid">
          <div class="collection-card">
            <div class="collection-image">
              <picture>
                <source type="image/avif" srcset="./public/collection-Classic.avif 2x, ./public/collection-Classic@0.5x.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Classic.webp 2x, ./public/collection-Classic@0.5x.webp 1x" />
                <source type="image/png" srcset="./public/collection-Classic.png 2x, ./public/collection-Classic@0.5x.png 1x" />
                <img src="./public/collection-Classic@0.5x.png" alt="Classic" />
              </picture>
            </div>
            <div class="collection-content">
              <div class="collection-title-group">
                <h3 class="collection-title">Classic</h3>
                <p class="collection-subtitle">Классик</p>
              </div>
              <ul class="collection-features">
                <li>Доступные модели</li>
                <li>Классические технологии</li>
                <li>Базовый, понятный комфорт</li>
              </ul>
            </div>
          </div>
          <div class="collection-card">
            <div class="collection-image">
              <picture>
                <source type="image/avif" srcset="./public/collection-Flexi.avif 2x, ./public/collection-Flexi@0.5x.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Flexi.webp 2x, ./public/collection-Flexi@0.5x.webp 1x" />
                <source type="image/png" srcset="./public/collection-Flexi.png 2x, ./public/collection-Flexi@0.5x.png 1x" />
                <img src="./public/collection-Flexi@0.5x.png" alt="Flexi" />
              </picture>
            </div>
            <div class="collection-content">
              <div class="collection-title-group">
                <h3 class="collection-title">Flexi</h3>
                <p class="collection-subtitle">Флекси</p>
              </div>
              <ul class="collection-features">
                <li>Современные пены</li>
                <li>Упругая адаптивная поддержка</li>
                <li>Минималистичный дизайн</li>
              </ul>
            </div>
          </div>
          <div class="collection-card">
            <div class="collection-image">
              <picture>
                <source type="image/avif" srcset="./public/collection-Relax.avif 2x, ./public/collection-Relax@0.5x.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Relax.webp 2x, ./public/collection-Relax@0.5x.webp 1x" />
                <source type="image/png" srcset="./public/collection-Relax.png 2x, ./public/collection-Relax@0.5x.png 1x" />
                <img src="./public/collection-Relax@0.5x.png" alt="Relax" />
              </picture>
            </div>
            <div class="collection-content">
              <div class="collection-title-group">
                <h3 class="collection-title">Relax</h3>
                <p class="collection-subtitle">Релакс</p>
              </div>
              <ul class="collection-features">
                <li>Пружины малого диаметра</li>
                <li>Высокая адаптивность поддержки</li>
                <li>Высокая несущая способность</li>
              </ul>
            </div>
          </div>
          <div class="collection-card">
            <div class="collection-image">
              <picture>
                <source type="image/avif" srcset="./public/collection-Trend.avif 2x, ./public/collection-Trend@0.5x.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Trend.webp 2x, ./public/collection-Trend@0.5x.webp 1x" />
                <source type="image/png" srcset="./public/collection-Trend.png 2x, ./public/collection-Trend@0.5x.png 1x" />
                <img src="./public/collection-Trend@0.5x.png" alt="Trend" />
              </picture>
            </div>
            <div class="collection-content">
              <div class="collection-title-group">
                <h3 class="collection-title">Trend</h3>
                <p class="collection-subtitle">Тренд</p>
              </div>
              <ul class="collection-features">
                <li>Проверенные решения</li>
                <li>Популярный дизайн</li>
                <li>Для современных интерьеров</li>
              </ul>
            </div>
          </div>
          <!-- Hidden: Viva Natura (скрыта, не удалена) -->
          <div class="collection-card" style="display: none;">
            <div class="collection-image">
              <picture>
                <source type="image/avif" srcset="./public/collection-Viva-Natura@2x.avif 2x, ./public/collection-Viva-Natura@0.5x.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Viva-Natura@2x.webp 2x, ./public/collection-Viva-Natura@0.5x.webp 1x" />
                <source type="image/png" srcset="./public/collection-Viva-Natura@2x.png 2x, ./public/collection-Viva-Natura@0.5x.png 1x" />
                <img src="./public/collection-Viva-Natura@0.5x.png" alt="Viva Natura" />
              </picture>
            </div>
            <div class="collection-content">
              <div class="collection-title-group">
                <h3 class="collection-title">Viva Natura</h3>
                <p class="collection-subtitle">Вива Натура</p>
              </div>
              <ul class="collection-features">
                <li>Натуральные компоненты</li>
                <li>Экологичность</li>
                <li>Премиальный комфорт</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="collections-nav">
          <div class="collections-progress">
            <div class="collections-progress-fill"></div>
          </div>
          <div class="collections-arrows">
            <button class="arrow-btn prev" disabled>
              <img src="./public/arrow-down.svg" alt="" />
            </button>
            <button class="arrow-btn next">
              <img src="./public/arrow-down.svg" alt="" />
            </button>
          </div>
        </div>
      </section>

      <!-- Partners -->
      <section class="partners">
        <h2 class="section-title">Партнеры и технологии</h2>
        <div class="partners-grid partners-grid-image" aria-hidden="true">
          <img src="./logos@2x-normal.png" alt="" class="partners-img partners-img-normal" width="1920" height="640" />
          <img src="./logos@2x-mobile.png" alt="" class="partners-img partners-img-mobile" width="750" height="1500" />
        </div>
      </section>

      <!-- Testimonials -->
      <section class="testimonials">
        <h2 class="section-title">Нам доверяют</h2>
        <div class="testimonials-grid">
          <div class="testimonial-card">
            <span class="testimonial-tag">Партнёр</span>
            <h3 class="testimonial-company">ИП Левченко Т.А.</h3>
            <div class="testimonial-author">
              <p class="author-name">Воронина Е.С.</p>
              <p class="author-position">Директор розничной торговли</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Больше всего ценим логистику, ассортимент, качество, профессиональную работу менеджеров. Особенно хочется отметить менеджера, с которым мы работаем продолжительное время. Спасибо за ваш труд.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">Кубань Матрас</h3>
            <div class="testimonial-author">
              <p class="author-name">Грушко Пётр Леонидович</p>
              <p class="author-position">Директор</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Отмечаем сроки и качество продукции. Работа персонала организована на высшем уровне.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Санаторий</span>
            <h3 class="testimonial-company">ГУП РК «СОК «Руссия»</h3>
            <div class="testimonial-author">
              <p class="author-name">Инна</p>
              <p class="author-position">Специалист по закупкам</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Остались довольны качеством, сроками, ценовой политикой.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">ИП Корнилов А.И.</h3>
            <div class="testimonial-author">
              <p class="author-name">Корнилов Александр Иванович</p>
              <p class="author-position">Предприниматель</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Впечатлил индивидуальный подход – погружение в ситуацию! Продуманная логистика, молодые, энергичные менеджеры!</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">ПРОМЭКС</h3>
            <div class="testimonial-author">
              <p class="author-name">Елена</p>
              <p class="author-position">Заместитель управляющего</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Выделяем скорость реакции на запросы, оперативность согласования заказов и работу в тандеме с менеджерами фабрики. Производитель гибко подходит к подбору решений под потребности разных розничных точек, помогает формировать ассортимент. Логистика и сроки поставки стабильны. Качество продукции на высоком уровне, рекламаций от покупателей минимум. Компания предоставляет материалы для обучения продавцов, каталоги, образцы, помогает в продвижении.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">ИП Мачульский А.В.</h3>
            <div class="testimonial-author">
              <p class="author-name">Найденова А.Н.</p>
              <p class="author-position">Консультант</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Радует качество продукции – нареканий нет. Быстрая доставка, широкий ассортимент.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">Стильный дом</h3>
            <div class="testimonial-author">
              <p class="author-name">Иванова Кристина Александровна</p>
              <p class="author-position">Менеджер по продажам</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Особенно довольны сроками доставки.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Санаторий</span>
            <h3 class="testimonial-company">ГУП РК «СОК «Руссия»</h3>
            <div class="testimonial-author">
              <p class="author-name">Инна</p>
              <p class="author-position">Специалист по закупкам</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Остались довольны качеством, сроками, ценовой политикой.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">Мебель «Эра»</h3>
            <div class="testimonial-author">
              <p class="author-name">Данцева</p>
              <p class="author-position">Администратор</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Хочу отметить отличное качество продукции и профессиональный подход к работе. Заказы приходят быстро и всё без проблем. Матрасы оказались именно такими, как и ожидали: удобными, высококачественными и хорошо поддерживающими. Особо радует внимательное отношение, быстрые ответы на все вопросы и индивидуальный подход.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">ИП Адров С.А.</h3>
            <div class="testimonial-author">
              <p class="author-name">Сергей</p>
              <p class="author-position">Руководитель</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">От принятия заказа до поставки матрасов всё проходит быстро. По любому вопросу можно позвонить и получить консультацию. За время работы с браком не сталкивались. Качество продукции высокое.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">ИП Семенов Ф.В.</h3>
            <div class="testimonial-author">
              <p class="author-name">Борзенко Наталья Юрьевна</p>
              <p class="author-position">Бухгалтер</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Высоко оцениваем скорость доставки, работу с рекламациями, качество продукции.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Санаторий</span>
            <h3 class="testimonial-company">ГУП РК «СОК «Руссия»</h3>
            <div class="testimonial-author">
              <p class="author-name">Инна</p>
              <p class="author-position">Специалист по закупкам</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Остались довольны качеством, сроками, ценовой политикой.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">ИП Мишустин</h3>
            <div class="testimonial-author">
              <p class="author-name">Юлия</p>
              <p class="author-position">Администратор</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Приятно удивило, что наш салон посещали представители фабрики и проводили подробное обучение, рассказывали о характеристиках товара и отвечали на интересующие нас вопросы.</p>
          </div>
          <div class="testimonial-card">
            <span class="testimonial-tag">Дилер</span>
            <h3 class="testimonial-company">ООО Парк М</h3>
            <div class="testimonial-author">
              <p class="author-name">Елена</p>
              <p class="author-position">Продавец-консультант</p>
            </div>
            <div class="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p class="testimonial-text">Цена, сроки, качество, логистика – всё на высоте. Ни одной рекламации не было за всё время работы. Молодцы, так держать!</p>
          </div>
        </div>
      </section>

      <!-- Certification -->
      <section class="certification">
        <div class="certification-header">
          <h2 class="section-title">Сертификация и документация</h2>
          <a href="/documents" class="certification-link">
            Документы и сертификаты
            <img src="./public/arrow-medium.svg" alt="" class="arrow-medium" />
          </a>
        </div>
        <div class="certification-grid">
          <div class="certification-card">
            <div class="certification-image">
              <img src="./public/production.svg" alt="Производство" />
            </div>
            <div class="certification-content">
              <h3 class="certification-title">Производство</h3>
              <p class="certification-text">Проверенная временем система распределенного производства полного цикла с контролем качества на каждом этапе. Сертифицированные материалы от европейских поставщиков.</p>
            </div>
          </div>
          <div class="certification-card">
            <div class="certification-image">
              <img src="./public/cooperation.svg" alt="Особенности сотрудничества" />
            </div>
            <div class="certification-content">
              <h3 class="certification-title">Особенности сотрудничества</h3>
              <p class="certification-text">Гарантированные сроки поставки 7-14 дней. Логистика по всей России. Расширенная гарантия на пружинные блоки до 5 лет. Техническая поддержка для B2B клиентов.</p>
            </div>
          </div>
          <div class="certification-card">
            <div class="certification-image">
              <img src="./public/certification.svg" alt="Сертификация" />
            </div>
            <div class="certification-content">
              <h3 class="certification-title">Сертификация</h3>
              <p class="certification-text">Мы предоставляем полный пакет документов и сертификатов соответствия на всю продукцию.<br><br>Прозрачность требований, подтверждённые характеристики и единые стандарты качества для уверенной работы.</p>
            </div>
          </div>
        </div>
      </section>`,
  hotels: `<!-- Hero Section -->
      <section class="page-hero">
        <div class="page-hero-content">
          <div class="page-hero-text">
            <div class="page-hero-text-top">
              <h1 class="page-hero-title">Сон, о котором хочется написать в отзыве</h1>
              <p class="page-hero-description">Инвестиция в первое впечатление от утра ваших гостей.<br>Продуманные системы для сна, которые дают ощущение пятизвёздочного сна в отеле любой категории.</p>
              <a href="#" class="btn-primary-large" data-open-commercial-offer>Рассчитать КП</a>
            </div>
            <a href="/catalog" class="catalog-link catalog-link-desktop">
              <span>Смотреть<br>каталог</span>
              <img src="./public/arrow-hero-catalog.svg" alt="" class="catalog-arrow" />
            </a>
          </div>
          <div class="page-hero-image">
            <picture>
              <source type="image/avif" srcset="./public/hotels-hero@2x.avif 2x, ./public/hotels-hero.avif 1x" />
              <source type="image/webp" srcset="./public/hotels-hero@2x.webp 2x, ./public/hotels-hero.webp 1x" />
              <source type="image/png" srcset="./public/hotels-hero@2x.png 2x, ./public/hotels-hero.png 1x" />
              <img src="./public/hotels-hero.png" alt="Интерьер спальни" />
            </picture>
          </div>
          <a href="/catalog" class="catalog-link catalog-link-mobile">
            <span>Смотреть<br>каталог</span>
            <img src="./public/arrow-hero-catalog.svg" alt="" class="catalog-arrow" />
          </a>
        </div>
        <div class="section-divider"></div>
        <!-- Stats -->
        <div class="stats-wrapper">
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">Матрасов</span>
              <span class="stat-value">30 000+</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">На рынке</span>
              <span class="stat-value">3 года</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Гарантия</span>
              <span class="stat-value">18 мес</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Расширенная гарантия</span>
              <span class="stat-value">3 года<span class="stat-note">*</span></span>
            </div>
          </div>
          <p class="stats-note">* При заключении договора на плановую замену матрасов</p>
        </div>
      </section>

      <!-- Hotel Categories Section -->
      <section class="hotel-categories-section">
        <div class="hotel-categories-header">
          <h2 class="section-title">Решения по категории отеля</h2>
        </div>
        <div class="hotel-categories-content">
          <div class="categories-list">
            <div class="category-item" data-text="Бескомпромиссный комфорт для самых взыскательных гостей. Высокие матрасы с натуральными наполнителями премиум-класса. Индивидуальный подход к каждому номеру.">
              <div class="category-item-row">
                <span class="category-name">Люкс</span>
                <img src="./public/arrow-category.svg" alt="" class="category-arrow" />
              </div>
              <div class="category-divider"></div>
            </div>
            <div class="category-item" data-text="Баланс комфорта и практичности для требовательных гостей. Качественные материалы и продуманная эргономика. Оптимальное соотношение цены и качества.">
              <div class="category-item-row">
                <span class="category-name">Полулюкс</span>
                <img src="./public/arrow-category.svg" alt="" class="category-arrow" />
              </div>
              <div class="category-divider"></div>
            </div>
            <div class="category-item category-active" data-text="Мы подобрали оптимальные модели для каждого сегмента. Надежные матрасы с отличной поддержкой. Долговечность и простота в обслуживании.">
              <div class="category-item-row">
                <span class="category-name">Стандарт</span>
                <img src="./public/arrow-category.svg" alt="" class="category-arrow" />
              </div>
              <div class="category-divider"></div>
            </div>
            <div class="category-item" data-text="Компактные решения для небольших номеров. Функциональность без компромиссов по качеству сна. Экономичные варианты для оптимизации бюджета.">
              <div class="category-item-row">
                <span class="category-name">Мини-отели</span>
                <img src="./public/arrow-category.svg" alt="" class="category-arrow" />
              </div>
              <div class="category-divider"></div>
            </div>
          </div>
          <div class="categories-description">
            <p class="categories-text">Мы подобрали оптимальные модели для каждого сегмента. Надежные матрасы с отличной поддержкой. Долговечность и простота в обслуживании.</p>
            <div class="categories-cta">
              <p class="categories-question">Хотите узнать больше о характеристиках и стоимости этих моделей?</p>
              <a href="#contact-form" class="btn-primary-large">Подобрать наилучшее предложение</a>
            </div>
          </div>
        </div>
      </section>

      <!-- Product Cards Section -->
      <section class="product-cards-section">
        <div class="product-card" data-catalog="boxspring">
          <div class="product-card-content">
            <div class="product-card-text">
              <h3 class="product-card-title">BoxSpring</h3>
              <p class="product-card-description">Основания для кроватей и изголовья. Надежная база и стильный дизайн для любого интерьера.</p>
            </div>
            <a href="#" class="product-card-link" data-open-catalog>
              <span>Подробнее</span>
              <img src="./public/arrow-small.svg" alt="" />
            </a>
          </div>
          <div class="product-card-image">
            <picture>
              <source type="image/avif" srcset="./public/boxspring@2x.avif 2x, ./public/boxspring.avif 1x" />
              <source type="image/webp" srcset="./public/boxspring@2x.webp 2x, ./public/boxspring.webp 1x" />
              <source type="image/jpeg" srcset="./public/boxspring@2x.jpg 2x, ./public/boxspring.jpg 1x" />
              <img src="./public/boxspring.jpg" alt="BoxSpring" />
            </picture>
          </div>
        </div>
        <div class="section-divider"></div>
        <div class="product-card" data-catalog="accessories">
          <div class="product-card-content">
            <div class="product-card-text">
              <h3 class="product-card-title">Аксессуары</h3>
              <p class="product-card-description">Корректирующие топперы, наматрасники и другие финальные штрихи для идеального спального места.</p>
            </div>
            <a href="#" class="product-card-link" data-open-catalog>
              <span>Подробнее</span>
              <img src="./public/arrow-small.svg" alt="" />
            </a>
          </div>
          <div class="product-card-image">
            <picture>
              <source type="image/avif" srcset="./public/accessories@2x.avif 2x, ./public/accessories.avif 1x" />
              <source type="image/webp" srcset="./public/accessories@2x.webp 2x, ./public/accessories.webp 1x" />
              <source type="image/png" srcset="./public/accessories@2x.png 2x, ./public/accessories.png 1x" />
              <img src="./public/accessories.png" alt="Аксессуары" />
            </picture>
          </div>
        </div>
      </section>

      <!-- Discount Section -->
      <section class="discount-section">
        <div class="discount-header">
          <h2 class="section-title">Система скидок от объема</h2>
          <p class="discount-subtitle">Наша миссия помогать людям восстанавливаться естественным образом через продуманные решения для сна. Мы разделяем ценности индустрии гостеприимства и открыты к гибкому, долгосрочному партнёрству.</p>
        </div>
        <div class="discount-wrapper">
          <div class="discount-table">
            <div class="discount-table-header">
              <span class="discount-col">Сумма заказа</span>
              <span class="discount-col">Скидка</span>
              <span class="discount-col">Условия</span>
            </div>
            <div class="discount-table-body">
              <div class="discount-row highlight">
                <span class="discount-col">от 250 000 ₽</span>
                <span class="discount-col"><span class="discount-badge">7%</span></span>
                <span class="discount-col">Базовые условия</span>
              </div>
              <div class="discount-row">
                <span class="discount-col">от 450 000 ₽</span>
                <span class="discount-col"><span class="discount-badge">12%</span></span>
                <span class="discount-col">Расширенные условия</span>
              </div>
              <div class="discount-row highlight">
                <span class="discount-col">от 1 млн ₽</span>
                <span class="discount-col"><span class="discount-badge">Индивидуально</span></span>
                <span class="discount-col">Персональное предложение</span>
              </div>
            </div>
          </div>
          <p class="discount-note">* Точную стоимость и размер скидки рассчитает менеджер</p>
        </div>
      </section>

      <!-- Contact Form Section -->
      <section class="contact-section" id="contact-form">
        <h2 class="section-title">Доброе утро!</h2>
        <div class="contact-grid">
          <div class="contact-form-wrapper">
            <h3 class="contact-form-title">Форма обратной связи</h3>
            <form class="contact-form">
              <div style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">
                <label for="website">Website</label>
                <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
              </div>
              <div class="form-group">
                <label for="name">Имя</label>
                <input type="text" id="name" placeholder="Иван Иванов" />
              </div>
              <div class="form-group">
                <label for="city">Город</label>
                <input type="text" id="city" placeholder="Москва" />
              </div>
              <div class="form-group">
                <label for="email">E-mail</label>
                <input type="email" id="email" placeholder="example@company.com" required />
              </div>
              <div class="form-group">
                <label for="phone">Телефон</label>
                <input type="tel" id="phone" placeholder="+7 (999) 123-45-67" />
              </div>
              <div class="form-group">
                <label for="message">Сообщение</label>
                <textarea id="message" placeholder="Ваше сообщение"></textarea>
              </div>
              <div class="form-checkbox">
                <input type="checkbox" id="privacy" checked />
                <label for="privacy">
                  <span class="checkbox-custom">
                    <svg class="checkbox-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white"/>
                      <path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" stroke-opacity="0.1"/>
                      <path class="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" stroke-width="2"/>
                    </svg>
                  </span>
                  <span class="checkbox-text">Я согласен на обработку моих персональных данных в соответствии с <a href="/privacy">Политикой конфиденциальности</a></span>
                </label>
              </div>
              <button type="submit" class="btn-primary">Отправить</button>
            </form>
          </div>
          <div class="contact-info">
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-phone-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Телефон</h4>
                <p class="contact-info-value"><a href="tel:+79782484380">+ 7 (978) 248-43-80</a></p>
                <p class="contact-info-note">Пн-Пт: 9:00 - 18:00 МСК</p>
              </div>
            </div>
            <div class="contact-info-divider"></div>
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-email-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Email</h4>
                <p class="contact-info-value"><a href="mailto:hotels@grassigrosso.com">hotels@grassigrosso.com</a></p>
                <p class="contact-info-note">Ответим в течение 24 часов в рамках рабочего времени</p>
              </div>
            </div>
            <div class="contact-info-divider"></div>
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-location-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Адрес</h4>
                <p class="contact-info-value">Симферополь, ул. Кубанская д. 25</p>
                <p class="contact-info-note">Главный офис</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Refresh Program Section -->
      <section class="refresh-section">
        <div class="refresh-content">
          <div class="refresh-badge">Refresh-программа</div>
          <h2 class="section-title">Плановая замена матрасов</h2>
          <p class="refresh-description">Программа регулярного обновления матрасного фонда отеля. Сфокусируйтесь на главном, а мы позаботимся о комфортном восстановлении ваших гостей.</p>
          <div class="refresh-features">
            <div class="refresh-feature">
              <div class="refresh-feature-icon">
                <img src="./public/icon-calendar.svg" alt="" />
              </div>
              <div class="refresh-feature-content">
                <h4 class="refresh-feature-title">Плановая замена</h4>
                <p class="refresh-feature-text">График замены матрасов согласно регламенту отеля</p>
              </div>
            </div>
            <div class="refresh-feature-divider"></div>
            <div class="refresh-feature">
              <div class="refresh-feature-icon">
                <img src="./public/icon-hand-gesture.svg" alt="" />
              </div>
              <div class="refresh-feature-content">
                <h4 class="refresh-feature-title">Специальные условия</h4>
                <p class="refresh-feature-text">Фиксированные условия сотрудничества и приоритетное производство для участников программы</p>
              </div>
            </div>
          </div>
          <a href="#" class="btn-primary-large" data-open-commercial-offer="seasonal">Подключить Refresh-программу</a>
        </div>
        <div class="refresh-image">
          <picture>
            <source type="image/avif" srcset="./public/refresh@2x.avif 2x, ./public/refresh.avif 1x" />
            <source type="image/webp" srcset="./public/refresh@2x.webp 2x, ./public/refresh.webp 1x" />
            <source type="image/png" srcset="./public/refresh@2x.png 2x, ./public/refresh.png 1x" />
            <img src="./public/refresh.png" alt="Refresh программа" />
          </picture>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="faq-section">
        <h2 class="section-title">Часто задаваемые вопросы</h2>
        <div class="faq-list">
          <div class="faq-item active">
            <div class="faq-question">
              <h3>Как быстро производите?</h3>
              <span class="faq-toggle"></span>
            </div>
            <div class="faq-answer">
              <p>Срок производства составляет от 3 дней в зависимости от объёма заказа и выбранных моделей.</p>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <h3>Доставляете ли в регионы?</h3>
              <span class="faq-toggle"></span>
            </div>
            <div class="faq-answer">
              <p>Да, мы осуществляем доставку по всей России. Стоимость и сроки доставки рассчитываются индивидуально в зависимости от региона и объема заказа.</p>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <h3>Какие есть способы оплаты?</h3>
              <span class="faq-toggle"></span>
            </div>
            <div class="faq-answer">
              <p>Мы принимаем все способы оплаты, а также работаем по системе отсрочки платежа для постоянных клиентов.<br>Все условия оплаты обсуждаются индивидуально.</p>
            </div>
          </div>
        </div>
      </section>`,
  dealers: `<!-- Hero Section -->
      <section class="page-hero">
        <div class="page-hero-content">
          <div class="page-hero-text">
            <div class="page-hero-text-top">
              <h1 class="page-hero-title">Дилерская программа Grassigrosso</h1>
              <p class="page-hero-description">Станьте официальным дилером премиальных матрасов.<br>Развивайте свой бизнес с надежным производителем.</p>
              <a href="#contact-form" class="btn-primary-large">Стать дилером</a>
            </div>
          </div>
          <div class="page-hero-image">
            <picture>
              <source type="image/avif" srcset="./public/dealers-hero@2x.avif 2x, ./public/dealers-hero.avif 1x" />
              <source type="image/webp" srcset="./public/dealers-hero@2x.webp 2x, ./public/dealers-hero.webp 1x" />
              <source type="image/png" srcset="./public/dealers-hero@2x.png 2x, ./public/dealers-hero.png 1x" />
              <img src="./public/dealers-hero.png" alt="Интерьер спальни" />
            </picture>
          </div>
        </div>
        <div class="section-divider"></div>
        <!-- Stats -->
        <div class="stats-wrapper">
          <div class="stats-grid">
            <div class="stat-item">
            <span class="stat-label">Партнеров</span>
            <span class="stat-value">250+</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Городов</span>
            <span class="stat-value">50+</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Точек продаж</span>
            <span class="stat-value">350+</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Матрасов продано</span>
            <span class="stat-value">35 000</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Дней гарантии</span>
            <span class="stat-value">6 500</span>
          </div>
          </div>
        </div>
      </section>

      <!-- Conditions Section -->
      <section class="conditions-section">
        <div class="conditions-left">
          <h2 class="section-title">Условия участия</h2>
          <p class="conditions-subtitle">Простые шаги для начала сотрудничества</p>
        </div>
        <div class="conditions-right">
          <div class="condition-item">
            <h3 class="condition-title">Наличие торговой точки или шоурума</h3>
            <div class="condition-divider"></div>
          </div>
          <div class="condition-item">
            <h3 class="condition-title">Опыт работы в мебельной отрасли приветствуется</h3>
            <div class="condition-divider"></div>
          </div>
          <div class="condition-item">
            <h3 class="condition-title">Фокус на категорию продукта</h3>
          </div>
        </div>
        <div class="conditions-icon">
          <img src="./public/icon-hand-pointer.svg" alt="Иконка руки с указателем для условий участия" />
        </div>
      </section>

      <!-- Offers Section -->
      <section class="offers-section">
        <div class="offers-header">
          <h2 class="section-title">Что мы предлагаем</h2>
          <p class="offers-subtitle">Комплексная поддержка для успешного развития вашего бизнеса</p>
        </div>
        <div class="section-divider"></div>
        <div class="offers-grid">
          <div class="offer-card">
            <div class="offer-icon">
              <img src="./public/icon-megaphone.svg" alt="Иконка мегафона для маркетинговой поддержки" />
            </div>
            <div class="offer-content">
              <h3 class="offer-title">Маркетинговая поддержка</h3>
              <ul class="offer-list">
                <li>Рекламные материалы</li>
                <li>Каталоги и образцы</li>
                <li>Обучение продажам</li>
                <li>Совместные акции</li>
              </ul>
            </div>
          </div>
          <div class="offer-card">
            <div class="offer-icon">
              <img src="./public/icon-truck.svg" alt="Иконка грузовика для логистики и сервиса" />
            </div>
            <div class="offer-content">
              <h3 class="offer-title">Логистика и сервис</h3>
              <ul class="offer-list">
                <li>Доставка по России</li>
                <li>Складская программа</li>
                <li>Гарантийное обслуживание</li>
                <li>Техническая поддержка</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Geography Section -->
      <section class="geography-section">
        <div class="geography-header">
          <h2 class="section-title">География дилеров</h2>
          <p class="geography-subtitle">Наши дилеры работают в крупнейших городах России</p>
        </div>
        <div class="geography-map" id="geographyMapContainer">
          <img src="./public/Map.svg" alt="География дилеров" id="geographyMapImg" />
        </div>
        <div class="geography-cities-wrapper">
          <div class="geography-cities">
            <span class="city-item">Г. Краснодар <span class="city-tag">скоро</span></span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Тула</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Саратов</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Воронеж</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Волгоград</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Орел</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Курск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Кашира</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Пенза</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Липецк</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Самара</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Новомосковск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Белгород</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Тамбов</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Павловск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Таганрог</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Ростов на Дону</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Алексеевка</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Острогорск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Старый оскол</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Новый оскол</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Валуйки</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Моршанск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мичуринск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мценск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Серпухов</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Миллерово</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Богучар</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Калач</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Симферополь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Севастополь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Ялта</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Керчь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Евпатория</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Саки</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Джанкой</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Феодосия</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Луганск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Донецк</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Лисичанск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мариуполь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Макеевка</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мелитополь</span>
            <!-- Дублируем для бесшовного зацикливания -->
            <span class="city-separator"></span>
            <span class="city-item">Г. Краснодар <span class="city-tag">скоро</span></span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Тула</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Саратов</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Воронеж</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Волгоград</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Орел</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Курск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Кашира</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Пенза</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Липецк</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Самара</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Новомосковск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Белгород</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Тамбов</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Павловск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Таганрог</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Ростов на Дону</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Алексеевка</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Острогорск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Старый оскол</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Новый оскол</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Валуйки</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Моршанск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мичуринск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мценск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Серпухов</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Миллерово</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Богучар</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Калач</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Симферополь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Севастополь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Ялта</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Керчь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Евпатория</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Саки</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Джанкой</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Феодосия</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Луганск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Донецк</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Лисичанск</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мариуполь</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Макеевка</span>
            <span class="city-separator"></span>
            <span class="city-item">Г. Мелитополь</span>
          </div>
        </div>
      </section>

      <!-- Quality Section -->
      <section class="quality-section">
        <div class="quality-content-wrapper">
          <div class="quality-content">
            <h2 class="section-title">Качество под контролем</h2>
            <div class="quality-text">
              <p>Собственная система распределенного производства и локализованная сборочная линия позволяет нам гарантировать максимальное качество компонентов продукции и контролировать производство на каждом этапе.</p>
              <p>Срок производства от 3 дней. Стандартные сроки поставки от 5 дней.</p>
              <p>Современное оборудование, сертифицированные материалы и строгий контроль качества – основа нашего успеха и гарантия вашей прибыли.</p>
            </div>
          </div>
          <div class="quality-image" id="qualityVideo">
            <video
              class="quality-video"
              poster="./public/quality-video-poster.avif"
              autoplay
              loop
              muted
              playsinline
            >
              <source src="./public/quality-video.webm" type="video/webm" />
              <source src="./public/quality-video.mp4" type="video/mp4" />
            </video>
            <picture class="quality-poster">
              <source type="image/avif" srcset="./public/quality-video-poster.avif" />
              <source type="image/webp" srcset="./public/quality-video-poster.webp" />
              <img
                src="./public/quality-video-poster.jpg"
                alt="Производство"
              />
            </picture>
            <button class="hero-play-btn" aria-label="Воспроизвести видео">
              <svg width="80" height="80" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32" cy="32" r="32" fill="white" fill-opacity="0.9"/>
                <path d="M26 20L46 32L26 44V20Z" fill="#243731"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- Requirements Section -->
      <section class="requirements-section">
        <div class="requirements-header">
          <h2 class="section-title">Требования к дилерам</h2>
          <p class="requirements-subtitle">Для успешного сотрудничества важны следующие критерии</p>
        </div>
        <div class="section-divider"></div>
        <div class="requirements-grid">
          <div class="requirement-card">
            <div class="requirement-icon">
              <img src="./public/icon-badge.svg" alt="Иконка бейджа для обязательных требований" />
            </div>
            <div class="requirement-content">
              <h3 class="requirement-title">Обязательные требования</h3>
              <ul class="requirement-list">
                <li>Юридическое лицо или ИП</li>
                <li>Торговая площадь от 50 м² или онлайн магазин</li>
                <li>Опыт продаж мебели/матрасов</li>
                <li>Собственный шоурум или магазин</li>
              </ul>
            </div>
          </div>
          <div class="requirement-card">
            <div class="requirement-icon">
              <img src="./public/icon-thumbs-up.svg" alt="Иконка большого пальца вверх для желательных требований" />
            </div>
            <div class="requirement-content">
              <h3 class="requirement-title">Желательные требования</h3>
              <ul class="requirement-list">
                <li>Наличие склада</li>
                <li>Собственная служба доставки</li>
                <li>Опыт работы с премиум-сегментом</li>
                <li>База постоянных клиентов</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Packages Section -->
      <section class="packages-section">
        <div class="packages-header">
          <h2 class="section-title">Дилерские пакеты</h2>
          <p class="packages-subtitle">Выберите подходящий уровень сотрудничества</p>
        </div>
        <div class="packages-grid">
          <div class="package-card">
            <div class="package-header">
              <h3 class="package-title">СТАНДАРТ</h3>
              <div class="package-price">
                <span class="price-value">От 100 000 р</span>
              </div>
            </div>
            <ul class="package-features">
              <li class="feature-included"><span class="feature-check">✓</span> Каталоги и образцы</li>
              <li class="feature-included"><span class="feature-check">✓</span> Обучение</li>
              <li class="feature-included"><span class="feature-check">✓</span> Онлайн и телефон поддержка</li>
            </ul>
            <a href="#contact-form" class="btn-primary" data-package="standard">Выбрать пакет</a>
          </div>
          <div class="package-card package-featured">
            <div class="package-header">
              <h3 class="package-title">ИНДИВИДУАЛЬНЫЙ</h3>
              <div class="package-price">
                <span class="price-value">От 300 000 р</span>
              </div>
            </div>
            <ul class="package-features">
              <li class="feature-included"><span class="feature-check">✓</span> Каталоги и образцы</li>
              <li class="feature-included"><span class="feature-check">✓</span> Расширенное обучение</li>
              <li class="feature-included"><span class="feature-check">✓</span> Онлайн и телефон поддержка</li>
              <li class="feature-included"><span class="feature-check">✓</span> Персональный менеджер</li>
              <li class="feature-included"><span class="feature-check">✓</span> Сертификат Grassigrosso</li>
              <li class="feature-included"><span class="feature-check">✓</span> Гибкая система скидок</li>
            </ul>
            <a href="#contact-form" class="btn-secondary" data-package="individual">Выбрать пакет</a>
          </div>
          <div class="package-card">
            <div class="package-header">
              <h3 class="package-title">ЭКСКЛЮЗИВНЫЙ</h3>
              <div class="package-price">
                <span class="price-value">От 800 000 р</span>
              </div>
            </div>
            <ul class="package-features">
              <li class="feature-included"><span class="feature-check">✓</span> Полный комплект материалов</li>
              <li class="feature-included"><span class="feature-check">✓</span> Эксклюзивная программа</li>
              <li class="feature-included"><span class="feature-check">✓</span> Расширенный ассортимент</li>
              <li class="feature-included"><span class="feature-check">✓</span> Приоритетная поддержка</li>
              <li class="feature-included"><span class="feature-check">✓</span> Персональный менеджер</li>
              <li class="feature-included"><span class="feature-check">✓</span> Максимальная скидка</li>
              <li class="feature-included"><span class="feature-check">✓</span> Брендирование торговых площадей</li>
              <li class="feature-included"><span class="feature-check">✓</span> Сертификат Grassigrosso</li>
              <li class="feature-included"><span class="feature-check">✓</span> Эксклюзивная представленность в городе (ТЦ)</li>
            </ul>
            <a href="#contact-form" class="btn-primary" data-package="exclusive">Выбрать пакет</a>
          </div>
        </div>
      </section>

      <!-- Packages Section - Duplicate (Commented) -->
      <!--
      <section class="packages-section">
        <div class="packages-header">
          <h2 class="section-title">Дилерские пакеты</h2>
          <p class="packages-subtitle">Выберите подходящий уровень сотрудничества</p>
        </div>
        <div class="packages-grid">
          <div class="package-card">
            <div class="package-header">
              <h3 class="package-title">Базовый</h3>
              <div class="package-price">
                <span class="price-value">от 100 000 ₽</span>
              </div>
            </div>
            <ul class="package-features">
              <li class="feature-included"><span class="feature-check">✓</span> Каталоги и образцы</li>
              <li class="feature-included"><span class="feature-check">✓</span> Базовое обучение</li>
              <li class="feature-included"><span class="feature-check">✓</span> Онлайн-поддержка</li>
              <li class="feature-excluded"><span class="feature-cross">✗</span> Отсрочка платежа</li>
              <li class="feature-excluded"><span class="feature-cross">✗</span> Персональный менеджер</li>
            </ul>
            <a href="#contact-form" class="btn-primary">Выбрать пакет</a>
          </div>
          <div class="package-card package-featured">
            <div class="package-header">
              <h3 class="package-title">Стандарт</h3>
              <div class="package-price">
                <span class="price-value">от 300 000 ₽</span>
                <span class="price-discount">скидка от 5%</span>
              </div>
            </div>
            <ul class="package-features">
              <li class="feature-included"><span class="feature-check">✓</span> Каталоги и образцы</li>
              <li class="feature-included"><span class="feature-check">✓</span> Расширенное обучение</li>
              <li class="feature-included"><span class="feature-check">✓</span> Онлайн и телефон поддержка</li>
              <li class="feature-included"><span class="feature-check">✓</span> Отсрочка 7 дней</li>
              <li class="feature-excluded"><span class="feature-cross">✗</span> Персональный менеджер</li>
            </ul>
            <a href="#contact-form" class="btn-secondary">Выбрать пакет</a>
          </div>
          <div class="package-card">
            <div class="package-header">
              <h3 class="package-title">Индивидуальный</h3>
              <div class="package-price">
                <span class="price-value">от 1,5 млн ₽</span>
                <span class="price-discount">Скидка Персонально</span>
              </div>
            </div>
            <ul class="package-features">
              <li class="feature-included"><span class="feature-check">✓</span> Полный комплект материалов</li>
              <li class="feature-included"><span class="feature-check">✓</span> Индивидуальная программа</li>
              <li class="feature-included"><span class="feature-check">✓</span> Приоритетная поддержка</li>
              <li class="feature-included"><span class="feature-check">✓</span> Отсрочка 14 дней</li>
              <li class="feature-included"><span class="feature-check">✓</span> Персональный менеджер</li>
            </ul>
            <a href="#contact-form" class="btn-primary">Выбрать пакет</a>
          </div>
          <div class="package-card">
            <div class="package-header">
              <h3 class="package-title">Амбасадор</h3>
              <div class="package-price">
                <span class="price-value">от 3 млн ₽</span>
                <span class="price-discount">Скидка Персонально</span>
              </div>
            </div>
            <ul class="package-features">
              <li class="feature-included"><span class="feature-check">✓</span> Регламенты по категории</li>
              <li class="feature-included"><span class="feature-check">✓</span> Скрипты консультации</li>
              <li class="feature-included"><span class="feature-check">✓</span> Материалы для обучения</li>
              <li class="feature-included"><span class="feature-check">✓</span> Сопровождение запуска</li>
              <li class="feature-included"><span class="feature-check">✓</span> Подбор ассортимента</li>
            </ul>
            <a href="#contact-form" class="btn-primary">Выбрать пакет</a>
          </div>
        </div>
      </section>
      -->

      <!-- Contact Form Section -->
      <section class="contact-section" id="contact-form">
        <h2 class="section-title">Доброе утро!</h2>
        <div class="contact-grid">
          <div class="contact-form-wrapper">
            <h3 class="contact-form-title">Стать дилером</h3>
            <form class="contact-form">
              <div style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">
                <label for="website">Website</label>
                <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
              </div>
              <div class="form-group form-group-package">
                <label for="dealer-package">Пакет</label>
                <select id="dealer-package" name="package" class="form-select" aria-label="Выберите пакет">
                  <option value="">Выберите пакет</option>
                  <option value="standard">СТАНДАРТ – От 100 000 р</option>
                  <option value="individual">ИНДИВИДУАЛЬНЫЙ – От 300 000 р</option>
                  <option value="exclusive">ЭКСКЛЮЗИВНЫЙ – От 800 000 р</option>
                </select>
              </div>
              <div class="form-group">
                <label for="name">Имя</label>
                <input type="text" id="name" placeholder="Иван Иванов" />
              </div>
              <div class="form-group">
                <label for="city">Город</label>
                <input type="text" id="city" placeholder="Москва" />
              </div>
              <div class="form-group">
                <label for="email">E-mail</label>
                <input type="email" id="email" placeholder="example@company.com" required />
              </div>
              <div class="form-group">
                <label for="phone">Телефон</label>
                <input type="tel" id="phone" placeholder="+7 (999) 123-45-67" />
              </div>
              <div class="form-group">
                <label for="message">Сообщение</label>
                <textarea id="message" placeholder="Ваше сообщение"></textarea>
              </div>
              <div class="form-checkbox">
                <input type="checkbox" id="privacy" checked />
                <label for="privacy">
                  <span class="checkbox-custom">
                    <svg class="checkbox-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white"/>
                      <path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" stroke-opacity="0.1"/>
                      <path class="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" stroke-width="2"/>
                    </svg>
                  </span>
                  <span class="checkbox-text">Я согласен на обработку моих персональных данных в соответствии с <a href="/privacy">Политикой конфиденциальности</a></span>
                </label>
              </div>
              <button type="submit" class="btn-primary">Отправить</button>
            </form>
          </div>
          <div class="contact-info">
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-phone-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Телефон</h4>
                <p class="contact-info-value"><a href="tel:+79782484380">+ 7 (978) 248-43-80</a></p>
                <p class="contact-info-note">Пн-Пт: 9:00 - 18:00 МСК</p>
              </div>
            </div>
            <div class="contact-info-divider"></div>
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-email-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Email</h4>
                <p class="contact-info-value"><a href="mailto:b2b@grassigrosso.com">b2b@grassigrosso.com</a></p>
                <p class="contact-info-note">Ответим в течение 24 часов в рамках рабочего времени</p>
              </div>
            </div>
            <div class="contact-info-divider"></div>
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-location-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Адрес</h4>
                <p class="contact-info-value">Симферополь, ул. Кубанская д. 25</p>
                <p class="contact-info-note">Главный офис</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FAQ Section -->
      <section class="faq-section">
        <h2 class="section-title">Часто задаваемые вопросы</h2>
        <div class="faq-list">
          <div class="faq-item active">
            <div class="faq-question">
              <h3>Как быстро производите?</h3>
              <span class="faq-toggle"></span>
            </div>
            <div class="faq-answer">
              <p>Срок производства составляет от 3 дней в зависимости от объёма заказа и выбранных моделей.</p>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <h3>Доставляете ли в регионы?</h3>
              <span class="faq-toggle"></span>
            </div>
            <div class="faq-answer">
              <p>Да, мы осуществляем доставку по всей России. Стоимость и сроки доставки рассчитываются индивидуально в зависимости от региона и объема заказа.</p>
            </div>
          </div>
          <div class="faq-item">
            <div class="faq-question">
              <h3>Какие есть способы оплаты?</h3>
              <span class="faq-toggle"></span>
            </div>
            <div class="faq-answer">
              <p>Мы принимаем все способы оплаты, а также работаем по системе отсрочки платежа для постоянных клиентов.<br>Все условия оплаты обсуждаются индивидуально.</p>
            </div>
          </div>
        </div>
      </section>`,
  contacts: `<!-- Hero Section -->
      <section class="contacts-hero">
        <div class="contacts-hero-content">
          <div class="contacts-hero-text">
            <h1 class="contacts-hero-title">Контакты</h1>
            <p class="contacts-hero-description">
              Свяжитесь с нами удобным способом. Мы всегда готовы ответить на ваши вопросы.
            </p>
          </div>
          <div class="contacts-hero-image">
            <picture>
              <source type="image/avif" srcset="./public/contacts-hero@2x.avif 2x, ./public/contacts-hero.avif 1x" />
              <source type="image/webp" srcset="./public/contacts-hero@2x.webp 2x, ./public/contacts-hero.webp 1x" />
              <source type="image/png" srcset="./public/contacts-hero@2x.png 2x, ./public/contacts-hero.png 1x" />
              <img src="./public/contacts-hero.png" alt="Интерьер спальни" />
            </picture>
          </div>
        </div>
      </section>

      <!-- Offices Section -->
      <section class="contacts-offices">
        <h2 class="section-title">Наши офисы</h2>
        <div class="contacts-offices-grid">
          <!-- Главный офис -->
          <div class="contacts-office-card">
            <div class="contacts-office-header">
              <span class="contacts-office-badge">Главный офис</span>
              <h3 class="contacts-office-city">Симферополь</h3>
            </div>
            <div class="contacts-office-info">
              <div class="contacts-office-item">
                <span class="contacts-office-label">Адрес:</span>
                <span class="contacts-office-value">ул. Кубанская д. 25</span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Телефон:</span>
                <span class="contacts-office-value"><a href="tel:+79782484380">+ 7 (978) 248-43-80</a></span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Email:</span>
                <span class="contacts-office-value">
                  <span class="contacts-office-email-row">
                    <a href="mailto:sales@grassigrosso.com">sales@grassigrosso.com</a>
                    <button type="button" class="contacts-office-copy-email" aria-label="Скопировать email" data-copy-email="sales@grassigrosso.com">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                        <path d="M15.8 4H12.2C9.8804 4 8 5.8804 8 8.2V11.8C8 14.1196 9.8804 16 12.2 16H15.8C18.1196 16 20 14.1196 20 11.8V8.2C20 5.8804 18.1196 4 15.8 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M14.5 16V16.4C14.5 18.6644 12.6644 20.5 10.4 20.5H8.1C5.83563 20.5 4 18.6644 4 16.4V13C4 10.7909 5.79086 9 8 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                    </button>
                  </span>
                </span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Время работы:</span>
                <span class="contacts-office-value">Пн-Пт: 9:00 - 18:00</span>
              </div>
            </div>
          </div>

          <!-- Воронеж -->
          <div class="contacts-office-card">
            <div class="contacts-office-header">
              <span class="contacts-office-badge">Представительство</span>
              <p class="contacts-office-region">Центральная Россия</p>
              <h3 class="contacts-office-city">Воронеж</h3>
            </div>
            <div class="contacts-office-info">
              <div class="contacts-office-item">
                <span class="contacts-office-label">Адрес:</span>
                <span class="contacts-office-value">ул. Остужева 43 И</span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Телефон:</span>
                <span class="contacts-office-value"><a href="tel:+79780757174">+7 (978) 075-71-74</a></span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Email:</span>
                <span class="contacts-office-value">
                  <span class="contacts-office-email-row">
                    <a href="mailto:voronezh@grassigrosso.com">voronezh@grassigrosso.com</a>
                    <button type="button" class="contacts-office-copy-email" aria-label="Скопировать email" data-copy-email="voronezh@grassigrosso.com">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                        <path d="M15.8 4H12.2C9.8804 4 8 5.8804 8 8.2V11.8C8 14.1196 9.8804 16 12.2 16H15.8C18.1196 16 20 14.1196 20 11.8V8.2C20 5.8804 18.1196 4 15.8 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M14.5 16V16.4C14.5 18.6644 12.6644 20.5 10.4 20.5H8.1C5.83563 20.5 4 18.6644 4 16.4V13C4 10.7909 5.79086 9 8 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                    </button>
                  </span>
                </span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Время работы:</span>
                <span class="contacts-office-value">Пн-Пт: 9:00 - 18:00</span>
              </div>
            </div>
          </div>

          <!-- Луганск -->
          <div class="contacts-office-card">
            <div class="contacts-office-header">
              <span class="contacts-office-badge">Представительство</span>
              <p class="contacts-office-region">Луганская Народная Республика</p>
              <h3 class="contacts-office-city">Луганск</h3>
            </div>
            <div class="contacts-office-info">
              <div class="contacts-office-item">
                <span class="contacts-office-label">Адрес:</span>
                <span class="contacts-office-value">ул. Фабричная д 1</span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Телефон:</span>
                <span class="contacts-office-value"><a href="tel:+79592011808">+7 (959) 201-18-08</a></span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Email:</span>
                <span class="contacts-office-value">
                  <span class="contacts-office-email-row">
                    <a href="mailto:LNR@grassigrosso.com">LNR@grassigrosso.com</a>
                    <button type="button" class="contacts-office-copy-email" aria-label="Скопировать email" data-copy-email="LNR@grassigrosso.com">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                        <path d="M15.8 4H12.2C9.8804 4 8 5.8804 8 8.2V11.8C8 14.1196 9.8804 16 12.2 16H15.8C18.1196 16 20 14.1196 20 11.8V8.2C20 5.8804 18.1196 4 15.8 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M14.5 16V16.4C14.5 18.6644 12.6644 20.5 10.4 20.5H8.1C5.83563 20.5 4 18.6644 4 16.4V13C4 10.7909 5.79086 9 8 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                    </button>
                  </span>
                </span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Время работы:</span>
                <span class="contacts-office-value">Пн-Пт: 9:00 - 18:00</span>
              </div>
            </div>
          </div>

          <!-- Харцизск -->
          <div class="contacts-office-card">
            <div class="contacts-office-header">
              <span class="contacts-office-badge">Представительство</span>
              <p class="contacts-office-region">Донецкая Народная Республика</p>
              <h3 class="contacts-office-city">Харцизск</h3>
            </div>
            <div class="contacts-office-info">
              <div class="contacts-office-item">
                <span class="contacts-office-label">Адрес:</span>
                <span class="contacts-office-value">ул. Вокзальная, д. 52</span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Телефон:</span>
                <span class="contacts-office-value"><a href="tel:+79494106760">+7 (949) 410-67-60</a></span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Email:</span>
                <span class="contacts-office-value">
                  <span class="contacts-office-email-row">
                    <a href="mailto:DNR@grassigrosso.com">DNR@grassigrosso.com</a>
                    <button type="button" class="contacts-office-copy-email" aria-label="Скопировать email" data-copy-email="DNR@grassigrosso.com">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                        <path d="M15.8 4H12.2C9.8804 4 8 5.8804 8 8.2V11.8C8 14.1196 9.8804 16 12.2 16H15.8C18.1196 16 20 14.1196 20 11.8V8.2C20 5.8804 18.1196 4 15.8 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                        <path d="M14.5 16V16.4C14.5 18.6644 12.6644 20.5 10.4 20.5H8.1C5.83563 20.5 4 18.6644 4 16.4V13C4 10.7909 5.79086 9 8 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                      </svg>
                    </button>
                  </span>
                </span>
              </div>
              <div class="contacts-office-item">
                <span class="contacts-office-label">Время работы:</span>
                <span class="contacts-office-value">Пн-Пт: 8:00 - 17:00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Map Section -->
      <section class="contacts-map">
        <div class="contacts-map-header">
          <h2 class="section-title">Как нас найти</h2>
          <div class="contacts-map-tabs">
            <button class="contacts-map-tab active" data-office="main">Главный офис</button>
            <button class="contacts-map-tab" data-office="voronezh">Центральная Россия</button>
            <button class="contacts-map-tab" data-office="lnr">ЛНР</button>
            <button class="contacts-map-tab" data-office="dnr">ДНР</button>
          </div>
        </div>
        <div class="contacts-map-container">
          <div class="contacts-map-placeholder contacts-map-frame" id="map-main" data-office="main"></div>
          <div class="contacts-map-placeholder contacts-map-frame" id="map-voronezh" data-office="voronezh" hidden></div>
          <div class="contacts-map-placeholder contacts-map-frame" id="map-lnr" data-office="lnr" hidden></div>
          <div class="contacts-map-placeholder contacts-map-frame" id="map-dnr" data-office="dnr" hidden></div>
        </div>
      </section>

      <!-- Contact Form Section -->
      <section class="contact-section" id="contact-form">
        <h2 class="section-title">Доброе утро!</h2>
        <div class="contact-grid">
          <div class="contact-form-wrapper">
            <h3 class="contact-form-title">Форма обратной связи</h3>
            <form class="contact-form">
              <div style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">
                <label for="website">Website</label>
                <input type="text" id="website" name="website" tabindex="-1" autocomplete="off" />
              </div>
              <div class="form-group">
                <label for="name">Имя</label>
                <input type="text" id="name" placeholder="Иван Иванов" />
              </div>
              <div class="form-group">
                <label for="city">Город</label>
                <input type="text" id="city" placeholder="Москва" />
              </div>
              <div class="form-group">
                <label for="email">E-mail</label>
                <input type="email" id="email" placeholder="example@company.com" required />
              </div>
              <div class="form-group">
                <label for="phone">Телефон</label>
                <input type="tel" id="phone" placeholder="+7 (999) 123-45-67" />
              </div>
              <div class="form-group">
                <label for="message">Сообщение</label>
                <textarea id="message" placeholder="Ваше сообщение"></textarea>
              </div>
              <div class="form-checkbox">
                <input type="checkbox" id="privacy" checked />
                <label for="privacy">
                  <span class="checkbox-custom">
                    <svg class="checkbox-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M0 4C0 1.79086 1.79086 0 4 0H20C22.2091 0 24 1.79086 24 4V20C24 22.2091 22.2091 24 20 24H4C1.79086 24 0 22.2091 0 20V4Z" fill="white"/>
                      <path d="M4 0.5H20C21.933 0.5 23.5 2.067 23.5 4V20C23.5 21.933 21.933 23.5 20 23.5H4C2.067 23.5 0.5 21.933 0.5 20V4C0.5 2.067 2.067 0.5 4 0.5Z" stroke="#283E37" stroke-opacity="0.1"/>
                      <path class="checkmark" d="M6 10.5L11 16L18 8" stroke="#283E37" stroke-width="2"/>
                    </svg>
                  </span>
                  <span class="checkbox-text">Я согласен на обработку моих персональных данных в соответствии с <a href="/privacy">Политикой конфиденциальности</a></span>
                </label>
              </div>
              <button type="submit" class="btn-primary">Отправить</button>
            </form>
          </div>
          <div class="contact-info">
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-phone-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Телефон</h4>
                <p class="contact-info-value"><a href="tel:+79782484380">+ 7 (978) 248-43-80</a></p>
                <p class="contact-info-note">Пн-Пт: 9:00 - 18:00 МСК</p>
              </div>
            </div>
            <div class="contact-info-divider"></div>
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-email-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Email</h4>
                <p class="contact-info-value"><a href="mailto:sales@grassigrosso.com">sales@grassigrosso.com</a></p>
                <p class="contact-info-note">Ответим в течение 24 часов в рамках рабочего времени</p>
              </div>
            </div>
            <div class="contact-info-divider"></div>
            <div class="contact-info-item">
              <div class="contact-info-icon">
                <img src="./public/icon-location-vectorly.svg" alt="" />
              </div>
              <div class="contact-info-content">
                <h4 class="contact-info-title">Адрес</h4>
                <p class="contact-info-value">Симферополь, ул. Кубанская д. 25</p>
                <p class="contact-info-note">Главный офис</p>
              </div>
            </div>
          </div>
        </div>
      </section>`,
  catalog: `<section class="catalog-hero">
        <div class="catalog-hero-content">
          <div class="catalog-hero-text">
            <h1 class="catalog-hero-title">Каталог <br> продукции</h1>
            <p class="catalog-hero-description">
              Подберите матрас под ваши задачи: формат использования, уровень жесткости и требуемую нагрузку.
            </p>
          </div>
          <div class="catalog-hero-image">
            <div class="catalog-hero-slider" data-autoplay-ms="6500" aria-roledescription="carousel" aria-label="Галерея интерьеров">
              <div class="catalog-hero-slides">
                <div class="catalog-hero-slide is-active" id="catalog-hero-slide-0" data-slide="0" aria-hidden="false">
                  <picture>
                    <source type="image/avif" srcset="./public/catalog-hero@2x.avif 2x, ./public/catalog-hero.avif 1x" />
                    <source type="image/webp" srcset="./public/catalog-hero@2x.webp 2x, ./public/catalog-hero.webp 1x" />
                    <source type="image/png" srcset="./public/catalog-hero@2x.png 2x, ./public/catalog-hero.png 1x" />
                    <img src="./public/catalog-hero.png" alt="Интерьер спальни" loading="eager" fetchpriority="high" decoding="async" />
                  </picture>
                </div>
                <div class="catalog-hero-slide" id="catalog-hero-slide-1" data-slide="1" aria-hidden="true">
                  <picture>
                    <source type="image/avif" srcset="./public/dealers-hero@2x.avif 2x, ./public/dealers-hero.avif 1x" />
                    <source type="image/webp" srcset="./public/dealers-hero@2x.webp 2x, ./public/dealers-hero.webp 1x" />
                    <source type="image/png" srcset="./public/dealers-hero@2x.png 2x, ./public/dealers-hero.png 1x" />
                    <img src="./public/dealers-hero.png" alt="Интерьер в тёплых тонах" loading="lazy" decoding="async" />
                  </picture>
                </div>
                <div class="catalog-hero-slide" id="catalog-hero-slide-2" data-slide="2" aria-hidden="true">
                  <picture>
                    <source type="image/avif" srcset="./public/hotels-hero@2x.avif 2x, ./public/hotels-hero.avif 1x" />
                    <source type="image/webp" srcset="./public/hotels-hero@2x.webp 2x, ./public/hotels-hero.webp 1x" />
                    <source type="image/png" srcset="./public/hotels-hero@2x.png 2x, ./public/hotels-hero.png 1x" />
                    <img src="./public/hotels-hero.png" alt="Номер отеля" loading="lazy" decoding="async" />
                  </picture>
                </div>
                <div class="catalog-hero-slide" id="catalog-hero-slide-3" data-slide="3" aria-hidden="true">
                  <picture>
                    <source type="image/avif" srcset="./public/contacts-hero@2x.avif 2x, ./public/contacts-hero.avif 1x" />
                    <source type="image/webp" srcset="./public/contacts-hero@2x.webp 2x, ./public/contacts-hero.webp 1x" />
                    <source type="image/png" srcset="./public/contacts-hero@2x.png 2x, ./public/contacts-hero.png 1x" />
                    <img src="./public/contacts-hero.png" alt="Светлая спальня" loading="lazy" decoding="async" />
                  </picture>
                </div>
                <div class="catalog-hero-slide" id="catalog-hero-slide-4" data-slide="4" aria-hidden="true">
                  <video
                    muted
                    loop
                    playsinline
                    preload="metadata"
                    poster="./public/quality-video-poster.jpg"
                    aria-label="Производство"
                  >
                    <source src="./public/quality-video.webm" type="video/webm" />
                    <source src="./public/quality-video.mp4" type="video/mp4" />
                  </video>
                </div>
              </div>
              <div class="catalog-hero-nav-side catalog-hero-nav-side--left">
                <button type="button" class="catalog-hero-nav-btn catalog-hero-nav-prev" aria-label="Предыдущий слайд">
                  <svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden="true">
                    <path d="M8.5 2.5L2.5 9l6 6.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
              <div class="catalog-hero-nav-side catalog-hero-nav-side--right">
                <button type="button" class="catalog-hero-nav-btn catalog-hero-nav-next" aria-label="Следующий слайд">
                  <svg width="11" height="18" viewBox="0 0 11 18" fill="none" aria-hidden="true">
                    <path d="M2.5 2.5l6 6.5-6 6.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </button>
              </div>
              <div class="catalog-hero-dots" role="tablist" aria-label="Слайды">
                <button type="button" class="catalog-hero-dot is-active" role="tab" aria-selected="true" aria-controls="catalog-hero-slide-0" id="catalog-hero-tab-0" data-target="0" aria-label="Слайд 1">
                  <span class="catalog-hero-dot-shape" aria-hidden="true"><span class="catalog-hero-dot-fill"></span></span>
                </button>
                <button type="button" class="catalog-hero-dot" role="tab" aria-selected="false" aria-controls="catalog-hero-slide-1" id="catalog-hero-tab-1" data-target="1" aria-label="Слайд 2">
                  <span class="catalog-hero-dot-shape" aria-hidden="true"><span class="catalog-hero-dot-fill"></span></span>
                </button>
                <button type="button" class="catalog-hero-dot" role="tab" aria-selected="false" aria-controls="catalog-hero-slide-2" id="catalog-hero-tab-2" data-target="2" aria-label="Слайд 3">
                  <span class="catalog-hero-dot-shape" aria-hidden="true"><span class="catalog-hero-dot-fill"></span></span>
                </button>
                <button type="button" class="catalog-hero-dot" role="tab" aria-selected="false" aria-controls="catalog-hero-slide-3" id="catalog-hero-tab-3" data-target="3" aria-label="Слайд 4">
                  <span class="catalog-hero-dot-shape" aria-hidden="true"><span class="catalog-hero-dot-fill"></span></span>
                </button>
                <button type="button" class="catalog-hero-dot" role="tab" aria-selected="false" aria-controls="catalog-hero-slide-4" id="catalog-hero-tab-4" data-target="4" aria-label="Слайд 5">
                  <span class="catalog-hero-dot-shape" aria-hidden="true"><span class="catalog-hero-dot-fill"></span></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <div class="catalogue-new-layout">
        <aside class="catalogue-new-sidebar" id="catalogue-new-sidebar">
          <div class="catalogue-new-sidebar-head">
            <h2 class="catalogue-new-sidebar-title">Фильтры</h2>
            <button type="button" class="catalogue-new-mobile-filters-close" id="catalogue-new-mobile-filters-close" aria-label="Закрыть фильтры">×</button>
            <button type="button" class="catalogue-new-reset">Сбросить</button>
          </div>

          <div class="catalogue-new-favourites-only-row">
            <div class="catalogue-new-favourites-only-text"><span class="catalogue-new-favourites-only-label" id="catalogue-new-favourites-only-label">Показывать только <a href="#catalogue-new-products" class="catalogue-new-favourites-link" id="catalogue-new-favourites-link">избранное</a></span><span class="catalogue-new-tag catalogue-new-favourites-only-count" id="catalogue-new-favourites-count" hidden>0</span></div>
            <button
              type="button"
              class="catalogue-new-switch"
              id="catalogue-new-favourites-only-switch"
              role="switch"
              aria-checked="false"
              disabled
              aria-labelledby="catalogue-new-favourites-only-label"
            >
              <span class="catalogue-new-switch-thumb" aria-hidden="true"></span>
            </button>
          </div>
          <div class="catalogue-new-filter-group" data-filter-group="collection">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="true">
              <h3>Коллекция</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel">
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="collection" aria-haspopup="dialog" aria-label="Как выбрать коллекцию">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-list">
                <button type="button" class="catalogue-new-chip is-active" data-filter-group="collection" data-value="all">Все коллекции</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="collection" data-value="classic">Classic</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="collection" data-value="flexi">Flexi</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="collection" data-value="relax">Relax</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="collection" data-value="trend">Trend</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="collection" data-value="topper">Топеры</button>
              </div>
            </div>
          </div>

          <div class="catalogue-new-filter-group" data-filter-group="size">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="false">
              <h3>Размер</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel" hidden>
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="size" aria-haspopup="dialog" aria-label="Как выбрать размер">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-field">
                <div class="catalogue-new-filter-field-head">
                  <label>Выберите размер</label>
                  <a href="#" class="catalogue-new-size-help-link" data-action="size-help">Нет нужного?</a>
                </div>
                <div class="catalogue-new-size-select" data-catalog-select="size">
                  <button type="button" class="catalogue-new-size-select-trigger" aria-haspopup="listbox" aria-expanded="false">Любой</button>
                  <ul class="catalogue-new-size-select-menu" role="listbox" hidden>
                    <li class="catalogue-new-size-select-search-row">
                      <input
                        type="text"
                        class="catalogue-new-size-select-search"
                        placeholder="Начните вводить размер"
                        autocomplete="off"
                        spellcheck="false"
                        aria-label="Поиск размера"
                      />
                    </li>
                    <li class="catalogue-new-size-select-all-row">
                      <div class="catalogue-new-size-select-all-row-inner">
                        <button type="button" class="catalogue-new-size-select-option is-active" data-value="all">Любой</button>
                        <button type="button" class="catalogue-new-size-reset-mark" data-action="size-reset">Сбросить</button>
                      </div>
                    </li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="80x190">80 × 190</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="80x200">80 × 200</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="90x190">90 × 190</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="90x200">90 × 200</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="120x190">120 × 190</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="120x200">120 × 200</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="140x190">140 × 190</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="140x200">140 × 200</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="160x190">160 × 190</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="180x190">180 × 190</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="160x200">160 × 200</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="180x200">180 × 200</button></li>
                  </ul>
                </div>
                <div class="catalogue-new-size-select-under" hidden aria-hidden="true">
                  <button type="button" class="catalogue-new-size-reset-mark" data-action="size-reset">Сбросить</button>
                </div>
              </div>
            </div>
          </div>

          <div class="catalogue-new-filter-group" data-filter-group="firmness">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="false">
              <h3>Жесткость</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel" hidden>
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="firmness" aria-haspopup="dialog" aria-label="Как выбрать жёсткость">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-list">
                <button type="button" class="catalogue-new-chip is-active" data-filter-group="firmness" data-value="all">Любая</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="firmness" data-value="soft">Мягкий</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="firmness" data-value="medium">Средний</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="firmness" data-value="hard">Жесткий</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="firmness" data-value="dualFirmness">Разная жесткость сторон</button>
              </div>
            </div>
          </div>

          <div class="catalogue-new-filter-group" data-filter-group="type">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="false">
              <h3>Тип конструкции</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel" hidden>
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="type" aria-haspopup="dialog" aria-label="Как выбрать тип конструкции">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-list">
                <button type="button" class="catalogue-new-chip is-active" data-filter-group="type" data-value="all">Любая</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="type" data-value="spring">Пружинный</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="type" data-value="nospring">Беспружинный</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="type" data-value="topper">Топер</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="type" data-value="doubleSided">Двухсторонние</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="type" data-value="singleSided">Односторонние</button>
              </div>
            </div>
          </div>

          <div class="catalogue-new-filter-group" data-filter-group="loadRange">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="false">
              <h3>Нагрузка</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel" hidden>
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="loadRange" aria-haspopup="dialog" aria-label="Как выбрать нагрузку">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-field">
                <div class="catalogue-new-filter-field-head">
                  <label>Макс. нагрузка на спальное место</label>
                </div>
                <div class="catalogue-new-size-select" data-catalog-select="loadRange">
                  <button type="button" class="catalogue-new-size-select-trigger" aria-haspopup="listbox" aria-expanded="false">Любая</button>
                  <ul class="catalogue-new-size-select-menu" role="listbox" hidden>
                    <li class="catalogue-new-size-select-all-row">
                      <div class="catalogue-new-size-select-all-row-inner">
                        <button type="button" class="catalogue-new-size-select-option is-active" data-value="all">Любая</button>
                        <button type="button" class="catalogue-new-size-reset-mark" data-action="load-range-reset">Сбросить</button>
                      </div>
                    </li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="upTo120">до 120кг</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="upTo160">до 160кг</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="upTo180">до 180кг</button></li>
                    <li><button type="button" class="catalogue-new-size-select-option" data-value="over160">Без ограничений</button></li>
                  </ul>
                </div>
                <div class="catalogue-new-size-select-under" hidden aria-hidden="true">
                  <button type="button" class="catalogue-new-size-reset-mark" data-action="load-range-reset">Сбросить</button>
                </div>
              </div>
            </div>
          </div>

          <div class="catalogue-new-filter-group" data-filter-group="heightRange">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="false">
              <h3>Высота матраса</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel" hidden>
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="heightRange" aria-haspopup="dialog" aria-label="Как выбрать высоту матраса">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-list">
                <button type="button" class="catalogue-new-chip is-active" data-filter-group="heightRange" data-value="all">Любая</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="heightRange" data-value="low">Компактные до 16 см</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="heightRange" data-value="mid">Средние 16-20 см</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="heightRange" data-value="high">Высокие свыше 20 см</button>
              </div>
            </div>
          </div>

          <div class="catalogue-new-filter-group" data-filter-group="fillings">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="false">
              <h3>Состав / Наполнитель</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel" hidden>
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="fillings" aria-haspopup="dialog" aria-label="Как выбрать наполнитель">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-list">
                <button type="button" class="catalogue-new-chip is-active" data-filter-group="fillings" data-value="all">Любая</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="fillings" data-value="coir">Кокосовая койра</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="fillings" data-value="latex">Натуральный латекс</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="fillings" data-value="orthoFoam">Орто-пена</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="fillings" data-value="memoryEffect">С эффектом памяти</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="fillings" data-value="nanoFoam">Нано-пена</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="fillings" data-value="forplit">Форплит</button>
              </div>
            </div>
          </div>

          <div class="catalogue-new-filter-group" data-filter-group="features">
            <button type="button" class="catalogue-new-filter-accordion-trigger" aria-expanded="false">
              <h3>Доп. особенности</h3>
              <span class="catalogue-new-tag catalogue-new-filter-selection-count" hidden aria-hidden="true"></span>
            </button>
            <div class="catalogue-new-filter-accordion-panel" hidden>
              <div class="catalogue-new-filter-help-row">
                <button type="button" class="catalogue-new-filter-help-trigger" data-filter-help-open="features" aria-haspopup="dialog" aria-label="Как выбрать особенности">
                  <span class="catalogue-new-filter-help-icon" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                      <path d="M12 10v5M12 8v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                  </span>
                  <span class="catalogue-new-filter-help-label">Как выбрать?</span>
                </button>
              </div>
              <div class="catalogue-new-filter-list">
                <button type="button" class="catalogue-new-chip is-active" data-filter-group="features" data-value="all">Любые</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="features" data-value="removableCover">Съемный чехол</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="features" data-value="winterSummer">Эффект зима-лето</button>
                <button type="button" class="catalogue-new-chip" data-filter-group="features" data-value="edgeSupport">Усиленный периметр</button>
              </div>
            </div>
          </div>
        </aside>

        <section class="catalogue-new-content" id="catalogue-new-products">
          <div class="catalogue-new-toolbar">
            <span class="catalogue-new-results">Найдено: <strong>6</strong> моделей</span>
            <button type="button" class="catalogue-new-mobile-filters-open" id="catalogue-new-mobile-filters-open">Фильтры</button>
            <div class="catalogue-new-sort">
              <span class="catalogue-new-sort-sizer" aria-hidden="true">
                <span class="catalogue-new-sort-sizer-line">Сортировка по умолчанию</span>
                <span class="catalogue-new-sort-sizer-line">Высота: по возрастанию</span>
                <span class="catalogue-new-sort-sizer-line">Высота: по убыванию</span>
                <span class="catalogue-new-sort-sizer-line">Максимальная нагрузка</span>
                <span class="catalogue-new-sort-sizer-line">Жесткость: по возрастанию</span>
                <span class="catalogue-new-sort-sizer-line">Жесткость: по убыванию</span>
              </span>
              <button type="button" class="catalogue-new-sort-trigger" aria-haspopup="listbox" aria-expanded="false">Сортировка по умолчанию</button>
              <ul class="catalogue-new-sort-menu" role="listbox" hidden>
                <li><button type="button" class="catalogue-new-sort-option is-active" data-value="default">Сортировка по умолчанию</button></li>
                <li><button type="button" class="catalogue-new-sort-option" data-value="height-asc">Высота: по возрастанию</button></li>
                <li><button type="button" class="catalogue-new-sort-option" data-value="height-desc">Высота: по убыванию</button></li>
                <li><button type="button" class="catalogue-new-sort-option" data-value="load-desc">Максимальная нагрузка</button></li>
                <li><button type="button" class="catalogue-new-sort-option" data-value="firmness-asc">Жесткость: по возрастанию</button></li>
                <li><button type="button" class="catalogue-new-sort-option" data-value="firmness-desc">Жесткость: по убыванию</button></li>
              </ul>
            </div>
            <div class="catalogue-new-view-toggle" aria-label="Режим отображения каталога">
              <button type="button" class="catalogue-new-view-btn" data-view="list" aria-label="Показать списком">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 12H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  <path d="M6 17H18" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                  <path d="M6 7L18 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                </svg>
              </button>
              <button type="button" class="catalogue-new-view-btn is-active" data-view="grid" aria-label="Показать таблицей" aria-pressed="true">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M8 4H6C4.89543 4 4 4.89543 4 6V8C4 9.10457 4.89543 10 6 10H8C9.10457 10 10 9.10457 10 8V6C10 4.89543 9.10457 4 8 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M8 14H6C4.89543 14 4 14.8954 4 16V18C4 19.1046 4.89543 20 6 20H8C9.10457 20 10 19.1046 10 18V16C10 14.8954 9.10457 14 8 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M18 4H16C14.8954 4 14 4.89543 14 6V8C14 9.10457 14.8954 10 16 10H18C19.1046 10 20 9.10457 20 8V6C20 4.89543 19.1046 4 18 4Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  <path d="M18 14H16C14.8954 14 14 14.8954 14 16V18C14 19.1046 14.8954 20 16 20H18C19.1046 20 20 19.1046 20 18V16C20 14.8954 19.1046 14 18 14Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="catalogue-new-favourites-back-row" id="catalogue-new-favourites-back-row" hidden>
            <div class="catalogue-new-favourites-back-row-inner">
              <button type="button" class="catalogue-new-favourites-back" id="catalogue-new-favourites-back">
                <img src="./public/icons/arrow-back-left.svg" alt="" aria-hidden="true" />
                <span>Назад</span>
              </button>
              <button type="button" class="catalogue-new-favourites-clear-all" id="catalogue-new-favourites-clear-all">
                Очистить
              </button>
            </div>
          </div>

          <div class="catalogue-new-cards">
            <article class="catalogue-new-card" data-product-slug="classic" data-collection="classic" data-firmness="medium" data-type="spring" data-height="22" data-load="140">
              <picture>
                <source type="image/avif" srcset="./public/collection-Classic@2x.avif 2x, ./public/collection-Classic.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Classic@2x.webp 2x, ./public/collection-Classic.webp 1x" />
                <img src="./public/collection-Classic.png" alt="Коллекция Classic" />
              </picture>
              <div class="catalogue-new-card-body">
                <h3>Classic</h3>
                <p class="catalogue-new-meta">
                  <span class="catalogue-new-meta-line">Высота: <span class="catalogue-new-meta-value">22см</span></span>
                  <span class="catalogue-new-meta-line">Нагрузка: <span class="catalogue-new-meta-value">до 140 кг</span></span>
                </p>
                <div class="catalogue-new-tags-row">
                  <div class="catalogue-new-tags">
                    <span class="catalogue-new-tag">Пружинный</span>
                    <span class="catalogue-new-tag">Средняя жесткость</span>
                  </div>
                  <button type="button" class="catalogue-new-favourite" data-product-slug="classic" aria-pressed="false" aria-label="Добавить в избранное">
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--empty" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12.5195 6.54004C14.1275 4.99547 16.0325 4.89463 17.5469 5.65625C19.0852 6.42991 20.25 8.11223 20.25 10.2129C20.2499 12.6747 18.7457 14.5572 16.5186 16.4248C15.7487 17.0703 14.9096 17.6806 14.0352 18.3408C13.3539 18.8552 12.6589 19.3946 12 19.9795C11.33 19.3832 10.6306 18.8382 9.94727 18.3223C9.07374 17.6627 8.24269 17.0607 7.48047 16.4238C5.24361 14.5548 3.75012 12.6922 3.75 10.2129C3.75 8.11223 4.91481 6.42991 6.45312 5.65625C7.96754 4.89463 9.87248 4.99548 11.4805 6.54004L12 7.03906L12.5195 6.54004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
                      </svg>
                    </span>
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--full" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10.2126C21 13.0257 19.2637 15.1009 17 16.9992C16.1255 17.7325 15.1591 18.4259 14.2086 19.1506C12.9284 20.1268 11.0733 20.1248 9.79369 19.1479C8.83697 18.4174 7.87175 17.7276 7 16.9992C4.72535 15.0986 3 13.0432 3 10.2126C3 5.49901 8.17524 2.53121 11.8579 5.8666C11.9374 5.93865 12.0626 5.93865 12.1421 5.8666C15.8248 2.53121 21 5.499 21 10.2126Z" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </article>

            <article class="catalogue-new-card" data-product-slug="flexi" data-collection="flexi" data-firmness="hard" data-type="nospring" data-height="24" data-load="160">
              <picture>
                <source type="image/avif" srcset="./public/collection-Flexi@2x.avif 2x, ./public/collection-Flexi.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Flexi@2x.webp 2x, ./public/collection-Flexi.webp 1x" />
                <img src="./public/collection-Flexi.png" alt="Коллекция Flexi" />
              </picture>
              <div class="catalogue-new-card-body">
                <h3>Flexi</h3>
                <p class="catalogue-new-meta">
                  <span class="catalogue-new-meta-line">Высота: <span class="catalogue-new-meta-value">24см</span></span>
                  <span class="catalogue-new-meta-line">Нагрузка: <span class="catalogue-new-meta-value">до 160 кг</span></span>
                </p>
                <div class="catalogue-new-tags-row">
                  <div class="catalogue-new-tags">
                    <span class="catalogue-new-tag">Беспружинный</span>
                    <span class="catalogue-new-tag">Жесткий</span>
                  </div>
                  <button type="button" class="catalogue-new-favourite" data-product-slug="flexi" aria-pressed="false" aria-label="Добавить в избранное">
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--empty" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12.5195 6.54004C14.1275 4.99547 16.0325 4.89463 17.5469 5.65625C19.0852 6.42991 20.25 8.11223 20.25 10.2129C20.2499 12.6747 18.7457 14.5572 16.5186 16.4248C15.7487 17.0703 14.9096 17.6806 14.0352 18.3408C13.3539 18.8552 12.6589 19.3946 12 19.9795C11.33 19.3832 10.6306 18.8382 9.94727 18.3223C9.07374 17.6627 8.24269 17.0607 7.48047 16.4238C5.24361 14.5548 3.75012 12.6922 3.75 10.2129C3.75 8.11223 4.91481 6.42991 6.45312 5.65625C7.96754 4.89463 9.87248 4.99548 11.4805 6.54004L12 7.03906L12.5195 6.54004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
                      </svg>
                    </span>
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--full" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10.2126C21 13.0257 19.2637 15.1009 17 16.9992C16.1255 17.7325 15.1591 18.4259 14.2086 19.1506C12.9284 20.1268 11.0733 20.1248 9.79369 19.1479C8.83697 18.4174 7.87175 17.7276 7 16.9992C4.72535 15.0986 3 13.0432 3 10.2126C3 5.49901 8.17524 2.53121 11.8579 5.8666C11.9374 5.93865 12.0626 5.93865 12.1421 5.8666C15.8248 2.53121 21 5.499 21 10.2126Z" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </article>

            <article class="catalogue-new-card" data-product-slug="relax" data-collection="relax" data-firmness="soft" data-type="nospring" data-height="26" data-load="170">
              <picture>
                <source type="image/avif" srcset="./public/collection-Relax@2x.avif 2x, ./public/collection-Relax.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Relax@2x.webp 2x, ./public/collection-Relax.webp 1x" />
                <img src="./public/collection-Relax.png" alt="Коллекция Relax" />
              </picture>
              <div class="catalogue-new-card-body">
                <h3>Relax</h3>
                <p class="catalogue-new-meta">
                  <span class="catalogue-new-meta-line">Высота: <span class="catalogue-new-meta-value">26см</span></span>
                  <span class="catalogue-new-meta-line">Нагрузка: <span class="catalogue-new-meta-value">до 170 кг</span></span>
                </p>
                <div class="catalogue-new-tags-row">
                  <div class="catalogue-new-tags">
                    <span class="catalogue-new-tag">Беспружинный</span>
                    <span class="catalogue-new-tag">Мягкий</span>
                  </div>
                  <button type="button" class="catalogue-new-favourite" data-product-slug="relax" aria-pressed="false" aria-label="Добавить в избранное">
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--empty" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12.5195 6.54004C14.1275 4.99547 16.0325 4.89463 17.5469 5.65625C19.0852 6.42991 20.25 8.11223 20.25 10.2129C20.2499 12.6747 18.7457 14.5572 16.5186 16.4248C15.7487 17.0703 14.9096 17.6806 14.0352 18.3408C13.3539 18.8552 12.6589 19.3946 12 19.9795C11.33 19.3832 10.6306 18.8382 9.94727 18.3223C9.07374 17.6627 8.24269 17.0607 7.48047 16.4238C5.24361 14.5548 3.75012 12.6922 3.75 10.2129C3.75 8.11223 4.91481 6.42991 6.45312 5.65625C7.96754 4.89463 9.87248 4.99548 11.4805 6.54004L12 7.03906L12.5195 6.54004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
                      </svg>
                    </span>
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--full" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10.2126C21 13.0257 19.2637 15.1009 17 16.9992C16.1255 17.7325 15.1591 18.4259 14.2086 19.1506C12.9284 20.1268 11.0733 20.1248 9.79369 19.1479C8.83697 18.4174 7.87175 17.7276 7 16.9992C4.72535 15.0986 3 13.0432 3 10.2126C3 5.49901 8.17524 2.53121 11.8579 5.8666C11.9374 5.93865 12.0626 5.93865 12.1421 5.8666C15.8248 2.53121 21 5.499 21 10.2126Z" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </article>

            <article class="catalogue-new-card" data-product-slug="trend" data-collection="trend" data-firmness="medium" data-type="spring" data-height="23" data-load="150">
              <picture>
                <source type="image/avif" srcset="./public/collection-Trend@2x.avif 2x, ./public/collection-Trend.avif 1x" />
                <source type="image/webp" srcset="./public/collection-Trend@2x.webp 2x, ./public/collection-Trend.webp 1x" />
                <img src="./public/collection-Trend.png" alt="Коллекция Trend" />
              </picture>
              <div class="catalogue-new-card-body">
                <h3>Trend</h3>
                <p class="catalogue-new-meta">
                  <span class="catalogue-new-meta-line">Высота: <span class="catalogue-new-meta-value">23см</span></span>
                  <span class="catalogue-new-meta-line">Нагрузка: <span class="catalogue-new-meta-value">до 150 кг</span></span>
                </p>
                <div class="catalogue-new-tags-row">
                  <div class="catalogue-new-tags">
                    <span class="catalogue-new-tag">Пружинный</span>
                    <span class="catalogue-new-tag">Средняя жесткость</span>
                  </div>
                  <button type="button" class="catalogue-new-favourite" data-product-slug="trend" aria-pressed="false" aria-label="Добавить в избранное">
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--empty" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12.5195 6.54004C14.1275 4.99547 16.0325 4.89463 17.5469 5.65625C19.0852 6.42991 20.25 8.11223 20.25 10.2129C20.2499 12.6747 18.7457 14.5572 16.5186 16.4248C15.7487 17.0703 14.9096 17.6806 14.0352 18.3408C13.3539 18.8552 12.6589 19.3946 12 19.9795C11.33 19.3832 10.6306 18.8382 9.94727 18.3223C9.07374 17.6627 8.24269 17.0607 7.48047 16.4238C5.24361 14.5548 3.75012 12.6922 3.75 10.2129C3.75 8.11223 4.91481 6.42991 6.45312 5.65625C7.96754 4.89463 9.87248 4.99548 11.4805 6.54004L12 7.03906L12.5195 6.54004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none" />
                      </svg>
                    </span>
                    <span class="catalogue-new-favourite-icon catalogue-new-favourite-icon--full" aria-hidden="true">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M21 10.2126C21 13.0257 19.2637 15.1009 17 16.9992C16.1255 17.7325 15.1591 18.4259 14.2086 19.1506C12.9284 20.1268 11.0733 20.1248 9.79369 19.1479C8.83697 18.4174 7.87175 17.7276 7 16.9992C4.72535 15.0986 3 13.0432 3 10.2126C3 5.49901 8.17524 2.53121 11.8579 5.8666C11.9374 5.93865 12.0626 5.93865 12.1421 5.8666C15.8248 2.53121 21 5.499 21 10.2126Z" fill="currentColor" />
                      </svg>
                    </span>
                  </button>
                </div>
              </div>
            </article>
          </div>
          <div class="catalogue-new-favourites-actions" id="catalogue-new-favourites-actions" hidden>
            <button type="button" class="catalogue-new-manager-contact-btn" id="catalogue-new-favourites-contact" disabled>Связаться с менеджером по позициям</button>
            <button type="button" class="catalogue-new-share-btn" id="catalogue-new-favourites-share" aria-label="Поделиться избранным" disabled>
              <img class="catalogue-new-share-icon--default" src="./public/icons/share-default.svg" alt="" aria-hidden="true" />
              <img class="catalogue-new-share-icon--hover" src="./public/icons/share-hover.svg" alt="" aria-hidden="true" />
              <span class="catalogue-new-share-label">Поделиться</span>
            </button>
          </div>
        </section>
      </div>
      <div class="catalogue-new-mobile-filters-overlay" id="catalogue-new-mobile-filters-overlay" hidden></div>

      <section class="documents-help">
        <div class="documents-help-content">
          <div class="documents-help-left">
            <h2 class="section-title">Нужна помощь с подбором?</h2>
          </div>
          <div class="documents-help-right">
            <p class="documents-help-text">Наши менеджеры помогут выбрать подходящую модель и подготовят персональное предложение под ваш запрос</p>
            <a href="/contacts#contact-form" class="btn-primary-large">Связаться с менеджером</a>
          </div>
        </div>
      </section>`,
} as const

export type MarketingPageId = keyof typeof MARKETING_PAGE_CONTENT
