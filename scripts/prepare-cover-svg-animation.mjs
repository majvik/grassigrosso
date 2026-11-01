#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const [, , inputArg, outputArg = inputArg] = process.argv

if (!inputArg) {
  console.error('Usage: node scripts/prepare-cover-svg-animation.mjs <input.svg> [output.svg]')
  process.exit(1)
}

const input = path.resolve(inputArg)
const output = path.resolve(outputArg)
let source = fs.readFileSync(input, 'utf8')

const maskedGroupPattern = /<g mask="url\(#[^)]+\)">([\s\S]*?)<\/g>/
const maskedGroup = source.match(maskedGroupPattern)

if (!maskedGroup) {
  throw new Error('Cover SVG must contain a masked text group')
}

const letterCount = (maskedGroup[1].match(/<path\b/g) || []).length
let letterIndex = 0
const animatedLetters = maskedGroup[1].replace(/<path\b/g, () => {
  // Figma exports outlined glyphs in reverse visual order, so invert the delay.
  const visualIndex = letterCount - letterIndex - 1
  const delay = 160 + (visualIndex * 65)
  letterIndex += 1
  return `<path class="cover-title-letter" style="animation-delay:${delay}ms"`
})

if (letterIndex < 2) {
  throw new Error('Cover title must be exported as separate path elements, one path per letter')
}

const animationStyles = `<style>
  .cover-title-letter {
    animation: cover-title-letter-slide-up 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
    will-change: transform;
  }
  @keyframes cover-title-letter-slide-up {
    from { transform: translateY(240px); }
    to { transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .cover-title-letter { animation: none; transform: none; }
  }
</style>`

source = source.replace(/<style>[\s\S]*?cover-title[\s\S]*?<\/style>\s*/, '')
source = source.replace(/(<svg\b[^>]*>)/, `$1\n${animationStyles}`)
source = source.replace(maskedGroupPattern, (full) => full.replace(maskedGroup[1], animatedLetters))

fs.writeFileSync(output, source)
console.log(`Prepared ${letterIndex} animated cover letters: ${path.relative(process.cwd(), output)}`)
