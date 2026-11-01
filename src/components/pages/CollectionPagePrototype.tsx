import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'

import { copyTextWithToast, flashCatalogShareLinkCopiedLabel } from '@/catalog/catalog-share'

import styles from './CollectionPagePrototype.module.css'

const COLLECTION_PRODUCTS = [
  {
    name: 'Империо', slug: 'imperio', media: 'imperio_8069a3faa1',
    description: 'Двусторонняя модель с разными ощущениями жёсткости и усиленной поддержкой по всей площади.',
    tags: ['Пружинный', 'Разная жёсткость сторон'],
  },
  {
    name: 'Люксор', slug: 'luxor', media: 'luxor_adb0d9305d',
    description: 'Высокий матрас средней жёсткости для комфортного сна и равномерного распределения нагрузки.',
    tags: ['Пружинный', 'Средний'],
  },
  {
    name: 'Галакси', slug: 'galaksi', media: 'galaksi_29d31b0292',
    description: 'Сбалансированная модель с выраженной упругостью и стабильной поддержкой позвоночника.',
    tags: ['Пружинный', 'Средний'],
  },
  {
    name: 'Дискавери', slug: 'discovery', media: 'discovery_caf02c8839',
    description: 'Плотная конструкция для тех, кто предпочитает жёсткую поверхность и уверенную опору.',
    tags: ['Пружинный', 'Жёсткий'],
  },
  {
    name: 'Давос', slug: 'davos', media: 'davos_f60728f139',
    description: 'Жёсткий матрас с натуральной кокосовой койрой с обеих сторон и усиленным периметром.',
    tags: ['Пружинный', 'Жёсткий'],
  },
] as const

function CollectionPicture({ basename, alt }: { basename: string; alt: string }) {
  const root = `/collection-page-prototype/${basename}`
  return (
    <picture>
      <source type="image/avif" srcSet={`${root}.avif`} />
      <source type="image/webp" srcSet={`${root}.webp`} />
      <img src={`${root}.png`} alt={alt} loading="lazy" decoding="async" />
    </picture>
  )
}

function CollectionHero() {
  const desktopRoot = '/collection-page-prototype/davos_interior_pilot_01_37e208e0c8'
  const mobileRoot = '/collection-page-prototype/davos_product_studio_pilot_01_605d8327e4'
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (!hero || reduceMotion.matches) return

    let frame = 0
    const updateParallax = () => {
      frame = 0
      const offset = Math.min(48, Math.max(0, window.scrollY * 0.08))
      hero.style.setProperty('--collection-parallax-y', `${offset}px`)
    }
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateParallax)
    }

    updateParallax()
    window.addEventListener('scroll', requestUpdate, { passive: true })
    return () => {
      window.removeEventListener('scroll', requestUpdate)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  function copyCollectionLink(event: MouseEvent<HTMLButtonElement>) {
    copyTextWithToast(window.location.href)
    flashCatalogShareLinkCopiedLabel(event.currentTarget)
  }

  return (
    <section
      ref={heroRef}
      className={styles.hero}
      data-collection-hero
      style={{ '--collection-parallax-y': '0px' } as CSSProperties}
    >
      <picture>
        <source media="(max-width: 900px)" type="image/avif" srcSet={`${mobileRoot}.avif`} />
        <source media="(max-width: 900px)" type="image/webp" srcSet={`${mobileRoot}.webp`} />
        <source media="(max-width: 900px)" type="image/png" srcSet={`${mobileRoot}.png`} />
        <source type="image/avif" srcSet={`${desktopRoot}.avif`} />
        <source type="image/webp" srcSet={`${desktopRoot}.webp`} />
        <img src={`${desktopRoot}.png`} alt="Коллекция Relax" loading="eager" fetchPriority="high" decoding="async" />
      </picture>
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroTitle}>
        <p>Коллекция Релакс</p>
        <h1>Relax</h1>
      </div>
      <div className={`catalogue-new-shared-product-title-actions ${styles.heroActions}`} data-collection-actions>
        <button type="button" className="catalogue-new-favourites-share-link-btn catalogue-new-shared-product-icon-action" aria-label="Скопировать ссылку на коллекцию" onClick={copyCollectionLink}>
          <span className="catalogue-new-favourites-share-link-label catalogue-new-shared-product-share-label">Скопировать ссылку</span>
          <span className="catalogue-new-favourites-share-link-icon" aria-hidden="true">
            <img className="catalogue-new-favourites-share-icon--default" src="/icons/share-default.svg" alt="" />
            <img className="catalogue-new-favourites-share-icon--hover" src="/icons/share-hover.svg" alt="" />
            <img className="catalogue-new-favourites-share-icon--copied" src="/icons/share-copied.svg" alt="" />
          </span>
        </button>
      </div>
    </section>
  )
}

export function CollectionPagePrototype() {
  useEffect(() => {
    document.documentElement.classList.add('collection-page-prototype-view')
    return () => document.documentElement.classList.remove('collection-page-prototype-view')
  }, [])

  return (
    <>
      <CollectionHero />
      <section className={styles.products} aria-label="Позиции коллекции Relax" data-collection-products>
        {COLLECTION_PRODUCTS.map((product, index) => (
          <div className={styles.productEntry} key={product.slug}>
            {index > 0 ? <div className={styles.divider} aria-hidden="true" /> : null}
            <article className={styles.productCard}>
              <div className={styles.productContent}>
                <div>
                  <div className={styles.productHeading}>
                    <h2>{product.name}</h2>
                    <div className={styles.tags}>
                      {product.tags.map((tag) => <span key={tag}>{tag}</span>)}
                    </div>
                  </div>
                  <p>{product.description}</p>
                </div>
                <a href={`/catalog?product=${product.slug}`}>
                  <span>Подробнее</span>
                  <img src="/arrow-small.svg" alt="" />
                </a>
              </div>
              <a className={styles.productImage} href={`/catalog?product=${product.slug}`} aria-label={`Открыть ${product.name}`}>
                <CollectionPicture basename={product.media} alt={`Матрас ${product.name}`} />
              </a>
            </article>
          </div>
        ))}
      </section>
    </>
  )
}
