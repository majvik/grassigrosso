/// <reference types="vite/client" />

declare const __GRASSIGROSSO_SITE_MODE__: 'showcase' | 'commerce'

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}
