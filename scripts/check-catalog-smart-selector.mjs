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
  await waitFor(evaluate, 'desktop dialog respects viewport margins and keeps actions visible', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const footer = dialog?.querySelector('[data-smart-selector-fixed-footer]')
    if (!dialog || !footer || window.innerWidth <= 600) return false
    const dialogRect = dialog.getBoundingClientRect()
    const footerRect = footer.getBoundingClientRect()
    return dialogRect.top >= 47
      && window.innerHeight - dialogRect.bottom >= 47
      && footerRect.top >= dialogRect.top
      && footerRect.bottom <= dialogRect.bottom
      && getComputedStyle(dialog).overflow === 'hidden'
  })()`)
  await waitFor(evaluate, 'fixed action area spans the dialog and casts an upward fade', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const footer = dialog?.querySelector('[data-smart-selector-fixed-footer]')
    if (!dialog || !footer) return false
    const dialogRect = dialog.getBoundingClientRect()
    const footerRect = footer.getBoundingClientRect()
    const fade = getComputedStyle(footer, '::before')
    return Math.abs(dialogRect.left - footerRect.left) <= 1
      && Math.abs(dialogRect.right - footerRect.right) <= 1
      && Math.abs(dialogRect.bottom - footerRect.bottom) <= 1
      && fade.content !== 'none'
      && fade.backgroundImage.includes('linear-gradient')
  })()`)
  await waitFor(evaluate, 'intro copy has readable contrast', `(() => {
    const description = document.querySelector('[data-smart-selector-dialog] [class*="description"]')
    if (!description) return false
    const styles = getComputedStyle(description)
    return description.textContent.trim() === 'Действуйте как вам комфортно, пишите своими словами и/или выбирайте быстрые ответы.'
      && styles.color === 'rgb(40, 62, 55)'
      && parseFloat(styles.fontSize) >= 16
  })()`)
  await waitFor(evaluate, 'AI disclaimer links to the manager form', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const disclaimer = dialog?.querySelector('[data-smart-selector-ai-disclaimer]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    const link = dialog?.querySelector('[data-smart-selector-manager-link]')
    return Boolean(
      disclaimer?.textContent.includes('Система работает через ИИ и может ошибаться.')
      && link?.textContent.trim() === 'Свяжитесь с менеджером'
      && link?.getAttribute('href') === '/contacts#contact-form'
      && submit?.compareDocumentPosition(disclaimer) & Node.DOCUMENT_POSITION_FOLLOWING
    )
  })()`)
  await evaluate(`(() => {
    window.__managerResetCount = 0
    document.querySelector('.catalogue-new-reset')?.addEventListener('click', () => { window.__managerResetCount += 1 }, { once: true })
    document.addEventListener('click', (event) => {
      if (event.target?.closest?.('[data-smart-selector-manager-link]')) event.preventDefault()
    }, { capture: true, once: true })
    document.querySelector('[data-smart-selector-manager-link]')?.click()
  })()`)
  await waitFor(evaluate, 'manager link closes selector and resets catalogue', `!document.querySelector('[data-smart-selector-dialog]') && window.__managerResetCount === 1`)
  await evaluate(`document.querySelector('[data-smart-selector-trigger]')?.click()`)
  await waitFor(evaluate, 'selector reopens after manager-link check', `Boolean(document.querySelector('[data-smart-selector-dialog]'))`)
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
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'Нужен удобный матрас для высокого человека, который часто спит на боку и иногда просыпается с напряжением в плечах')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await waitFor(evaluate, 'long free text wraps like a message composer', `document.querySelector('[data-smart-selector-input]')?.clientHeight > 30`)
  await waitFor(evaluate, 'question content scrolls without moving the fixed action area', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const content = dialog?.querySelector('[data-smart-selector-scroll-content]')
    const footer = dialog?.querySelector('[data-smart-selector-fixed-footer]')
    if (!dialog || !content || !footer) return false
    const footerTop = footer.getBoundingClientRect().top
    content.scrollTop = content.scrollHeight
    const footerStayedFixed = Math.abs(footer.getBoundingClientRect().top - footerTop) <= 1
      && footer.getBoundingClientRect().bottom <= dialog.getBoundingClientRect().bottom
    content.scrollTop = 0
    return footerStayedFixed
  })()`)
  await waitFor(evaluate, 'growing composer keeps the clear control fixed', `(() => {
    const field = document.querySelector('[data-smart-selector-tags]')
    const clear = document.querySelector('[data-smart-selector-clear-all]')
    if (!field || !clear) return false
    return Math.abs(clear.getBoundingClientRect().top - field.getBoundingClientRect().top - 13) <= 2
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-input]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
  await waitFor(evaluate, 'multiline tag uses left alignment and keeps its close icon at the first line', `(() => {
    const tag = [...document.querySelectorAll('[data-smart-selector-tag]')].find((item) => item.textContent.includes('Нужен удобный матрас'))
    const close = tag?.querySelector('button[aria-label^="Удалить:"]')
    if (!tag || !close || getComputedStyle(tag).textAlign !== 'left' || tag.getBoundingClientRect().height < 40) return false
    return close.getBoundingClientRect().top - tag.getBoundingClientRect().top < 14
  })()`)
  await evaluate(`[...document.querySelectorAll('[data-smart-selector-tag]')].find((item) => item.textContent.includes('Нужен удобный матрас'))?.querySelector('button[aria-label^="Редактировать:"]')?.click()`)
  await waitFor(evaluate, 'tag editing starts with the caret at the end', `(() => {
    const input = document.querySelector('[data-smart-selector-tag-edit]')
    return Boolean(
      input
      && document.activeElement === input
      && input.value.endsWith(' ')
      && input.selectionStart === input.value.length
      && input.selectionEnd === input.value.length
    )
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-tag-edit]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`)
  await waitFor(evaluate, 'Escape cancels tag editing without closing the selector', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const tag = [...document.querySelectorAll('[data-smart-selector-tag]')].find((item) => item.textContent.includes('Нужен удобный матрас'))
    return Boolean(dialog && tag && !tag.querySelector('[data-smart-selector-tag-edit]'))
  })()`)
  await evaluate(`[...document.querySelectorAll('[data-smart-selector-tag]')].find((item) => item.textContent.includes('Нужен удобный матрас'))?.querySelector('button[aria-label^="Редактировать:"]')?.click()`)
  await waitFor(evaluate, 'tag can be reopened after cancelling an edit', `Boolean(document.querySelector('[data-smart-selector-tag-edit]'))`)
  await evaluate(`(() => {
    const input = document.querySelector('[data-smart-selector-tag-edit]')
    if (!input) return false
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Нужен высокий матрас')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    return true
  })()`)
  await waitFor(evaluate, 'edited tag is saved by Enter', `(() => {
    const tag = [...document.querySelectorAll('[data-smart-selector-tag]')].find((item) => item.textContent.includes('Нужен высокий матрас'))
    return Boolean(tag && !tag.querySelector('[data-smart-selector-tag-edit]'))
  })()`)
  await evaluate(`[...document.querySelectorAll('[data-smart-selector-tag]')].find((item) => item.textContent.includes('Нужен высокий матрас'))?.querySelector('button[aria-label^="Удалить:"]')?.click()`)
  await evaluate(`(() => {
    const input = document.querySelector('[data-smart-selector-input]')
    if (!input) return false
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, '')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)

  await evaluate(`(() => {
    const input = document.querySelector('[data-smart-selector-input]')
    if (!input) return false
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'сплю на боку')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await waitFor(evaluate, 'single-line composer is vertically centered inside the field', `(() => {
    const input = document.querySelector('[data-smart-selector-input]')
    const field = document.querySelector('[data-smart-selector-tags]')
    if (!input || !field || input.clientHeight > 32) return false
    const inputRect = input.getBoundingClientRect()
    const fieldRect = field.getBoundingClientRect()
    return Math.abs((inputRect.top + inputRect.height / 2) - (fieldRect.top + fieldRect.height / 2)) <= 2
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-input]')?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`)
  await waitFor(evaluate, 'free text becomes a tag and enables submit', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    return Boolean(dialog?.querySelector('[data-smart-selector-tags]')?.textContent.includes('сплю на боку') && submit && !submit.disabled)
  })()`)

  await waitFor(evaluate, 'clear all control appears inside the field', `Boolean(document.querySelector('[data-smart-selector-tags] [data-smart-selector-clear-all][aria-label="Очистить всё"]'))`)
  await waitFor(evaluate, 'clear control stays fixed at the field top-right', `(() => {
    const button = document.querySelector('[data-smart-selector-clear-all]')
    const shell = button?.parentElement
    const field = button?.closest('[data-smart-selector-tags]')
    if (!button || !shell || !field) return false
    const buttonRect = button.getBoundingClientRect()
    const fieldRect = field.getBoundingClientRect()
    return buttonRect.width <= 32 && Math.abs(fieldRect.right - buttonRect.right - 11) <= 2 && Math.abs(buttonRect.top - fieldRect.top - 13) <= 2
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-clear-all]')?.click()`)
  await waitFor(evaluate, 'clear all resets the complete profile', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const field = dialog?.querySelector('[data-smart-selector-tags]')
    return Boolean(dialog?.textContent.includes('Шаг 1 из 5') && !field?.textContent.includes('сплю на боку') && !dialog.querySelector('[data-smart-selector-clear-all]') && dialog.querySelector('[data-smart-selector-quick-submit]')?.disabled)
  })()`)
  await evaluate(`(() => {
    const input = document.querySelector('[data-smart-selector-input]')
    if (!input) return false
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, 'сплю на боку')
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    return true
  })()`)

  const branchChecks = [
    { value: 'couple', total: 5, title: 'Какой вес у более крупного партнёра?' },
    { value: 'parentWithChild', total: 4, title: 'Как организован совместный сон?' },
    { value: 'childOnly', total: 4, title: 'Для какого возраста и в какую кровать?' },
    { value: 'topper', total: 3, title: 'Какую задачу должен решить тонкий матрас?' },
  ]
  for (const branch of branchChecks) {
    await evaluate(`document.querySelector('[data-option-value="${branch.value}"]')?.click()`)
    await waitFor(evaluate, `${branch.value} branch uses its dynamic total`, `(() => {
      const dialog = document.querySelector('[data-smart-selector-dialog]')
      return Boolean(dialog?.textContent.includes('Шаг 2 из ${branch.total}') && dialog?.textContent.includes(${JSON.stringify(branch.title)}))
    })()`)
    await evaluate(`[...document.querySelectorAll('[data-smart-selector-dialog] button')].find((button) => button.textContent.trim() === 'Назад')?.click()`)
    await waitFor(evaluate, `${branch.value} back returns to root and removes branch chip`, `(() => {
      const dialog = document.querySelector('[data-smart-selector-dialog]')
      return Boolean(dialog?.textContent.includes('Шаг 1 из 5') && dialog?.textContent.includes('Для кого или куда подбираем матрас?') && !dialog.querySelector('[data-smart-selector-tags]')?.textContent.includes(${JSON.stringify(branch.title)}))
    })()`)
  }

  await evaluate(`document.querySelector('[data-option-value="single"]')?.click()`)
  await waitFor(evaluate, 'single branch starts at step 2 of 5', `document.querySelector('[data-smart-selector-dialog]')?.textContent.includes('Шаг 2 из 5')`)
  await evaluate(`window.__smartSelectorHints.push(document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim()); document.querySelector('[data-option-value="side"]')?.click()`)
  await waitFor(evaluate, 'single weight step', `document.querySelector('[data-smart-selector-dialog]')?.textContent.includes('Укажите ваш вес')`)
  await evaluate(`window.__smartSelectorHints.push(document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim()); document.querySelector('[data-option-value="under65"]')?.click()`)
  await waitFor(evaluate, 'single health step', `document.querySelector('[data-smart-selector-dialog]')?.textContent.includes('Что особенно важно учесть?')`)
  await evaluate(`window.__smartSelectorHints.push(document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim()); document.querySelector('[data-option-value="backPain"]')?.click()`)
  await waitFor(evaluate, 'single firmness step', `document.querySelector('[data-smart-selector-dialog]')?.textContent.includes('Шаг 5 из 5')`)
  await evaluate(`window.__smartSelectorHints.push(document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim())`)
  await waitFor(evaluate, 'all single-branch hints are distinct and visible', `(() => {
    const hints = window.__smartSelectorHints.filter(Boolean)
    return hints.length === 5 && new Set(hints).size === 5 && hints.every((hint) => hint.includes('Как выбрать:') && !hint.includes('💡'))
  })()`)
  await evaluate(`document.querySelector('[data-option-value="soft"]')?.click()`)
  await waitFor(evaluate, 'completed quiz profile is recognized', `document.querySelector('[data-smart-selector-profile-status]')?.textContent.includes('Профиль заполнен')`)
  await waitFor(evaluate, 'completed quiz receives persistent completion cues and one-shot glow', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const tags = [...(dialog?.querySelectorAll('[data-smart-selector-tag]') || [])]
    const statusLead = dialog?.querySelector('[data-smart-selector-profile-status] strong')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    const submitStyles = submit ? getComputedStyle(submit) : null
    return Boolean(
      dialog?.dataset.smartSelectorComplete === 'true'
      && tags.length >= 5
      && tags.every((tag) => getComputedStyle(tag).backgroundColor === 'rgb(220, 235, 225)')
      && statusLead?.textContent.trim() === 'Профиль заполнен'
      && submitStyles?.animationName.includes('profileCompleteGlow')
      && submitStyles.animationIterationCount === '1'
    )
  })()`)
  await delay(1200)
  await waitFor(evaluate, 'completion glow disappears after its single impulse', `getComputedStyle(document.querySelector('[data-smart-selector-quick-submit]')).boxShadow === 'none'`)
  await evaluate(`(() => {
    const finalTag = [...document.querySelectorAll('[data-smart-selector-tag]')].at(-1)
    finalTag?.querySelector('button[aria-label^="Удалить:"]')?.click()
  })()`)
  await waitFor(evaluate, 'removing the final answer restores incomplete yellow tags', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const tags = [...(dialog?.querySelectorAll('[data-smart-selector-tag]') || [])]
    return dialog?.dataset.smartSelectorComplete === 'false'
      && tags.length >= 4
      && tags.every((tag) => getComputedStyle(tag).backgroundColor === 'rgb(242, 230, 201)')
  })()`)
  await evaluate(`document.querySelector('[data-option-value="soft"]')?.click()`)
  await waitFor(evaluate, 'quiz can return to completed presentation', `document.querySelector('[data-smart-selector-dialog]')?.dataset.smartSelectorComplete === 'true'`)
  await evaluate(`[...document.querySelectorAll('[data-smart-selector-dialog] button')].find((button) => button.textContent.trim() === 'Назад')?.click()`)
  await waitFor(evaluate, 'going back restores incomplete yellow tags', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const tags = [...(dialog?.querySelectorAll('[data-smart-selector-tag]') || [])]
    return dialog?.dataset.smartSelectorComplete === 'false'
      && tags.length >= 4
      && tags.every((tag) => getComputedStyle(tag).backgroundColor === 'rgb(242, 230, 201)')
  })()`)
  await evaluate(`document.querySelector('[data-option-value="backPain"]')?.click()`)
  await waitFor(evaluate, 'returning through the previous answer reaches the firmness step', `Boolean(document.querySelector('[data-option-value="soft"]'))`)
  await session.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await evaluate(`document.querySelector('[data-option-value="soft"]')?.click()`)
  await waitFor(evaluate, 'reduced motion keeps completion cues without glow animation', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    return dialog?.dataset.smartSelectorComplete === 'true'
      && getComputedStyle(submit).animationName === 'none'
      && Boolean(dialog.querySelector('[data-smart-selector-profile-status] strong'))
  })()`)
  await session.cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] })

  await evaluate(`(() => {
    const originalFetch = window.fetch.bind(window)
    window.__smartSelectorFetchAttempt = 0
    window.addEventListener('catalogue:apply-smart-filters', (event) => { window.__smartSelectorEventDetail = event.detail }, { once: true })
    window.fetch = (input, init) => String(input).includes('/api/catalog/smart-select')
      ? (() => {
          window.__smartSelectorRequest = JSON.parse(init.body)
          window.__smartSelectorFetchAttempt += 1
          if (window.__smartSelectorFetchAttempt === 1) {
            return Promise.resolve(new Response('', { status: 502 }))
          }
          return Promise.resolve(new Response(JSON.stringify({ filters: { firmness: ['soft'], heightRange: ['low'], fillings: ['coir'] } }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        })()
      : originalFetch(input, init)
    return true
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-quick-submit]')?.click()`)
  await waitFor(evaluate, 'empty upstream response shows a friendly error', `(() => {
    const dialog = document.querySelector('[data-smart-selector-dialog]')
    const error = dialog?.querySelector('[data-smart-selector-error]')
    const submit = dialog?.querySelector('[data-smart-selector-quick-submit]')
    return Boolean(
      dialog
      && error?.textContent.includes('Сервис подбора временно недоступен')
      && !error?.textContent.includes('Unexpected end of JSON input')
      && submit
      && !submit.disabled
    )
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
    return text.includes('сплю на боку') && text.includes('один взрослый') && text.includes('вес 55 кг') && text.includes('устаёт поясница') && text.includes('мягче') && answers.step_target === 'single' && answers.single_position === 'side' && answers.single_weight === 'under65' && answers.single_health === 'backPain' && answers.final_firmness === 'soft'
  })()`)

  await evaluate(`document.querySelector('[data-smart-selector-trigger]')?.click()`)
  await waitFor(evaluate, 'selector reopens for adaptive branch smoke', `Boolean(document.querySelector('[data-smart-selector-dialog]'))`)
  await evaluate(`document.querySelector('[data-smart-selector-clear-all]')?.click(); window.__adaptiveHints = []`)
  const adaptiveFlows = [
    ['single', 'side', 'under65', 'standard', 'medium'],
    ['couple', 'under75', 'weightGap', 'mixed', 'dual'],
    ['parentWithChild', 'two', 'under85', 'medium'],
    ['childOnly', 'bunk', 'dual', 'hard'],
    ['topper', 'soften', '140'],
  ]
  for (const [flowIndex, flow] of adaptiveFlows.entries()) {
    for (const value of flow) {
      await waitFor(evaluate, `adaptive flow ${flowIndex + 1} exposes ${value}`, `Boolean(document.querySelector('[data-option-value="${value}"]'))`)
      await evaluate(`(() => {
        window.__adaptiveHints.push(document.querySelector('[data-smart-selector-how-to-choose]')?.textContent.trim())
        document.querySelector('[data-option-value="${value}"]')?.click()
      })()`)
    }
    await waitFor(evaluate, `adaptive flow ${flowIndex + 1} completes`, `document.querySelector('[data-smart-selector-profile-status]')?.textContent.includes('Профиль заполнен')`)
    await evaluate(`document.querySelector('[data-smart-selector-clear-all]')?.click()`)
    await waitFor(evaluate, `adaptive flow ${flowIndex + 1} resets to root`, `(() => {
      const dialog = document.querySelector('[data-smart-selector-dialog]')
      return dialog?.textContent.includes('Шаг 1 из 5') && dialog.dataset.smartSelectorComplete === 'false'
    })()`)
  }
  await waitFor(evaluate, 'all adaptive nodes expose their own how-to-choose hint', `(() => {
    const hints = window.__adaptiveHints.filter(Boolean)
    const combined = hints.join(' ')
    return new Set(hints).size === 14
      && hints.every((hint) => hint.includes('Как выбрать:') && hint.length <= 140)
      && ['90×200', '160×200', 'На боку', 'на животе', 'одно место', '10–16 см', 'стыки', 'две стороны']
        .every((fragment) => combined.includes(fragment))
  })()`)
  await evaluate(`document.querySelector('[data-smart-selector-dialog] button[aria-label="Закрыть умный подбор"]')?.click()`)
  await waitFor(evaluate, 'adaptive smoke dialog closes', `!document.querySelector('[data-smart-selector-dialog]')`)

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
      expression: `(() => {
        const cards = [...document.querySelectorAll('.catalogue-new-card')].slice(0, 4)
        const safeAndSuitable = cards.every((card) => {
        const sizes = String(card.dataset.sizes || '').split(',')
        const sides = [Number(card.dataset.firmnessSide1), Number(card.dataset.firmnessSide2)]
          return sizes.some((size) => /^(160|180)x200$/.test(size)) && Number(card.dataset.load) >= 135 && sides.some((value) => value >= 5 && value <= 7.5)
        })
        return safeAndSuitable && cards.some((card) => Number(card.dataset.firmnessSide1) !== Number(card.dataset.firmnessSide2))
      })()`,
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
    {
      label: 'heavy couple gets safe results when no load-safe dual model exists',
      queryText: 'двое взрослых; вес крупного партнера 135 кг, нагрузка от 160 кг; пара схожей комплекции, ширина 160 или 180 см, независимые пружины; спим в разных позах, Memory Foam или латекс поверх независимых пружин; не знаю жесткость, нужны две стороны разной жесткости 5 и 7',
      quizAnswers: {
        step_target: 'couple',
        couple_weight: 'over120',
        couple_discrepancy: 'similar',
        couple_comfort: 'mixed',
        final_firmness: 'dual',
      },
      expression: `(() => {
        const cards = [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')]
        return cards.length > 0 && cards.every((card) => Number(card.dataset.load) >= 160)
      })()`,
    },
  ]
  for (const scenario of quizScenarios) {
    const filters = applyDomainGuardrails({}, scenario.queryText)
    await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters, queryText: scenario.queryText, quizAnswers: scenario.quizAnswers })} }))`)
    await waitFor(evaluate, scenario.label, scenario.expression)
  }

  const scoringAuditScenarios = [
    {
      label: 'unsafe load never enters the first page',
      queryText: 'вес 180 кг, нужен матрас с Memory Foam и усиленным краем',
      expression: `(() => [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')].every((card) => Number(card.dataset.load) >= 180))()`,
    },
    {
      label: 'hard support excludes numerically soft products from the first page',
      queryText: 'нужна плотная опора жесткостью 7 из 10',
      expression: `(() => [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')].every((card) => {
        const sides = [Number(card.dataset.firmnessSide1), Number(card.dataset.firmnessSide2)].filter(Number.isFinite)
        return sides.length > 0 && Math.max(...sides) >= 6
      }))()`,
    },
    {
      label: 'topper remains a hard construction constraint during relaxation',
      queryText: 'строго тонкий матрас на диван, выровнять стыки',
      expression: `(() => [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')].every((card) => card.dataset.type === 'topper' || card.dataset.collection === 'topper'))()`,
    },
    {
      label: 'explicit dual firmness remains a hard constraint during relaxation',
      queryText: 'строго две стороны разной жесткости 5 и 7',
      expression: `(() => [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')].every((card) => {
        const sides = [Number(card.dataset.firmnessSide1), Number(card.dataset.firmnessSide2)]
        return sides.every(Number.isFinite) && sides[0] !== sides[1]
      }))()`,
    },
  ]
  for (const scenario of scoringAuditScenarios) {
    const filters = applyDomainGuardrails({}, scenario.queryText)
    await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters, queryText: scenario.queryText })} }))`)
    await waitFor(evaluate, scenario.label, scenario.expression)
  }

  const recommendedQueryText = 'вес 80 кг, нужна средняя жесткость 5 из 10'
  const recommendedFilters = applyDomainGuardrails({}, recommendedQueryText)
  await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters: recommendedFilters, queryText: recommendedQueryText })} }))`)
  await waitFor(evaluate, 'recommended products receive a small suitability-aware bonus', `(() => {
    const cards = [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')]
    const topThreeAreSuitable = cards.slice(0, 3).every((card) => {
      const sides = [Number(card.dataset.firmnessSide1), Number(card.dataset.firmnessSide2)].filter(Number.isFinite)
      return Number(card.dataset.load) >= 80 && sides.some((value) => value >= 4 && value <= 6)
    })
    return topThreeAreSuitable && cards.some((card) => card.dataset.recommended === 'true')
  })()`)

  const childFreeText = 'я ребенок; мне 10 лет; нравятся матрасы помягче'
  const childFreeFilters = applyDomainGuardrails({}, childFreeText)
  await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters: childFreeFilters, queryText: childFreeText })} }))`)
  await waitFor(evaluate, 'free child profile returns a focused shortlist', `(() => {
    const selected = [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')]
    const rest = [...document.querySelectorAll('[data-listing-section="all"] .catalogue-new-card')]
    const slugs = [...selected, ...rest].map((card) => card.dataset.productSlug)
    return selected.length === 9
      && rest.length > 0
      && new Set(slugs).size === slugs.length
      && !document.querySelector('[data-listing-section="recommended"] .catalogue-new-section-title')
      && !document.querySelector('[data-listing-section="recommended"] .catalogue-new-section-subtitle')
      && document.querySelector('[data-listing-section="all"] .catalogue-new-section-title')?.textContent.trim() === 'Все позиции'
      && selected.every((card) => ['low', 'mid'].includes(card.dataset.heightRange))
  })()`)
  await waitFor(evaluate, 'smart selection replaces count and default sort copy', `(() => {
    const defaultResult = document.querySelector('[data-catalog-results-default]')
    const smartResult = document.querySelector('[data-catalog-results-smart]')
    const defaultSort = document.querySelector('.catalogue-new-sort-option[data-value="default"]')
    const trigger = document.querySelector('.catalogue-new-sort-trigger')
    return Boolean(
      defaultResult?.hidden
      && !smartResult?.hidden
      && smartResult?.textContent.trim() === 'Результаты подбора'
      && defaultSort?.textContent.trim() === 'Сортировка по соответствию'
      && trigger?.textContent.trim() === 'Сортировка по соответствию'
    )
  })()`)

  const childQuizText = 'матрас для ребёнка или подростка; ширина 140 см; беспружинный матрас из orthoFoam или forplit; умеренно-мягкая без проваливания'
  const childQuizFilters = applyDomainGuardrails({}, childQuizText)
  await evaluate(`window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', { detail: ${JSON.stringify({ filters: childQuizFilters, queryText: childQuizText })} }))`)
  await waitFor(evaluate, 'explicit child construction and width stay mandatory', `(() => {
    const selected = [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')]
    return selected.length === 9 && selected.every((card) => {
      const sizes = String(card.dataset.sizes || '').split(',')
      return card.dataset.type === 'nospring' && sizes.some((size) => size.startsWith('140x'))
    })
  })()`)
  await evaluate(`window.__smartShortlistBeforeSort = [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')].map((card) => card.dataset.productSlug).sort()`)
  await evaluate(`document.querySelector('.catalogue-new-sort-option[data-value="price-asc"]')?.click()`)
  await waitFor(evaluate, 'changing sort preserves the nine smart results', `(() => {
    const selected = [...document.querySelectorAll('[data-listing-section="recommended"] .catalogue-new-card')]
    const remaining = [...document.querySelectorAll('[data-listing-section="all"] .catalogue-new-card')]
    const slugs = selected.map((card) => card.dataset.productSlug).sort()
    const prices = selected.map((card) => Number(card.dataset.price))
    const remainingPrices = remaining.map((card) => Number(card.dataset.price))
    return selected.length === 9
      && JSON.stringify(slugs) === JSON.stringify(window.__smartShortlistBeforeSort)
      && prices.every((price, index) => index === 0 || prices[index - 1] <= price)
      && remainingPrices.every((price, index) => index === 0 || remainingPrices[index - 1] <= price)
  })()`)
  await evaluate(`document.querySelector('.catalogue-new-chip[data-filter-group="collection"][data-value="trend"]')?.click()`)
  await waitFor(evaluate, 'manual filter change leaves smart selection mode', `(() => {
    const defaultResult = document.querySelector('[data-catalog-results-default]')
    const smartResult = document.querySelector('[data-catalog-results-smart]')
    const defaultSort = document.querySelector('.catalogue-new-sort-option[data-value="default"]')
    const trigger = document.querySelector('.catalogue-new-sort-trigger')
    const changedFilter = document.querySelector('.catalogue-new-chip[data-filter-group="collection"][data-value="trend"]')
    return Boolean(
      !defaultResult?.hidden
      && smartResult?.hidden
      && defaultResult?.textContent.includes('Найдено:')
      && defaultSort?.textContent.trim() === 'Сортировка по умолчанию'
      && trigger?.textContent.trim() === 'Сортировка по умолчанию'
      && changedFilter?.classList.contains('is-active')
      && !document.querySelector('[data-listing-section="recommended"] .catalogue-new-section-title')?.textContent.includes('Результаты подбора')
    )
  })()`)
  await evaluate(`document.querySelector('.catalogue-new-reset')?.click()`)
  await waitFor(evaluate, 'reset restores regular count and default sort copy', `(() => {
    const defaultResult = document.querySelector('[data-catalog-results-default]')
    const smartResult = document.querySelector('[data-catalog-results-smart]')
    const defaultSort = document.querySelector('.catalogue-new-sort-option[data-value="default"]')
    const trigger = document.querySelector('.catalogue-new-sort-trigger')
    return Boolean(
      !defaultResult?.hidden
      && smartResult?.hidden
      && defaultResult?.textContent.includes('Найдено:')
      && defaultSort?.textContent.trim() === 'Сортировка по умолчанию'
      && trigger?.textContent.trim() === 'Сортировка по умолчанию'
    )
  })()`)
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
