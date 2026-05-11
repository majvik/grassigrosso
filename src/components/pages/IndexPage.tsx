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
                <img src="/arrow-down.svg" alt="" />
              </span>
            </a>
          </div>
        </div>
        <div className="hero-image" id="heroVideo">
          <video
            className="hero-video hero-video--desktop"
            poster="/grassigrosso-poster.avif"
            autoPlay
            loop
            muted
            playsInline
          >
            <source
              src="/grassigrosso-silent.av1.mp4"
              type="video/mp4; codecs=av01.0.08M.08"
            />
            <source src="/grassigrosso-silent.webm" type="video/webm" />
            <source src="/grassigrosso-silent.mp4" type="video/mp4" />
          </video>
          <video
            className="hero-video hero-video--mobile"
            poster="/grassigrosso-poster.avif"
            autoPlay
            loop
            muted
            playsInline
          >
            <source
              src="/grassigrosso-silent-mobile.webm"
              type="video/webm"
            />
            <source
              src="/grassigrosso-silent-mobile.mp4"
              type="video/mp4"
            />
          </video>
          <picture className="hero-poster">
            <source
              type="image/avif"
              srcSet="/grassigrosso-poster.avif"
            />
            <source
              type="image/webp"
              srcSet="/grassigrosso-poster.webp"
            />
            <img src="/grassigrosso-poster.jpg" alt="Grassigrosso" />
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
              <img src="/icon-hotels.svg" alt="" />
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
                  src="/arrow-small.svg"
                  alt=""
                  className="arrow-small"
                />
              </a>
            </div>
          </div>
          <div className="solution-divider" />
          <div className="solution-card">
            <div className="solution-icon">
              <img src="/icon-dealers.svg" alt="" />
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
                  src="/arrow-small.svg"
                  alt=""
                  className="arrow-small"
                />
              </a>
            </div>
          </div>
          <div className="solution-divider" />
          <div className="solution-card">
            <div className="solution-icon">
              <img src="/icon-catalog.svg" alt="" />
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
                  src="/arrow-small.svg"
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
              <img src="/icon-engineering.svg" alt="" />
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
              <img src="/icon-nature.svg" alt="" />
            </div>
            <div className="feature-content">
              <h3 className="feature-title">Естественное восстановление</h3>
              <p className="feature-text">
                Оставлено только то, что действительно работает.
                <br /> Чистые формы снаружи и внутри.
              </p>
            </div>
          </div>
          <div className="philosophy-divider" />
          <div
            className="philosophy-feature philosophy-feature--doc"
            data-document-card=""
            data-document="presentation"
          >
            <div className="feature-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88" fill="none" aria-hidden="true">
                <path d="M22.3882 12.4622C25.391 12.4927 28.2687 12.8107 31.2544 13.0599L43.2388 13.9397C47.1572 14.2195 51.0716 14.1197 54.9878 14.6272C57.5034 14.9531 60.0511 14.4335 61.7496 16.8226C62.8307 18.3712 63.2572 20.2859 62.9341 22.1468C62.594 24.0858 61.2373 26.8898 59.1031 27.0071C57.6503 27.0863 55.1543 26.5032 53.6255 26.2776C53.4496 28.9812 53.495 32.0223 53.5259 34.7356C53.5466 36.5206 54.0319 38.5334 54.1021 40.3382C54.3769 44.7317 54.8592 49.0769 54.9331 53.4847C54.999 55.0987 55.356 56.7473 55.4136 58.3567C55.5485 62.1289 55.3641 65.8976 54.4058 69.5638C53.3997 73.4095 50.1473 73.9124 46.689 73.806C46.894 74.5687 47.811 77.1169 46.9468 77.5423C46.1464 77.6677 44.5974 76.1986 43.8453 75.7815C43.8067 75.7602 43.6422 75.6174 43.6001 75.5794C43.4185 76.2011 42.1509 79.218 41.7242 79.6204C40.8786 79.6743 39.7547 74.6938 39.566 73.8284C38.9477 73.9071 38.0934 73.8905 37.4527 73.887C37.1342 74.7418 36.0129 78.1728 35.3091 78.5315C35.2232 78.5752 35.0828 78.6024 34.9898 78.5657C34.7185 78.4573 34.617 78.229 34.5132 77.9739C34.0528 76.8422 33.8123 75.5899 33.4312 74.4261C32.9832 74.6924 29.7035 76.8815 29.2876 76.0296C29.0946 75.6262 29.8673 73.9795 30.1021 73.4476C27.6593 73.3932 25.2182 73.2443 22.7867 73.0032C20.832 72.8102 18.8405 72.5678 16.9087 72.3177C15.2523 72.1038 13.2418 72.1152 11.6812 71.6702C9.64528 71.0883 8.10147 69.0085 8.27104 66.8831C8.33287 66.1117 8.44647 65.7458 8.60307 65.0257C9.57097 64.982 12.0799 65.2702 13.0992 65.4192C13.3981 65.5372 14.1617 65.5474 14.4859 65.5335C15.1152 65.4603 18.7507 65.9331 19.6451 65.9896C23.9265 66.2579 28.3696 66.7692 32.6656 66.8333C32.8015 66.3397 33.1639 65.7018 33.4331 65.2649C31.6052 64.7501 31.4206 63.1867 31.6675 61.5267C31.5568 61.3342 31.3709 61.0504 31.231 60.8802C29.4493 58.7225 30.4723 58.3667 31.9497 56.595C31.966 55.8564 31.8904 54.3798 32.0826 53.7415C32.2265 53.2655 33.9991 53.2996 34.7544 53.0091L34.8277 52.9808C36.0166 51.5026 36.1312 49.9099 38.3804 51.2161C38.6645 51.3809 39.1641 51.5811 39.48 51.7239C42.3207 50.3214 42.477 50.7552 43.8404 53.344C44.526 53.607 45.6915 53.6543 46.2535 54.1966C46.8269 54.7529 46.4854 56.3993 46.4634 57.2532C46.935 57.8883 47.4967 58.3701 47.8287 59.0882C47.7604 60.525 47.372 60.6349 46.4615 61.7474C46.516 62.1092 46.5276 62.4877 46.5718 62.8411C46.842 64.9972 46.0029 65.1476 44.1216 65.4896C44.3698 66.0442 44.5933 66.5304 44.7886 67.1067C45.6822 66.9362 47.1027 66.9448 48.0025 67.0716C47.7566 68.5425 47.6536 69.6966 48.4195 71.055C48.9985 72.0802 50.1138 72.6952 51.1675 71.9231C53.8245 69.9376 53.6328 66.1161 53.9058 63.1868C54.1702 60.3533 53.9516 58.15 53.6841 55.3724C53.5783 54.1773 53.4922 52.9785 53.4263 51.7806C53.2416 48.7846 53.0911 45.7778 52.8746 42.7825C52.7069 39.8935 52.2592 37.0203 52.1685 34.1253C52.0483 30.2796 52.2767 25.984 52.9312 22.1956C53.3558 19.7385 54.1726 17.1981 56.3462 15.7796C49.2211 15.6719 42.1014 15.2914 35.0054 14.639C31.8345 14.3283 28.6605 14.0374 25.4859 13.7669C23.9919 13.6287 20.755 13.0197 19.3667 13.5872C18.332 14.0106 17.3031 15.9651 16.8824 17.011C15.1879 21.2256 14.6799 25.7749 14.8648 30.2923C14.9256 32.2899 14.8998 34.0249 15.0308 36.0618C15.1923 38.5727 15.4741 41.079 15.6451 43.554C15.8541 46.5816 15.9679 49.7289 15.9615 52.7532C15.956 55.3007 15.9297 59.4633 15.2222 61.888C14.3834 62.1663 14.729 61.7937 14.2632 61.679C14.9336 57.5511 14.6449 51.2635 14.4156 47.0472L14.1148 40.5814C13.7705 33.3065 12.85 25.9692 14.8736 18.8255C15.1293 17.923 15.5955 17.1498 15.9703 16.3294C17.4394 13.1123 18.8986 12.4269 22.3882 12.4622Z" fill="#696565"/>
                <path d="M38.1552 53.9835C41.1932 53.4983 44.0484 55.5714 44.5263 58.6105C45.0043 61.6494 42.923 64.4995 39.8828 64.9699C36.8529 65.4386 34.0153 63.3671 33.539 60.338C33.0628 57.3096 35.1277 54.4672 38.1552 53.9835Z" fill="#696565"/>
              </svg>
            </div>
            <div className="feature-content">
              <h3 className="feature-title">Презентация компании</h3>
              <p className="feature-text">PDF документ</p>
            </div>
            <div className="documents-commercial-item-download" aria-hidden="true">
              <img src="/arrow-small.svg" alt="" className="arrow-small" />
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
              src="/arrow-small.svg"
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
                  srcSet="/collection-Classic.avif 2x, /collection-Classic@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="/collection-Classic.webp 2x, /collection-Classic@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="/collection-Classic.png 2x, /collection-Classic@0.5x.png 1x"
                />
                <img src="/collection-Classic@0.5x.png" alt="Classic" />
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
                  srcSet="/collection-Flexi.avif 2x, /collection-Flexi@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="/collection-Flexi.webp 2x, /collection-Flexi@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="/collection-Flexi.png 2x, /collection-Flexi@0.5x.png 1x"
                />
                <img src="/collection-Flexi@0.5x.png" alt="Flexi" />
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
                  srcSet="/collection-Relax.avif 2x, /collection-Relax@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="/collection-Relax.webp 2x, /collection-Relax@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="/collection-Relax.png 2x, /collection-Relax@0.5x.png 1x"
                />
                <img src="/collection-Relax@0.5x.png" alt="Relax" />
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
                  srcSet="/collection-Trend.avif 2x, /collection-Trend@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="/collection-Trend.webp 2x, /collection-Trend@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="/collection-Trend.png 2x, /collection-Trend@0.5x.png 1x"
                />
                <img src="/collection-Trend@0.5x.png" alt="Trend" />
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
                  srcSet="/collection-Viva-Natura@2x.avif 2x, /collection-Viva-Natura@0.5x.avif 1x"
                />
                <source
                  type="image/webp"
                  srcSet="/collection-Viva-Natura@2x.webp 2x, /collection-Viva-Natura@0.5x.webp 1x"
                />
                <source
                  type="image/png"
                  srcSet="/collection-Viva-Natura@2x.png 2x, /collection-Viva-Natura@0.5x.png 1x"
                />
                <img
                  src="/collection-Viva-Natura@0.5x.png"
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
              <img src="/arrow-down.svg" alt="" />
            </button>
            <button className="arrow-btn next">
              <img src="/arrow-down.svg" alt="" />
            </button>
          </div>
        </div>
      </section>

      <section className="partners">
        <h2 className="section-title">Партнеры и технологии</h2>
        <div className="partners-grid partners-grid-image" aria-hidden="true">
          <img
            src="/logos@2x-normal.png"
            alt=""
            className="partners-img partners-img-normal"
            width="1920"
            height="640"
          />
          <img
            src="/logos@2x-mobile.png"
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
              <img src="/star.svg" alt="★" />
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
              src="/arrow-medium.svg"
              alt=""
              className="arrow-medium"
            />
          </a>
        </div>
        <div className="certification-grid">
          <div className="certification-card">
            <div className="certification-image">
              <img src="/production.svg" alt="Производство" />
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
                src="/cooperation.svg"
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
              <img src="/certification.svg" alt="Сертификация" />
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
