import { useEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react'

import { getCatalogProductsFullFeed, type CatalogProduct } from '@/catalog/catalog-api'
import { formatConstructionType } from '@/catalog/catalog-modal'
import { CatalogFirmnessScale } from '@/components/ui/CatalogFirmnessScale'
import { CatalogPageCover } from '@/components/ui/CatalogPageCover'
import { ResponsivePicture } from '@/components/ui/ResponsivePicture'
import { copyTextWithToast, flashCatalogShareLinkCopiedLabel } from '@/catalog/catalog-share'

import styles from './CollectionPagePrototype.module.css'

function CollectionHero({ name, product }: { name: string; product: CatalogProduct }) {
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
      <div className={styles.heroMedia} data-collection-hero-media>
        <CatalogPageCover desktop={product.collectionPageCoverDesktop} mobile={product.collectionPageCoverMobile} alt={`Коллекция ${name}`} />
      </div>
      <div className={styles.heroShade} aria-hidden="true" />
      <div className={styles.heroTitle}>
        <p>Коллекция</p>
        <h1>{name}</h1>
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

export function CollectionPagePrototype({ collectionSlug = 'relax' }: { collectionSlug?: string }) {
  const [products, setProducts] = useState<CatalogProduct[] | null>(null)
  useEffect(() => {
    document.documentElement.classList.add('collection-page-prototype-view')
    return () => document.documentElement.classList.remove('collection-page-prototype-view')
  }, [])

  useEffect(() => {
    let active = true
    getCatalogProductsFullFeed().then((items) => {
      if (active) setProducts(items.filter((item) => item.slug && item.collectionSlug === collectionSlug))
    }).catch(() => {
      if (active) setProducts([])
    })
    return () => { active = false }
  }, [collectionSlug])

  if (!products) return null
  if (!products.length) {
    return <section className={styles.products}>
      <h1>Коллекция не найдена</h1>
      <a href="/catalog">Перейти в каталог</a>
    </section>
  }

  const collectionName = products[0].collectionName || collectionSlug
  return (
    <>
      <CollectionHero name={collectionName} product={products[0]} />
      <section className={styles.products} aria-label={`Позиции коллекции ${collectionName}`} data-collection-products>
        {products.map((product, index) => {
          const name = product.name || product.slug || ''
          const href = `/catalog?product=${encodeURIComponent(product.slug || '')}`
          const tags = product.tags?.filter((tag): tag is string => typeof tag === 'string' && Boolean(tag)) || []
          const media = product.gallery?.[0]
          const image = media?.type === 'image' ? media.src : media?.poster || product.imageUrl || ''
          return (
            <div className={styles.productEntry} key={product.slug}>

              <article className={styles.productCard}>
                <div className={styles.productContent}>
                  <div>
                    <div className={styles.productHeading}>
                      <h2>{name}</h2>
                      <div className={styles.tags}>
                        {tags.map((tag) => <span key={tag}>{tag}</span>)}
                      </div>
                    </div>
                    {product.pageDescription && <p>{product.pageDescription}</p>}
                    <dl className={styles.specs}>
                      <div><dt>Тип конструкции</dt><dd>{formatConstructionType(product.mattressType, product.sidedness)}</dd></div>
                      <div><dt>Нагрузка</dt><dd>{product.maxLoadKg ? `до ${product.maxLoadKg} кг` : '—'}</dd></div>
                    </dl>
                    <CatalogFirmnessScale side1={product.firmnessSide1} side2={product.firmnessSide2} />
                  </div>
                  <a href={href}>
                    <span>Подробнее</span>
                    <img src="/arrow-small.svg" alt="" />
                  </a>
                </div>
                <a className={styles.productImage} href={href} aria-label={`Открыть ${name}`}>
                  <ResponsivePicture src={image} alt={`Матрас ${name}`} slotId="catalog-card" sizes="(max-width: 900px) 100vw, 50vw" catalogFallback />
                </a>
              </article>
              {index < products.length - 1 && <div className={styles.divider} data-collection-divider aria-hidden="true" />}
            </div>
          )
        })}
      </section>
    </>
  )
}
