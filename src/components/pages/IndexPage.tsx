export function IndexPage() {
  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Любовь с первого утра
              <sup className="hero-title-tm" aria-label="Торговая марка">
                Ⓒ
              </sup>
            </h1>
            <p className="hero-description">
              Мы создаем продуманные системы для сна и естественного
              восстановления, чтобы каждое утро начиналось легко и спокойно.
            </p>
          </div>
          <div className="hero-link-wrapper">
            <a
              href="#"
              className="hero-link"
              id="heroCommercialOfferLink"
              aria-haspopup="dialog"
            >
              <span>
                Получить подробную
                <br />
                информацию
              </span>
              <span className="arrow-icon">
                <img src="./public/arrow-down.svg" alt="" />
              </span>
            </a>
          </div>
        </div>
        <div className="hero-image" id="heroVideo">
          <video
            className="hero-video hero-video--desktop"
            poster="./public/grassigrosso-poster.avif"
            autoPlay
            loop
            muted
            playsInline
          >
            <source
              src="./public/grassigrosso-silent.av1.mp4"
              type="video/mp4; codecs=av01.0.08M.08"
            />
            <source src="./public/grassigrosso-silent.webm" type="video/webm" />
            <source src="./public/grassigrosso-silent.mp4" type="video/mp4" />
          </video>
          <video
            className="hero-video hero-video--mobile"
            poster="./public/grassigrosso-poster.avif"
            autoPlay
            loop
            muted
            playsInline
          >
            <source
              src="./public/grassigrosso-silent-mobile.webm"
              type="video/webm"
            />
            <source
              src="./public/grassigrosso-silent-mobile.mp4"
              type="video/mp4"
            />
          </video>
          <picture className="hero-poster">
            <source
              type="image/avif"
              srcSet="./public/grassigrosso-poster.avif"
            />
            <source
              type="image/webp"
              srcSet="./public/grassigrosso-poster.webp"
            />
            <img src="./public/grassigrosso-poster.jpg" alt="Grassigrosso" />
          </picture>
          <button className="hero-play-btn" aria-label="Воспроизвести видео">
            <svg
              width="80"
              height="80"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="32" cy="32" r="32" fill="white" fillOpacity="0.9" />
              <path d="M26 20L46 32L26 44V20Z" fill="#243731" />
            </svg>
          </button>
        </div>
      </section>

      <section className="business-solutions">
        <h2 className="section-title">Решения для бизнеса</h2>
        <div className="solutions-grid">
          <div className="solution-card">
            <div className="solution-icon">
              <img src="./public/icon-hotels.svg" alt="" />
            </div>
            <div className="solution-content">
              <h3 className="solution-title">Отелям</h3>
              <p className="solution-text">
                Сон, о котором хочется написать в отзыве.
                <br /> Матрасы, которые создают впечатление и повышают
                лояльность гостей.
              </p>
              <a href="/hotels" className="solution-link">
                Узнать больше
                <img
                  src="./public/arrow-small.svg"
                  alt=""
                  className="arrow-small"
                />
              </a>
            </div>
          </div>
          <div className="solution-divider" />
          <div className="solution-card">
            <div className="solution-icon">
              <img src="./public/icon-dealers.svg" alt="" />
            </div>
            <div className="solution-content">
              <h3 className="solution-title">Дилерам</h3>
              <p className="solution-text">
                Продуманные решения для ваших клиентов. Инвестиция в
                восстановление каждого утра ближайших 10 лет.
              </p>
              <a href="/dealers" className="solution-link">
                Условия партнёрства
                <img
                  src="./public/arrow-small.svg"
                  alt=""
                  className="arrow-small"
                />
              </a>
            </div>
          </div>
          <div className="solution-divider" />
          <div className="solution-card">
            <div className="solution-icon">
              <img src="./public/icon-catalog.svg" alt="" />
            </div>
            <div className="solution-content">
              <h3 className="solution-title">Каталог</h3>
              <p className="solution-text">
                Инженерная точность сна в каждой модели.
                <br />
                Матрасы, в которых все на своем месте − и вы тоже.
              </p>
              <a href="/catalog" className="solution-link">
                Смотреть коллекции
                <img
                  src="./public/arrow-small.svg"
                  alt=""
                  className="arrow-small"
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="philosophy">
        <div className="philosophy-left">
          <h2 className="section-title">Наша философия</h2>
          <p className="philosophy-description">
            Мы создаём условия, в которых природа делает своё для вашего
            естественного восстановления.
            <br /> Каждый слой – осмысленный, каждое решение – логичное.
          </p>
        </div>
        <div className="philosophy-right">
          <div className="philosophy-feature">
            <div className="feature-icon">
              <img src="./public/icon-engineering.svg" alt="" />
            </div>
            <div className="feature-content">
              <h3 className="feature-title">Инженерная точность сна</h3>
              <p className="feature-text">
                Мы собираем современные технологии и лучшие инженерные решения в
                продуманные продукты для сна.
              </p>
            </div>
          </div>
          <div className="philosophy-divider" />
          <div className="philosophy-feature">
            <div className="feature-icon">
              <img src="./public/icon-nature.svg" alt="" />
            </div>
            <div className="feature-content">
              <h3 className="feature-title">Естественное восстановление</h3>
              <p className="feature-text">
                Оставлено только то, что действительно работает.
                <br /> Чистые формы снаружи и внутри.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="collections">
        <div className="collections-header">
          <div className="collections-header-left">
            <h2 className="section-title">Коллекции</h2>
            <p className="collections-subtitle">
              Каждая коллекция вдохновлена своей историей и проблемой, которую
              мы хотим решить. Но все они объединены общими принципами
              инженерной осознанности.
            </p>
          </div>
          <a href="/catalog" className="collections-link">
            смотреть Все коллекции
            <img
              src="./public/arrow-small.svg"
              alt=""
              className="arrow-small"
            />
          </a>
        </div>
        <div className="collections-grid">
          <div className="collection-card">
            <div className="collection-image">
              <picture>
                <source
                  type="image/avif"
                  srcSet="./public/collection-Classic.avif 2x, ./public/collection-Classic@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="./public/collection-Classic.webp 2x, ./public/collection-Classic@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="./public/collection-Classic.png 2x, ./public/collection-Classic@0.5x.png 1x"
                />
                <img src="./public/collection-Classic@0.5x.png" alt="Classic" />
              </picture>
            </div>
            <div className="collection-content">
              <div className="collection-title-group">
                <h3 className="collection-title">Classic</h3>
                <p className="collection-subtitle">Классик</p>
              </div>
              <ul className="collection-features">
                <li>Доступные модели</li>
                <li>Классические технологии</li>
                <li>Базовый, понятный комфорт</li>
              </ul>
            </div>
          </div>
          <div className="collection-card">
            <div className="collection-image">
              <picture>
                <source
                  type="image/avif"
                  srcSet="./public/collection-Flexi.avif 2x, ./public/collection-Flexi@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="./public/collection-Flexi.webp 2x, ./public/collection-Flexi@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="./public/collection-Flexi.png 2x, ./public/collection-Flexi@0.5x.png 1x"
                />
                <img src="./public/collection-Flexi@0.5x.png" alt="Flexi" />
              </picture>
            </div>
            <div className="collection-content">
              <div className="collection-title-group">
                <h3 className="collection-title">Flexi</h3>
                <p className="collection-subtitle">Флекси</p>
              </div>
              <ul className="collection-features">
                <li>Современные пены</li>
                <li>Упругая адаптивная поддержка</li>
                <li>Минималистичный дизайн</li>
              </ul>
            </div>
          </div>
          <div className="collection-card">
            <div className="collection-image">
              <picture>
                <source
                  type="image/avif"
                  srcSet="./public/collection-Relax.avif 2x, ./public/collection-Relax@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="./public/collection-Relax.webp 2x, ./public/collection-Relax@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="./public/collection-Relax.png 2x, ./public/collection-Relax@0.5x.png 1x"
                />
                <img src="./public/collection-Relax@0.5x.png" alt="Relax" />
              </picture>
            </div>
            <div className="collection-content">
              <div className="collection-title-group">
                <h3 className="collection-title">Relax</h3>
                <p className="collection-subtitle">Релакс</p>
              </div>
              <ul className="collection-features">
                <li>Пружины малого диаметра</li>
                <li>Высокая адаптивность поддержки</li>
                <li>Высокая несущая способность</li>
              </ul>
            </div>
          </div>
          <div className="collection-card">
            <div className="collection-image">
              <picture>
                <source
                  type="image/avif"
                  srcSet="./public/collection-Trend.avif 2x, ./public/collection-Trend@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="./public/collection-Trend.webp 2x, ./public/collection-Trend@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="./public/collection-Trend.png 2x, ./public/collection-Trend@0.5x.png 1x"
                />
                <img src="./public/collection-Trend@0.5x.png" alt="Trend" />
              </picture>
            </div>
            <div className="collection-content">
              <div className="collection-title-group">
                <h3 className="collection-title">Trend</h3>
                <p className="collection-subtitle">Тренд</p>
              </div>
              <ul className="collection-features">
                <li>Проверенные решения</li>
                <li>Популярный дизайн</li>
                <li>Для современных интерьеров</li>
              </ul>
            </div>
          </div>
          <div className="collection-card" style={{ display: "none" }}>
            <div className="collection-image">
              <picture>
                <source
                  type="image/avif"
                  srcSet="./public/collection-Viva-Natura@2x.avif 2x, ./public/collection-Viva-Natura@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="./public/collection-Viva-Natura@2x.webp 2x, ./public/collection-Viva-Natura@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="./public/collection-Viva-Natura@2x.png 2x, ./public/collection-Viva-Natura@0.5x.png 1x"
                />
                <img
                  src="./public/collection-Viva-Natura@0.5x.png"
                  alt="Viva Natura"
                />
              </picture>
            </div>
            <div className="collection-content">
              <div className="collection-title-group">
                <h3 className="collection-title">Viva Natura</h3>
                <p className="collection-subtitle">Вива Натура</p>
              </div>
              <ul className="collection-features">
                <li>Натуральные компоненты</li>
                <li>Экологичность</li>
                <li>Премиальный комфорт</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="collections-nav">
          <div className="collections-progress">
            <div className="collections-progress-fill" />
          </div>
          <div className="collections-arrows">
            <button className="arrow-btn prev" disabled>
              <img src="./public/arrow-down.svg" alt="" />
            </button>
            <button className="arrow-btn next">
              <img src="./public/arrow-down.svg" alt="" />
            </button>
          </div>
        </div>
      </section>

      <section className="partners">
        <h2 className="section-title">Партнеры и технологии</h2>
        <div className="partners-grid partners-grid-image" aria-hidden="true">
          <img
            src="./logos@2x-normal.png"
            alt=""
            className="partners-img partners-img-normal"
            width="1920"
            height="640"
          />
          <img
            src="./logos@2x-mobile.png"
            alt=""
            className="partners-img partners-img-mobile"
            width="750"
            height="1500"
          />
        </div>
      </section>

      <section className="testimonials">
        <h2 className="section-title">Нам доверяют</h2>
        <div className="testimonials-grid">
          <div className="testimonial-card">
            <span className="testimonial-tag">Партнёр</span>
            <h3 className="testimonial-company">ИП Левченко Т.А.</h3>
            <div className="testimonial-author">
              <p className="author-name">Воронина Е.С.</p>
              <p className="author-position">Директор розничной торговли</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Больше всего ценим логистику, ассортимент, качество,
              профессиональную работу менеджеров. Особенно хочется отметить
              менеджера, с которым мы работаем продолжительное время. Спасибо за
              ваш труд.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">Кубань Матрас</h3>
            <div className="testimonial-author">
              <p className="author-name">Грушко Пётр Леонидович</p>
              <p className="author-position">Директор</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Отмечаем сроки и качество продукции. Работа персонала организована
              на высшем уровне.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Санаторий</span>
            <h3 className="testimonial-company">ГУП РК «СОК «Руссия»</h3>
            <div className="testimonial-author">
              <p className="author-name">Инна</p>
              <p className="author-position">Специалист по закупкам</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Остались довольны качеством, сроками, ценовой политикой.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">ИП Корнилов А.И.</h3>
            <div className="testimonial-author">
              <p className="author-name">Корнилов Александр Иванович</p>
              <p className="author-position">Предприниматель</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Впечатлил индивидуальный подход – погружение в ситуацию!
              Продуманная логистика, молодые, энергичные менеджеры!
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">ПРОМЭКС</h3>
            <div className="testimonial-author">
              <p className="author-name">Елена</p>
              <p className="author-position">Заместитель управляющего</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Выделяем скорость реакции на запросы, оперативность согласования
              заказов и работу в тандеме с менеджерами фабрики. Производитель
              гибко подходит к подбору решений под потребности разных розничных
              точек, помогает формировать ассортимент. Логистика и сроки
              поставки стабильны. Качество продукции на высоком уровне,
              рекламаций от покупателей минимум. Компания предоставляет
              материалы для обучения продавцов, каталоги, образцы, помогает в
              продвижении.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">ИП Мачульский А.В.</h3>
            <div className="testimonial-author">
              <p className="author-name">Найденова А.Н.</p>
              <p className="author-position">Консультант</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Радует качество продукции – нареканий нет. Быстрая доставка,
              широкий ассортимент.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">Стильный дом</h3>
            <div className="testimonial-author">
              <p className="author-name">Иванова Кристина Александровна</p>
              <p className="author-position">Менеджер по продажам</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Особенно довольны сроками доставки.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Санаторий</span>
            <h3 className="testimonial-company">ГУП РК «СОК «Руссия»</h3>
            <div className="testimonial-author">
              <p className="author-name">Инна</p>
              <p className="author-position">Специалист по закупкам</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Остались довольны качеством, сроками, ценовой политикой.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">Мебель «Эра»</h3>
            <div className="testimonial-author">
              <p className="author-name">Данцева</p>
              <p className="author-position">Администратор</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Хочу отметить отличное качество продукции и профессиональный
              подход к работе. Заказы приходят быстро и всё без проблем. Матрасы
              оказались именно такими, как и ожидали: удобными,
              высококачественными и хорошо поддерживающими. Особо радует
              внимательное отношение, быстрые ответы на все вопросы и
              индивидуальный подход.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">ИП Адров С.А.</h3>
            <div className="testimonial-author">
              <p className="author-name">Сергей</p>
              <p className="author-position">Руководитель</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              От принятия заказа до поставки матрасов всё проходит быстро. По
              любому вопросу можно позвонить и получить консультацию. За время
              работы с браком не сталкивались. Качество продукции высокое.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">ИП Семенов Ф.В.</h3>
            <div className="testimonial-author">
              <p className="author-name">Борзенко Наталья Юрьевна</p>
              <p className="author-position">Бухгалтер</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Высоко оцениваем скорость доставки, работу с рекламациями,
              качество продукции.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Санаторий</span>
            <h3 className="testimonial-company">ГУП РК «СОК «Руссия»</h3>
            <div className="testimonial-author">
              <p className="author-name">Инна</p>
              <p className="author-position">Специалист по закупкам</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Остались довольны качеством, сроками, ценовой политикой.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">ИП Мишустин</h3>
            <div className="testimonial-author">
              <p className="author-name">Юлия</p>
              <p className="author-position">Администратор</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Приятно удивило, что наш салон посещали представители фабрики и
              проводили подробное обучение, рассказывали о характеристиках
              товара и отвечали на интересующие нас вопросы.
            </p>
          </div>
          <div className="testimonial-card">
            <span className="testimonial-tag">Дилер</span>
            <h3 className="testimonial-company">ООО Парк М</h3>
            <div className="testimonial-author">
              <p className="author-name">Елена</p>
              <p className="author-position">Продавец-консультант</p>
            </div>
            <div className="testimonial-rating">
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
              <img src="./public/star.svg" alt="★" />
            </div>
            <p className="testimonial-text">
              Цена, сроки, качество, логистика – всё на высоте. Ни одной
              рекламации не было за всё время работы. Молодцы, так держать!
            </p>
          </div>
        </div>
      </section>

      <section className="certification">
        <div className="certification-header">
          <h2 className="section-title">Сертификация и документация</h2>
          <a href="/documents" className="certification-link">
            Документы и сертификаты
            <img
              src="./public/arrow-medium.svg"
              alt=""
              className="arrow-medium"
            />
          </a>
        </div>
        <div className="certification-grid">
          <div className="certification-card">
            <div className="certification-image">
              <img src="./public/production.svg" alt="Производство" />
            </div>
            <div className="certification-content">
              <h3 className="certification-title">Производство</h3>
              <p className="certification-text">
                Проверенная временем система распределенного производства
                полного цикла с контролем качества на каждом этапе.
                Сертифицированные материалы от европейских поставщиков.
              </p>
            </div>
          </div>
          <div className="certification-card">
            <div className="certification-image">
              <img
                src="./public/cooperation.svg"
                alt="Особенности сотрудничества"
              />
            </div>
            <div className="certification-content">
              <h3 className="certification-title">
                Особенности сотрудничества
              </h3>
              <p className="certification-text">
                Гарантированные сроки поставки 7-14 дней. Логистика по всей
                России. Расширенная гарантия на пружинные блоки до 5 лет.
                Техническая поддержка для B2B клиентов.
              </p>
            </div>
          </div>
          <div className="certification-card">
            <div className="certification-image">
              <img src="./public/certification.svg" alt="Сертификация" />
            </div>
            <div className="certification-content">
              <h3 className="certification-title">Сертификация</h3>
              <p className="certification-text">
                Мы предоставляем полный пакет документов и сертификатов
                соответствия на всю продукцию.
                <br />
                <br />
                Прозрачность требований, подтверждённые характеристики и единые
                стандарты качества для уверенной работы.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
