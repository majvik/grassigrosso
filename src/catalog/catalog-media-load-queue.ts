const MAX_CONCURRENT = 2
const CARD_MEDIA_ROOT_MARGIN = '200px 0px'

type QueueJob = () => Promise<void>

let activeCount = 0
const pending: QueueJob[] = []

function drainQueue(): void {
  while (activeCount < MAX_CONCURRENT && pending.length > 0) {
    const job = pending.shift()
    if (!job) return
    activeCount += 1
    void job().finally(() => {
      activeCount -= 1
      drainQueue()
    })
  }
}

export function enqueueCatalogMediaLoad<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    pending.push(async () => {
      try {
        resolve(await task())
      } catch (error) {
        reject(error)
      }
    })
    drainQueue()
  })
}

export function waitForImageElement(img: HTMLImageElement): Promise<void> {
  if (img.complete) return Promise.resolve()
  return new Promise((resolve) => {
    const finish = (): void => resolve()
    img.addEventListener('load', finish, { once: true })
    img.addEventListener('error', finish, { once: true })
  })
}

export function loadPictureElement(picture: HTMLPictureElement): Promise<void> {
  return enqueueCatalogMediaLoad(async () => {
    const img = picture.querySelector('img')
    if (!img) return
    if (!img.getAttribute('src') && img.dataset.src) {
      img.setAttribute('src', img.dataset.src)
    }
    await waitForImageElement(img)
  })
}

export function loadCatalogMediaHost(host: HTMLElement): Promise<void> {
  const picture = host.querySelector<HTMLPictureElement>('picture')
  if (picture) return loadPictureElement(picture)
  const img = host.querySelector<HTMLImageElement>('img')
  if (!img) return Promise.resolve()
  return enqueueCatalogMediaLoad(() => waitForImageElement(img))
}

let cardObserver: IntersectionObserver | null = null

export function isCatalogMediaHostVisible(host: HTMLElement): boolean {
  const card = host.closest('.catalogue-new-card')
  if (card instanceof HTMLElement && card.style.display === 'none') return false
  return true
}

function ensureCardObserver(): IntersectionObserver {
  if (cardObserver) return cardObserver
  cardObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        const host = entry.target
        if (!(host instanceof HTMLElement)) return
        if (!isCatalogMediaHostVisible(host)) return
        cardObserver?.unobserve(host)
        void loadCatalogMediaHost(host)
      })
    },
    { root: null, rootMargin: CARD_MEDIA_ROOT_MARGIN, threshold: 0 },
  )
  return cardObserver
}

export function observeCatalogMediaHost(host: HTMLElement): void {
  if (!isCatalogMediaHostVisible(host)) return
  ensureCardObserver().observe(host)
}

export function observeCatalogMediaHosts(root: ParentNode = document): void {
  const selector = '[data-catalog-card-media]'
  const hosts: HTMLElement[] = []
  if (root instanceof HTMLElement && root.matches(selector)) hosts.push(root)
  if (root instanceof Element || root instanceof Document || root instanceof DocumentFragment) {
    root.querySelectorAll<HTMLElement>(selector).forEach((host) => {
      if (!hosts.includes(host)) hosts.push(host)
    })
  }
  hosts.forEach((host) => {
    if (isCatalogMediaHostVisible(host)) observeCatalogMediaHost(host)
  })
}

export function resetCatalogMediaLoadQueueForTests(): void {
  activeCount = 0
  pending.length = 0
  cardObserver?.disconnect()
  cardObserver = null
}
