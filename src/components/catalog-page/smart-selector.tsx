import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import styles from './smart-selector.module.css'
import INPUT_EXAMPLES from './smart-selector-examples.json'
import { getBranchTotal, getNextStepId, getStepNode, QUIZ_STEP_IDS, type QuizAnswers, type QuizStepId } from './smart-selector-tree'

type Tag = { id: string; label: string; query?: string; value?: string }

function buildProfileText(tags: Tag[]): string {
  return tags
    .map((tag) => tag.query || tag.label)
    .join('; ')
}

export function SmartSelector() {
  const [open, setOpen] = useState(false)
  const [currentStepId, setCurrentStepId] = useState<QuizStepId>('step_target')
  const [stepHistory, setStepHistory] = useState<QuizStepId[]>([])
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [quizComplete, setQuizComplete] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [editingTagLabel, setEditingTagLabel] = useState('')
  const [input, setInput] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [inputMultiline, setInputMultiline] = useState(false)
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const tagEditRef = useRef<HTMLInputElement>(null)
  const question = getStepNode(currentStepId, answers)
  const totalSteps = getBranchTotal(answers)
  const stepNumber = Math.min(totalSteps, stepHistory.length + 1)
  const hasProfileInput = tags.length > 0 || Boolean(input.trim())
  const isProfileComplete = quizComplete

  useEffect(() => {
    if (inputFocused || tags.length || input) {
      setAnimatedPlaceholder('')
      return
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimatedPlaceholder(INPUT_EXAMPLES[0])
      return
    }

    let phraseIndex = 0
    let characterIndex = 0
    let deleting = false
    let timeoutId = 0

    const tick = () => {
      const phrase = INPUT_EXAMPLES[phraseIndex]
      characterIndex += deleting ? -1 : 1
      setAnimatedPlaceholder(phrase.slice(0, characterIndex))

      if (!deleting && characterIndex === phrase.length) {
        deleting = true
        timeoutId = window.setTimeout(tick, 1600)
        return
      }
      if (deleting && characterIndex === 0) {
        deleting = false
        phraseIndex = (phraseIndex + 1) % INPUT_EXAMPLES.length
        timeoutId = window.setTimeout(tick, 320)
        return
      }
      timeoutId = window.setTimeout(tick, deleting ? 24 : 48)
    }

    timeoutId = window.setTimeout(tick, 250)
    return () => window.clearTimeout(timeoutId)
  }, [input, inputFocused, tags.length])

  useLayoutEffect(() => {
    const element = inputRef.current
    if (!element) return
    element.style.height = 'auto'
    const contentHeight = element.scrollHeight
    element.style.height = `${Math.min(contentHeight, 96)}px`
    setInputMultiline(contentHeight > 34)
  }, [animatedPlaceholder, input, tags.length])

  useEffect(() => {
    if (!editingTagId) return
    const input = tagEditRef.current
    if (!input) return
    input.focus()
    input.setSelectionRange(input.value.length, input.value.length)
  }, [editingTagId])

  const addFreeTag = () => {
    const label = input.trim().replace(/,+$/, '').trim()
    if (!label) return
    setTags((current) => [...current.filter((tag) => tag.label.toLowerCase() !== label.toLowerCase()), { id: `free-${label}`, label }])
    setInput('')
  }

  const chooseOption = (value: string, label: string, query: string) => {
    const isRoot = currentStepId === 'step_target'
    const nextAnswers = isRoot
      ? { step_target: value }
      : { ...answers, [currentStepId]: value }
    setAnswers(nextAnswers)
    setTags((current) => {
      const freeTags = current.filter((tag) => tag.id.startsWith('free-'))
      const branchTags = isRoot ? [] : current.filter((tag) => !tag.id.startsWith('free-') && tag.id !== currentStepId)
      return [...freeTags, ...branchTags, { id: currentStepId, label, query, value }]
    })
    const nextStepId = getNextStepId(currentStepId, nextAnswers)
    if (nextStepId) {
      setStepHistory((current) => isRoot ? ['step_target'] : [...current, currentStepId])
      setCurrentStepId(nextStepId)
      setQuizComplete(false)
    } else {
      setQuizComplete(true)
    }
    setError('')
  }

  const goBack = () => {
    if (!stepHistory.length) return
    const previousStepId = stepHistory[stepHistory.length - 1]
    const answerIdToRemove = quizComplete ? currentStepId : previousStepId
    setAnswers((current) => {
      const next = { ...current }
      delete next[answerIdToRemove]
      return next
    })
    setTags((current) => current.filter((tag) => tag.id !== answerIdToRemove))
    setCurrentStepId(previousStepId)
    setStepHistory((current) => current.slice(0, -1))
    setQuizComplete(false)
    setError('')
  }

  const clearProfile = () => {
    setTags([])
    setEditingTagId(null)
    setEditingTagLabel('')
    setInput('')
    setCurrentStepId('step_target')
    setStepHistory([])
    setAnswers({})
    setQuizComplete(false)
    setError('')
  }

  const removeTag = (tag: Tag) => {
    if (editingTagId === tag.id) {
      setEditingTagId(null)
      setEditingTagLabel('')
    }
    if (tag.id.startsWith('free-')) {
      setTags((current) => current.filter((item) => item.id !== tag.id))
      return
    }
    const stepId = tag.id as QuizStepId
    const path = [...stepHistory, currentStepId]
    const targetIndex = Math.max(0, path.indexOf(stepId))
    const removedStepIds = new Set(path.slice(targetIndex))
    setTags((current) => current.filter((item) => !removedStepIds.has(item.id as QuizStepId)))
    setAnswers((current) => {
      const next = { ...current }
      removedStepIds.forEach((id) => delete next[id])
      return next
    })
    setCurrentStepId(stepId)
    setStepHistory(path.slice(0, targetIndex))
    setQuizComplete(false)
    setError('')
  }

  const startEditingTag = (tag: Tag) => {
    setEditingTagId(tag.id)
    setEditingTagLabel(`${tag.label} `)
  }

  const saveEditedTag = () => {
    if (!editingTagId) return
    const label = editingTagLabel.trim().replace(/,+$/, '').trim()
    if (label) {
      setTags((current) => current.map((tag) => (
        tag.id === editingTagId ? { ...tag, label, query: label } : tag
      )))
    }
    setEditingTagId(null)
    setEditingTagLabel('')
    setError('')
  }

  const cancelEditingTag = () => {
    setEditingTagId(null)
    setEditingTagLabel('')
  }

  const handleOpenChange = (
    nextOpen: boolean,
    details: { reason: string; cancel: () => void },
  ) => {
    if (!nextOpen && details.reason === 'escape-key' && editingTagId) {
      details.cancel()
      cancelEditingTag()
      return
    }
    setOpen(nextOpen)
  }

  const contactManager = () => {
    clearProfile()
    setOpen(false)
    document.querySelector<HTMLButtonElement>('.catalogue-new-reset')?.click()
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addFreeTag()
    }
  }

  const showPreliminaryResults = async () => {
    const label = input.trim().replace(/,+$/, '').trim()
    const profileTags = label
      ? [...tags.filter((tag) => tag.label.toLowerCase() !== label.toLowerCase()), { id: `free-${label}`, label }]
      : tags
    if (!profileTags.length || isSubmitting) return
    const profileText = buildProfileText(profileTags)
    const quizAnswers = Object.fromEntries(
      profileTags.filter((tag) => QUIZ_STEP_IDS.includes(tag.id as QuizStepId)).map((tag) => [tag.id, tag.value || tag.label]),
    )
    setIsSubmitting(true)
    setError('')
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 25000)
    try {
      const response = await fetch('/api/catalog/smart-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text: profileText }),
        signal: controller.signal,
      })
      const responseText = await response.text()
      let payload: { filters?: Record<string, string[]>; error?: string } = {}
      if (responseText) {
        try {
          payload = JSON.parse(responseText) as typeof payload
        } catch {
          // An upstream proxy can return an empty or non-JSON error page.
        }
      }
      if (!response.ok || !payload.filters) {
        throw new Error(payload.error || 'Сервис подбора временно недоступен. Попробуйте ещё раз.')
      }
      setTags(profileTags)
      setInput('')
      window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', {
        detail: { filters: payload.filters, queryText: profileText, quizAnswers },
      }))
      setOpen(false)
    } catch (submitError) {
      setError(
        submitError instanceof DOMException && submitError.name === 'AbortError'
          ? 'Сервис подбора не ответил. Попробуйте ещё раз.'
          : submitError instanceof Error ? submitError.message : 'Не удалось подобрать фильтры.',
      )
    } finally {
      window.clearTimeout(timeoutId)
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger type="button" className={`catalog-link catalog-hero-download-link ${styles.trigger}`} data-smart-selector-trigger>
        <span>Умный подбор</span>
        <img src="/arrow-hero-catalog.svg" alt="" className="catalog-arrow" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup
          className={`${styles.popup} site-modal-surface`}
          data-smart-selector-dialog
          data-smart-selector-complete={isProfileComplete ? 'true' : 'false'}
        >
          <Dialog.Close className={`${styles.close} site-modal-close`} aria-label="Закрыть умный подбор">×</Dialog.Close>
          <div className={styles.scrollContent} data-smart-selector-scroll-content>
            <p className={styles.eyebrow}>Умный подбор</p>
            <Dialog.Title className={styles.title}>Расскажите, какой матрас вам нужен</Dialog.Title>
            <Dialog.Description className={styles.description}>
              Действуйте как вам комфортно, пишите своими словами и/или выбирайте быстрые ответы.
            </Dialog.Description>

            <div className={`${styles.tagField} ${inputMultiline ? styles.tagFieldMultiline : ''} ${isProfileComplete ? styles.tagFieldComplete : ''}`} data-smart-selector-tags>
            {tags.map((tag) => (
              <span key={tag.id} className={styles.tag} data-smart-selector-tag>
                {editingTagId === tag.id ? (
                  <input
                    ref={tagEditRef}
                    className={styles.tagEdit}
                    value={editingTagLabel}
                    size={Math.max(3, Math.min(editingTagLabel.length, 36))}
                    aria-label={`Редактировать: ${tag.label}`}
                    data-smart-selector-tag-edit
                    onChange={(event) => setEditingTagLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        saveEditedTag()
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        event.stopPropagation()
                        cancelEditingTag()
                      }
                    }}
                  />
                ) : (
                  <button type="button" className={styles.tagLabel} onClick={() => startEditingTag(tag)} aria-label={`Редактировать: ${tag.label}`}>
                    {tag.label}
                  </button>
                )}
                <button
                  type="button"
                  className={styles.tagRemove}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => removeTag(tag)}
                  aria-label={`Удалить: ${tag.label}`}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </span>
            ))}
            <span className={styles.inputShell}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => {
                  setInputFocused(false)
                  addFreeTag()
                }}
                placeholder={inputFocused ? '' : tags.length ? 'Добавить ещё…' : animatedPlaceholder}
                aria-label="Свои пожелания"
                data-smart-selector-input
                data-smart-selector-animated-placeholder
                data-placeholder-example-count={INPUT_EXAMPLES.length}
              />
            </span>
            {hasProfileInput ? (
              <span className={styles.clearAllShell}>
                <button
                  type="button"
                  className={styles.clearAll}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={clearProfile}
                  aria-label="Очистить всё"
                  data-smart-selector-clear-all
                >
                  <span className={styles.clearIcon} aria-hidden="true">×</span>
                </button>
              </span>
            ) : null}
            </div>
            {error ? <p className={styles.error} role="alert" data-smart-selector-error>{error}</p> : null}

            <div className={styles.progressHeader}>
              <span>{`Шаг ${stepNumber} из ${totalSteps}`}</span>
              <div className={styles.dots} aria-label={`Прогресс: ${stepNumber} из ${totalSteps}`}>
                {Array.from({ length: totalSteps }, (_, index) => <span key={index} className={index < stepNumber ? styles.dotActive : styles.dot} />)}
              </div>
            </div>

            <div data-smart-selector-question>
              <h3 className={styles.question}>{question.title}</h3>
              <p className={styles.howToChooseHint} data-smart-selector-how-to-choose>
                <strong>Как выбрать:</strong> {question.howToChoose}
              </p>
              <div className={styles.options}>
                {question.options.map((option) => (
                  <button key={option.value} type="button" className={styles.option} onClick={() => chooseOption(option.value, option.label, option.query)} data-smart-selector-option data-option-value={option.value}>{option.label}</button>
                ))}
              </div>
            </div>

            <div className={styles.footer}>
              <div className={styles.navigation} aria-label="Навигация по вопросам">
                <button type="button" className={styles.stepButton} onClick={goBack} disabled={stepHistory.length === 0}>Назад</button>
                <span className={styles.navigationDivider} aria-hidden="true">|</span>
                <button type="button" className={styles.stepButton} disabled>Вперёд</button>
              </div>
              <span>Ответ можно изменить</span>
            </div>
          </div>
          <div className={styles.submitArea} data-smart-selector-fixed-footer>
            <p className={isProfileComplete ? styles.profileComplete : styles.profileHint} data-smart-selector-profile-status>
              {isProfileComplete
                ? <><span className={styles.profileCompleteCheck} aria-hidden="true" data-smart-selector-complete-check>✓</span><strong>Профиль заполнен</strong> — покажем наиболее точные варианты.</>
                : 'Профиль пока не заполнен. Можем показать предварительные варианты, но для точного подбора ответьте на все вопросы.'}
            </p>
            <button type="button" className={`${styles.quickSubmit} ${isProfileComplete ? styles.quickSubmitComplete : ''}`} onClick={() => void showPreliminaryResults()} disabled={!hasProfileInput || isSubmitting} data-smart-selector-quick-submit>
              {isSubmitting ? 'Подбираем…' : 'Подобрать матрас'}
            </button>
            <p className={styles.aiDisclaimer} data-smart-selector-ai-disclaimer>
              Система работает через ИИ и может ошибаться.{' '}
              <a href="/contacts#contact-form" onClick={contactManager} data-smart-selector-manager-link>
                Свяжитесь с менеджером
              </a>{' '}
              если нужна помощь.
            </p>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
