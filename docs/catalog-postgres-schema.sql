-- Grassigrosso catalog schema (PostgreSQL)
-- Подготовлено для будущей интеграции со Strapi:
-- - понятные сущности
-- - индексы под фильтры и сортировки
-- - простые связи для масштабирования каталога

BEGIN;

-- Рекомендуется отдельная schema для каталоговых данных
CREATE SCHEMA IF NOT EXISTS catalog;

-- Справочник коллекций
CREATE TABLE IF NOT EXISTS catalog.collections (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Справочник тегов (опционально, если теги хочется управлять отдельно)
CREATE TABLE IF NOT EXISTS catalog.tags (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Товары каталога
CREATE TABLE IF NOT EXISTS catalog.products (
  id                 BIGSERIAL PRIMARY KEY,
  name               TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  collection_id      BIGINT REFERENCES catalog.collections(id) ON DELETE SET NULL,
  -- значения, которые уже используются в фильтрах/сортировках текущей страницы
  firmness           TEXT NOT NULL CHECK (firmness IN ('soft', 'medium', 'hard')),
  mattress_type      TEXT NOT NULL CHECK (mattress_type IN ('spring', 'nospring', 'topper')),
  height_cm          NUMERIC(5,2) NOT NULL CHECK (height_cm > 0),
  max_load_kg        INTEGER NOT NULL CHECK (max_load_kg > 0),
  subtitle           TEXT,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- N:M связь товаров и тегов
CREATE TABLE IF NOT EXISTS catalog.product_tags (
  product_id      BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  tag_id          BIGINT NOT NULL REFERENCES catalog.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

-- Медиа (изображения) для карточек
CREATE TABLE IF NOT EXISTS catalog.product_media (
  id              BIGSERIAL PRIMARY KEY,
  product_id      BIGINT NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL CHECK (kind IN ('main', 'gallery', 'thumbnail')),
  url             TEXT NOT NULL,
  alt             TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы под частые запросы каталога
CREATE INDEX IF NOT EXISTS idx_products_active ON catalog.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_collection ON catalog.products(collection_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_firmness ON catalog.products(firmness) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_type ON catalog.products(mattress_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_height ON catalog.products(height_cm) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_load ON catalog.products(max_load_kg) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_sort_order ON catalog.products(sort_order) WHERE is_active = TRUE;

-- Композитный индекс под комбинированные фильтры + сортировку
CREATE INDEX IF NOT EXISTS idx_products_catalog_filters
  ON catalog.products (collection_id, firmness, mattress_type, sort_order)
  WHERE is_active = TRUE;

COMMIT;

-- Пример выборки под текущий UI:
-- SELECT p.*
-- FROM catalog.products p
-- WHERE p.is_active = TRUE
--   AND (:collection IS NULL OR p.collection_id = :collection)
--   AND (:firmness IS NULL OR p.firmness = :firmness)
--   AND (:mattress_type IS NULL OR p.mattress_type = :mattress_type)
-- ORDER BY
--   CASE WHEN :sort = 'height-asc' THEN p.height_cm END ASC,
--   CASE WHEN :sort = 'height-desc' THEN p.height_cm END DESC,
--   CASE WHEN :sort = 'load-desc' THEN p.max_load_kg END DESC,
--   CASE WHEN :sort = 'firmness-asc' THEN
--     CASE p.firmness WHEN 'hard' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END
--   END ASC,
--   CASE WHEN :sort = 'firmness-desc' THEN
--     CASE p.firmness WHEN 'hard' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END
--   END DESC,
--   p.sort_order ASC,
--   p.id ASC;
