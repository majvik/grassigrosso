import { useEffect, useState, type KeyboardEvent } from 'react'
import { Dialog } from '@/components/ui/Dialog'
import styles from './smart-selector.module.css'
import INPUT_EXAMPLES from './smart-selector-examples.json'

type Question = {
  id: string
  title: string
  options: string[]
  hint: string
}

const QUESTIONS: Question[] = [
  { id: 'sleepers', title: 'Кто будет спать на матрасе?', options: ['Один', 'Двое', 'Взрослый с ребёнком'], hint: 'Для двоих или сна с ребёнком комфортная ширина начинается от 160 см, а независимые пружины уменьшают колебания, когда партнёр переворачивается.' },
  { id: 'gender', title: 'Укажите пол', options: ['Мужской', 'Женский', 'Не имеет значения'], hint: 'Пол сам по себе не определяет жёсткость матраса — это только дополнительный ориентир, который не заменяет данные о росте и весе.' },
  { id: 'height', title: 'Какой рост?', options: ['До 170 см', '170–190 см', 'Выше 190 см'], hint: 'Длина матраса должна быть минимум на 15–20 см больше роста. При росте от 175 см обычно комфортнее длина 200 см.' },
  { id: 'weight', title: 'Какой вес?', options: ['До 60 кг', '60–90 кг', '90–120 кг', 'Больше 120 кг'], hint: 'Для двоих укажите вес более крупного партнёра: нагрузка считается на одно спальное место, складывать веса не нужно. Мы заложим запас прочности.' },
  { id: 'firmness', title: 'Какая жёсткость кажется комфортной?', options: ['Помягче', 'Средняя', 'Пожёстче', 'Не знаю'], hint: 'Слишком жёсткий матрас не полезнее для спины. Если сомневаетесь, выберите «Не знаю» — предложим универсальную середину и модели с двумя разными сторонами.' },
]

type Tag = { id: string; label: string }

const QUIZ_QUERY_LABELS: Record<string, Record<string, string>> = {
  sleepers: { Один: 'один человек', Двое: 'двое взрослых', 'Взрослый с ребёнком': 'взрослый с ребёнком' },
  gender: { Мужской: 'пол мужской', Женский: 'пол женский', 'Не имеет значения': 'пол не имеет значения' },
  height: { 'До 170 см': 'рост 165 см', '170–190 см': 'рост 180 см', 'Выше 190 см': 'рост выше 190 см' },
  weight: { 'До 60 кг': 'вес 55 кг', '60–90 кг': 'вес 80 кг', '90–120 кг': 'вес 110 кг', 'Больше 120 кг': 'вес 135 кг' },
  firmness: { Помягче: 'хочу помягче', Средняя: 'средняя жёсткость', Пожёстче: 'хочу пожёстче', 'Не знаю': 'не знаю жёсткость' },
}

function buildProfileText(tags: Tag[]): string {
  return tags
    .map((tag) => QUIZ_QUERY_LABELS[tag.id]?.[tag.label] || tag.label)
    .join('; ')
}

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

  const goBack = () => {
    if (step === 0) return
    setTags((current) => {
      const currentQuestionId = QUESTIONS[step]?.id
      const previousQuestionId = QUESTIONS[step - 1]?.id
      const answerIdToRemove = current.some((tag) => tag.id === currentQuestionId)
        ? currentQuestionId
        : previousQuestionId
      return current.filter((tag) => tag.id !== answerIdToRemove)
    })
    setStep((current) => Math.max(0, current - 1))
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
    const profileText = buildProfileText(profileTags)
    const quizAnswers = Object.fromEntries(
      profileTags.filter((tag) => QUESTIONS.some((item) => item.id === tag.id)).map((tag) => [tag.id, tag.label]),
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
      const payload = await response.json() as { filters?: Record<string, string[]>; error?: string }
      if (!response.ok || !payload.filters) throw new Error(payload.error || 'Не удалось подобрать фильтры.')
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
            <p className={styles.howToChooseHint} data-smart-selector-how-to-choose>
              <strong>Как выбрать:</strong> {question.hint}
            </p>
            <div className={styles.options}>
              {question.options.map((option) => (
                <button key={option} type="button" className={styles.option} onClick={() => chooseOption(option)} data-smart-selector-option>{option}</button>
              ))}
            </div>
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.back} onClick={goBack} disabled={step === 0}>Назад</button>
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
