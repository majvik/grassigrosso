import { useEffect, useState, type KeyboardEvent } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import styles from './smart-selector.module.css'
import INPUT_EXAMPLES from './smart-selector-examples.json'

type Question = {
  id: string
  title: string
  options: string[]
}

const QUESTIONS: Question[] = [
  { id: 'sleepers', title: 'Кто будет спать на матрасе?', options: ['Один', 'Двое', 'Взрослый с ребёнком'] },
  { id: 'gender', title: 'Укажите пол', options: ['Мужской', 'Женский', 'Не имеет значения'] },
  { id: 'height', title: 'Какой рост?', options: ['До 170 см', '170–190 см', 'Выше 190 см'] },
  { id: 'weight', title: 'Какой вес?', options: ['До 60 кг', '60–90 кг', '90–120 кг', 'Больше 120 кг'] },
  { id: 'firmness', title: 'Какая жёсткость кажется комфортной?', options: ['Помягче', 'Средняя', 'Пожёстче', 'Не знаю'] },
]

type Tag = { id: string; label: string }

export function SmartSelector() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [tags, setTags] = useState<Tag[]>([])
  const [input, setInput] = useState('')
  const [inputFocused, setInputFocused] = useState(false)
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const question = QUESTIONS[step]
  const hasProfileInput = tags.length > 0 || Boolean(input.trim())
  const answeredQuestionIds = new Set(tags.filter((tag) => QUESTIONS.some((item) => item.id === tag.id)).map((tag) => tag.id))
  const isProfileComplete = answeredQuestionIds.size === QUESTIONS.length

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

  const addFreeTag = () => {
    const label = input.trim().replace(/,+$/, '').trim()
    if (!label) return
    setTags((current) => [...current.filter((tag) => tag.label.toLowerCase() !== label.toLowerCase()), { id: `free-${label}`, label }])
    setInput('')
  }

  const chooseOption = (label: string) => {
    setTags((current) => [...current.filter((tag) => tag.id !== question.id), { id: question.id, label }])
    setStep((current) => Math.min(QUESTIONS.length - 1, current + 1))
    setError('')
  }

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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
    setIsSubmitting(true)
    setError('')
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 25000)
    try {
      const response = await fetch('/api/catalog/smart-select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text: profileTags.map((tag) => tag.label).join('; ') }),
        signal: controller.signal,
      })
      const payload = await response.json() as { filters?: Record<string, string[]>; error?: string }
      if (!response.ok || !payload.filters) throw new Error(payload.error || 'Не удалось подобрать фильтры.')
      setTags(profileTags)
      setInput('')
      window.dispatchEvent(new CustomEvent('catalogue:apply-smart-filters', {
        detail: { filters: payload.filters, queryText: profileTags.map((tag) => tag.label).join('; ') },
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
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger type="button" className={`catalog-link catalog-hero-download-link ${styles.trigger}`} data-smart-selector-trigger>
        <span>Умный подбор</span>
        <img src="/arrow-hero-catalog.svg" alt="" className="catalog-arrow" />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup} data-smart-selector-dialog>
          <Dialog.Close className={styles.close} aria-label="Закрыть умный подбор">×</Dialog.Close>
          <p className={styles.eyebrow}>Умный подбор</p>
          <Dialog.Title className={styles.title}>Расскажите, какой матрас вам нужен</Dialog.Title>
          <Dialog.Description className={styles.description}>
            Пишите своими словами или выберите быстрые ответы ниже.
          </Dialog.Description>

          <div className={styles.tagField} data-smart-selector-tags>
            {tags.map((tag) => (
              <button key={tag.id} type="button" className={styles.tag} onClick={() => setTags((current) => current.filter((item) => item.id !== tag.id))} aria-label={`Удалить: ${tag.label}`}>
                {tag.label}<span aria-hidden="true">×</span>
              </button>
            ))}
            <input
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
          </div>
          {error ? <p className={styles.error} role="alert" data-smart-selector-error>{error}</p> : null}

          <div className={styles.progressHeader}>
            <span>{`Шаг ${step + 1} из ${QUESTIONS.length}`}</span>
            <div className={styles.dots} aria-label={`Прогресс: ${step + 1} из ${QUESTIONS.length}`}>
              {QUESTIONS.map((item, index) => <span key={item.id} className={index <= step ? styles.dotActive : styles.dot} />)}
            </div>
          </div>

          <div data-smart-selector-question>
            <h3 className={styles.question}>{question.title}</h3>
            <div className={styles.options}>
              {question.options.map((option) => (
                <button key={option} type="button" className={styles.option} onClick={() => chooseOption(option)} data-smart-selector-option>{option}</button>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.back} onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Назад</button>
            <span>Ответ можно изменить</span>
          </div>
          <div className={styles.submitArea}>
            <p className={isProfileComplete ? styles.profileComplete : styles.profileHint} data-smart-selector-profile-status>
              {isProfileComplete
                ? 'Профиль заполнен — покажем наиболее точные варианты.'
                : 'Профиль пока не заполнен. Можем показать предварительные варианты, но для точного подбора ответьте на все вопросы.'}
            </p>
            <button type="button" className={styles.quickSubmit} onClick={() => void showPreliminaryResults()} disabled={!hasProfileInput || isSubmitting} data-smart-selector-quick-submit>
              {isSubmitting ? 'Подбираем…' : 'Подобрать матрас'}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
