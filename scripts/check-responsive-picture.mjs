import fs from 'node:fs'

const failures = []
const helperPath = 'src/media/responsive-media.ts'
const componentPath = 'src/components/ui/ResponsivePicture.tsx'
const catalogGalleryPath = 'src/catalog/catalog-product-gallery.ts'
const helper = fs.existsSync(helperPath) ? fs.readFileSync(helperPath, 'utf8') : ''
const component = fs.existsSync(componentPath) ? fs.readFileSync(componentPath, 'utf8') : ''
const catalogGallery = fs.existsSync(catalogGalleryPath) ? fs.readFileSync(catalogGalleryPath, 'utf8') : ''

function expect(source, token, label) {
  if (!source.includes(token)) failures.push(label)
}

expect(helper, "type: 'image/avif'", 'AVIF source must be present')
expect(helper, "type: 'image/webp'", 'WebP source must be present')
expect(helper, "type: 'image/png'", 'PNG source must be present')
expect(helper, ' 1x', '1x candidate must be present')
expect(helper, ' 2x', '2x candidate must be present')
expect(helper, 'width: slot.width', 'intrinsic width must come from the slot')
expect(helper, 'height: slot.height', 'intrinsic height must come from the slot')
expect(component, '<picture', 'React picture element must be present')
expect(component, 'sizes={sizes}', 'sizes must be forwarded')
expect(component, "fetchPriority={eager ? 'high' : 'auto'}", 'eager media must receive high fetch priority')
expect(component, 'applyResponsivePlaceholder', 'error handler must replace the complete responsive source set')
expect(component, 'applyResponsiveOriginalFallback', 'React pictures must try the original CMS asset before the placeholder')
expect(helper, 'installResponsiveMediaFallbacks', 'legacy responsive pictures need a fallback installer')
expect(helper, 'data-original-src', 'legacy pictures must retain the original CMS asset for first-error recovery')
expect(helper, "image.dataset.originalFallbackApplied === 'true'", 'fallback handler must distinguish original recovery from placeholder recovery')
expect(helper, 'image.complete && image.naturalWidth === 0', 'fallback installer must recover images that failed before JavaScript initialized')
expect(helper, 'buildResponsiveMediaSet(src, slotId, !src)', 'empty responsive pictures must render the slot placeholder immediately')
expect(catalogGallery, 'EMPTY_CATALOG_MEDIA', 'catalog cards need an explicit empty-media placeholder item')
expect(catalogGallery, 'gallery.length ? gallery : [EMPTY_CATALOG_MEDIA]', 'empty catalog galleries must render a placeholder slide')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('check:responsive-picture ok')
