#!/usr/bin/env node
import { createRequire } from 'node:module'
import { cleanupChromeSession, delay, startCatalogChromeSession } from './lib/catalog-chrome-session.mjs'

const require = createRequire(import.meta.url)
const { applyDomainGuardrails } = require('../lib/catalog-smart-select.cjs')

const baseUrl = String(process.env.CATALOG_UI_BASE_URL || 'http://127.0.0.1:5174').replace(/\/+$/, '')
const failures = []
let session

async function waitFor(evaluate, label, expression, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await evaluate(expression)
    if (value) return value
    await delay(150)
  }
  failures.push(`${label}: timed out`)
  return false
}

try {
  session = await startCatalogChromeSession(baseUrl)
  const evaluate = (expression, timeoutMs) => session.cdp.evaluate(expression, timeoutMs)

  await waitFor(evaluate, 'smart selector trigger', `Boolean(document.querySelector('[data-smart-selector-trigger]'))`)
  await evaluate(`document.querySelector('[data-smart-selector-trigger]')?.click()`)
  await waitFor(evaluate, 'dialog opens at step 1 of 5', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    const status = dialog?.querySelector('[data-smart-selector-profile-status]')
    return Boolean(dialog && dialog.textContent.includes('Шаг 1 из 5') && dialog.querySelectorAll('[data-smart-selector-question]').length === 1 && submit?.disabled && submit.textContent.includes('Подобрать матрас') && status?.textContent.includes('Профиль пока не заполнен'))
  })()`)
  await evaluate(`window.__smartSelectorHints = [document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim()]`)

  await waitFor(evaluate, 'input example is typed into the placeholder', `(() => {
    const input = document.querySelector('[data-smart-selector-animated-placeholder]')
    return Boolean(input?.placeholder.startsWith('Например:') && input.placeholder.length > 12 && Number(input.dataset.placeholderExampleCount) >= 25)
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-animated-placeholder]')?.focus()`)
  await waitFor(evaluate, 'animated placeholder clears on focus', `document.querySelector('[data-smart-selector-animated-placeholder]')?.placeholder === ''`)

  await evaluate(`(() => {
    const input = document.querySelector('[data-smart-selector-input]')
    if (!input) return false
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'сплю на боку')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    return true
  })()`)
  await waitFor(evaluate, 'free text becomes a tag and enables submit', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    return Boolean(dialog?.querySelector('[data-smart-selector-tags]')?.textContent.includes('сплю на боку') && submit && !submit.disabled)
  })()`)

  await evaluate(`document.querySelector('[data-smart-selector-option]')?.click()`)
  await waitFor(evaluate, 'option becomes a tag and advances', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    return Boolean(dialog?.textContent.includes('Шаг 2 из 5') && dialog.querySelector('[data-smart-selector-tags]')?.textContent.includes('Один'))
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-dialog] button') && [...document.querySelectorAll('[data-smart-selector-dialog] button')].find((button) => button.textContent.trim() === 'Назад')?.click()`)
  await waitFor(evaluate, 'back removes the answer tag from the step being undone', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    return Boolean(dialog?.textContent.includes('Шаг 1 из 5') && !dialog.querySelector('[data-smart-selector-tags]')?.textContent.includes('Один'))
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-option]')?.click()`)
  await waitFor(evaluate, 'quiz can answer the cleared step again', `document.querySelector('[data-smart-selector-dialog]')?.textContent.includes('Шаг 2 из 5')`)

  for (let targetStep = 3; targetStep <= 5; targetStep += 1) {
    await evaluate(`(() => {
      window.__smartSelectorHints.push(document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim())
      document.querySelector('[data-smart-selector-option]')?.click()
    })()`)
    await waitFor(evaluate, `quiz advances to step ${targetStep}`, `document.querySelector('[data-smart-selector-dialog]')?.textContent.includes('Шаг ${targetStep} из 5')`)
  }
  await evaluate(`window.__smartSelectorHints.push(document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim())`)
  await waitFor(evaluate, 'all five how-to-choose hints are distinct and visible', `(() => {
    const hints = window.__smartSelectorHints.filter(Boolean)
    return hints.length === 5 && new Set(hints).size === 5 && hints.every((hint) => hint.includes('Как выбрать:') && !hint.includes('💡'))
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-option]')?.click()`)
  await waitFor(evaluate, 'completed quiz profile is recognized', `document.querySelector('[data-smart-selector-profile-status]')?.textContent.includes('Профиль заполнен')`)

  await evaluate(`(() => {
    const originalFetch = window.fetch.bind(window)
    window.addEventListener('catalogue:apply-smart-filters', (event) => { window.__smartSelectorEventDetail = event.detail }, { once: true })
    window.fetch = (input, init) => String(input).includes('/api/catalog/smart-select')
      ? (() => {
          window.__smartSelectorRequest = JSON.parse(init.body)
          return Promise.resolve(new Response(JSON.stringify({ filters: { firmness: ['soft'], heightRange: ['low'], fillings: ['coir'] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        })()
      : originalFetch(input, init)
    return true
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-quick-submit]')?.click()`)
  await waitFor(evaluate, 'conflicting smart filters relax to nearest matching products', `(() => {
    const dialogClosed = !document.querySelector('[data-smart-selector-dialog]')
    const medium = document.querySelector('.catalogue-new-chip[data-filter-group="firmness"][data-value="medium"]')
    const soft = document.querySelector('.catalogue-new-chip[data-filter-group="firmness"][data-value="soft"]')
    const resultCount = Number(document.querySelector('.catalogue-new-results strong')?.textContent || 0)
    const emptyState = document.querySelector('.catalogue-new-empty-state')
    const firstCard = document.querySelector('.catalogue-new-card')
    const fillings = String(firstCard?.dataset.fillings || '').split(',')
    return Boolean(dialogClosed && medium?.classList.contains('is-active') && !soft?.classList.contains('is-active') && resultCount > 6 && emptyState?.hidden && firstCard?.dataset.type !== 'topper' && fillings.some((value) => ['memoryEffect', 'latex', 'nanoFoam', 'orthoFoam'].includes(value)))
  })()`)
  await waitFor(evaluate, 'quiz and free text merge into one structured scoring profile', `(() => {
    const text = String(window.__smartSelectorRequest?.text || '')
    const answers = window.__smartSelectorEventDetail?.quizAnswers || {}
    return text.includes('сплю на боку') && text.includes('один человек') && text.includes('пол мужской') && text.includes('рост 165 см') && text.includes('вес 55 кг') && text.includes('хочу помягче') && Object.keys(answers).length === 5
  })()`)

  const directSearchScenarios = [
    { label: 'direct model search evolution', queryText: 'матрас эволюшен', topSlug: 'evolution' },
    { label: 'direct model search relax plus', queryText: 'релакс плюс', topSlug: 'relax-plus' },
    { label: 'layer search bicotton and elax', queryText: 'матрас с бикоттоном и элаксом', topSlug: 'evolution' },
  ]
  for (const scenario of directSearchScenarios) {
    await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters: {}, queryText: scenario.queryText })} }))`)
    await waitFor(evaluate, scenario.label, `document.querySelector('.catalogue-new-card')?.dataset.productSlug === ${JSON.stringify(scenario.topSlug)}`)
  }
  await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: { filters: {}, queryText: '1000 пружин' } }))`)
  await waitFor(evaluate, '1000 springs layer search', `(() => [...document.querySelectorAll('.catalogue-new-card')].slice(0, 3).every((card) => /1000\\s+пружин/i.test(card.dataset.layersCatalog || '')))()`)

  const scenarios = [
    {
      label: 'heavy side sleeper prioritizes safe load, comfort layers, edge and height',
      queryText: 'Вешу 105 кг, сплю на боку',
      expression: `(() => [...document.querySelectorAll('.catalogue-new-card')].slice(0, 3).every((card) => {
        const fillings = String(card.dataset.fillings || '').split(',')
        const features = String(card.dataset.features || '').split(',')
        return Number(card.dataset.load) >= 105 && ['mid', 'high'].includes(card.dataset.heightRange) && features.includes('edgeSupport') && fillings.some((value) => ['memoryEffect', 'latex', 'nanoFoam', 'orthoFoam'].includes(value))
      }))()`,
    },
    {
      label: 'mother with child prioritizes available hygiene-adjacent support',
      queryText: 'молодая мама, сплю с ребёнком',
      expression: `(() => {
        const allCards = [...document.querySelectorAll('.catalogue-new-card')]
        const catalogHasRemovableCover = allCards.some((card) => String(card.dataset.features || '').split(',').includes('removableCover'))
        return !catalogHasRemovableCover && allCards.slice(0, 3).every((card) => {
          const fillings = String(card.dataset.fillings || '').split(',')
          const features = String(card.dataset.features || '').split(',')
          return features.includes('edgeSupport') && fillings.some((value) => ['orthoFoam', 'coir', 'forplit'].includes(value))
        })
      })()`,
    },
    {
      label: 'back pain prioritizes relax comfort models',
      queryText: 'болит поясница после сна',
      expression: `(() => [...document.querySelectorAll('.catalogue-new-card')].slice(0, 3).every((card) => {
        const fillings = String(card.dataset.fillings || '').split(',')
        const firmnessScores = [Number(card.dataset.firmnessSide1), Number(card.dataset.firmnessSide2)]
        return card.dataset.collection === 'relax' && ['mid', 'high'].includes(card.dataset.heightRange) && fillings.some((value) => ['memoryEffect', 'latex', 'orthoFoam'].includes(value)) && firmnessScores.some((value) => value >= 5 && value <= 6)
      }))()`,
    },
  ]

  for (const scenario of scenarios) {
    const filters = applyDomainGuardrails({}, scenario.queryText)
    await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters, queryText: scenario.queryText })} }))`)
    await waitFor(evaluate, scenario.label, scenario.expression)
  }

  const quizScenarios = [
    {
      label: 'couple tall heavy unknown firmness quiz profile',
      queryText: 'двое взрослых; рост выше 190 см; вес 110 кг; не знаю жесткость',
      quizAnswers: { sleepers: 'Двое', height: 'Выше 190 см', weight: '90–120 кг', firmness: 'Не знаю' },
      expression: `(() => [...document.querySelectorAll('.catalogue-new-card')].slice(0, 4).every((card) => {
        const sizes = String(card.dataset.sizes || '').split(',')
        const features = String(card.dataset.features || '').split(',')
        const sides = [Number(card.dataset.firmnessSide1), Number(card.dataset.firmnessSide2)]
        return sizes.some((size) => /^(160|180)x200$/.test(size)) && Number(card.dataset.load) >= 135 && card.dataset.type === 'spring' && features.includes('edgeSupport') && features.includes('dualFirmness') && sides[0] !== sides[1]
      }))()`,
    },
    {
      label: 'single light soft quiz profile',
      queryText: 'один человек; вес 55 кг; хочу помягче',
      quizAnswers: { sleepers: 'Один', weight: 'До 60 кг', firmness: 'Помягче' },
      expression: `(() => [...document.querySelectorAll('.catalogue-new-card')].slice(0, 3).every((card) => {
        const fillings = String(card.dataset.fillings || '').split(',')
        const sides = [Number(card.dataset.firmnessSide1), Number(card.dataset.firmnessSide2)]
        const hasNakedCoir = fillings.includes('coir') && !fillings.some((value) => ['memoryEffect', 'latex', 'nanoFoam', 'orthoFoam'].includes(value))
        return Math.min(...sides) <= 5 && !hasNakedCoir && fillings.some((value) => ['memoryEffect', 'latex', 'nanoFoam', 'orthoFoam'].includes(value))
      }))()`,
    },
  ]
  for (const scenario of quizScenarios) {
    const filters = applyDomainGuardrails({}, scenario.queryText)
    await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters, queryText: scenario.queryText, quizAnswers: scenario.quizAnswers })} }))`)
    await waitFor(evaluate, scenario.label, scenario.expression)
  }
} catch (error) {
  failures.push(error.message)
} finally {
  if (session) cleanupChromeSession({ ...session, onCleanup: () => session.cdp.failPending('Smart selector smoke ended') })
}

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'))
  process.exit(1)
}

console.log(`Catalog smart selector ok: ${baseUrl}/catalog`)
