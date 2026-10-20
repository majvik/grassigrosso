export type QuizStepId =
  | 'step_target'
  | 'single_position'
  | 'single_weight'
  | 'single_health'
  | 'couple_weight'
  | 'couple_discrepancy'
  | 'couple_comfort'
  | 'parent_child_mode'
  | 'parent_child_weight'
  | 'child_age_bed'
  | 'child_material'
  | 'topper_goal'
  | 'topper_size'
  | 'final_firmness'

export type QuizAnswers = Partial<Record<QuizStepId, string>>

export type QuizOption = {
  value: string
  label: string
  query: string
}

export type QuizStepNode = {
  id: QuizStepId
  title: string
  howToChoose: string
  options: QuizOption[]
}

const option = (value: string, label: string, query: string): QuizOption => ({ value, label, query })

export const QUIZ_STEPS: Record<QuizStepId, QuizStepNode> = {
  step_target: {
    id: 'step_target', title: 'Для кого или куда подбираем матрас?',
    howToChoose: 'Размер сверяйте по внутренней нише кровати: одному обычно хватает 90×200, паре — 160×200.',
    options: [
      option('single', 'Один взрослый', 'один взрослый'),
      option('couple', 'Пара', 'двое взрослых, двуспальный матрас шириной 160 или 180 см'),
      option('parentWithChild', 'Взрослый с ребёнком', 'взрослый с ребёнком, ширина 160 или 180 см'),
      option('childOnly', 'Ребёнку или подростку', 'матрас для ребёнка или подростка'),
      option('topper', 'Тонкий матрас на диван', 'тонкий топпер на диван'),
    ],
  },
  single_position: {
    id: 'single_position', title: 'В какой позе вы чаще всего засыпаете?',
    howToChoose: 'На боку выбирайте мягче, на спине — мягкий или средний уровень, на животе — средний.',
    options: [
      option('side', 'На боку', 'сплю на боку, нужен мягкий верх под плечо, Memory Foam или латекс'),
      option('back', 'На спине', 'сплю на спине, нужна сбалансированная поддержка жесткостью 5–6'),
      option('stomach', 'На животе', 'сплю на животе, нужна плотная поддержка жесткостью 6–7'),
      option('mixed', 'Ворочаюсь / по-разному', 'сплю по-разному: на боку и на спине'),
    ],
  },
  single_weight: {
    id: 'single_weight', title: 'Укажите ваш вес',
    howToChoose: 'Нагрузка считается на одно место; запас по нагрузке продлевает срок службы матраса.',
    options: [
      option('under65', 'До 65 кг', 'вес 55 кг, можно немного мягче'),
      option('65to90', '65–90 кг', 'вес 80 кг'),
      option('90to120', '90–120 кг', 'вес 110 кг, нагрузка от 135 кг, усиленный край'),
      option('over120', 'Больше 120 кг', 'вес 135 кг, нагрузка от 160 кг, средний или высокий матрас с усиленным краем'),
    ],
  },
  single_health: {
    id: 'single_health', title: 'Что особенно важно учесть?',
    howToChoose: 'Матрас не лечит спину: при диагнозе советуйтесь с врачом, а размер сверяйте с кроватью.',
    options: [
      option('backPain', 'Устаёт поясница или чувствительные суставы', 'устаёт поясница или чувствительные суставы, нужна Memory Foam, латекс или elax, жесткость 5–6'),
      option('tall', 'Высокий рост (от 180 см) — нужна длина 200 см', 'высокий рост от 180 см, строго длина 200 см'),
      option('tallBackPain', 'И высокий рост, и устаёт спина', 'высокий рост от 180 см, длина 200 см, устаёт поясница, нужна адаптивная пена'),
      option('athletic', 'Спортивное телосложение', 'высокий спортсмен, длина 200 см, две стороны жесткости 5 и 7, ортопедическая пена'),
      option('standard', 'Нет особых требований', 'без особых требований'),
    ],
  },
  couple_weight: {
    id: 'couple_weight', title: 'Какой вес у более крупного партнёра?',
    howToChoose: 'Нагрузка указана на одно место, поэтому ориентируйтесь на вес более тяжёлого партнёра.',
    options: [
      option('under75', 'Оба легче 75 кг', 'двое взрослых, вес крупного партнера 70 кг'),
      option('under95', 'До 95 кг', 'двое взрослых, вес крупного партнера 85 кг, нагрузка от 120 кг'),
      option('95to120', '95–120 кг', 'двое взрослых, вес крупного партнера 110 кг, нагрузка от 135 кг'),
      option('over120', 'Больше 120 кг', 'двое взрослых, вес крупного партнера 135 кг, нагрузка от 160 кг'),
    ],
  },
  couple_discrepancy: {
    id: 'couple_discrepancy', title: 'Есть ли разница в весе и чуткий ли сон?',
    howToChoose: 'Беспружинный матрас не передаёт движения, а независимые пружины убирают эффект гамака.',
    options: [
      option('weightGap', 'Разница в весе больше 20 кг (важно не скатываться)', 'разница в весе больше 20 кг, 1000 независимых пружин, две стороны жесткости'),
      option('lightSleep', 'Вес близкий, но сон чуткий (не чувствовать движений)', 'чуткий сон, не чувствовать движений, 1000 независимых пружин, Memory Foam или elax'),
      option('edge', 'Нужна максимальная полезная площадь и крепкий край', 'ширина 180 см, усиленный край и максимальная полезная площадь'),
      option('similar', 'Спим спокойно, комплекция схожая', 'пара схожей комплекции, ширина 160 или 180 см, независимые пружины'),
    ],
  },
  couple_comfort: {
    id: 'couple_comfort', title: 'Как вы чаще спите и что важно учесть?',
    howToChoose: 'На боку выбирайте мягче; Memory расслабляет, а латекс мягко погружает и быстро возвращает форму.',
    options: [
      option('side', 'Чаще на боку — нужен мягкий комфорт для плеч', 'спим чаще на боку, нужен мягкий комфорт для плеч и адаптивные пены'),
      option('backPain', 'У одного из нас устаёт поясница после сна', 'спим на спине, у одного устаёт поясница, нужна адаптивная поддержка'),
      option('tall', 'Высокий рост (от 180 см) — нужна длина 200 см', 'высокий рост от 180 см, строго длина 200 см'),
      option('mixed', 'Спим по-разному, без особых проблем', 'спим в разных позах, Memory Foam или латекс поверх независимых пружин'),
    ],
  },
  parent_child_mode: {
    id: 'parent_child_mode', title: 'Как организован совместный сон?',
    howToChoose: 'Для пары стандарт — 160×200; если часто сидите на краю, выбирайте усиленный периметр.',
    options: [
      option('two', 'Спим вдвоём (взрослый и ребёнок)', 'взрослый с ребёнком, ширина 160 или 180 см, усиленный край'),
      option('three', 'Спим втроём (двое взрослых и ребёнок)', 'двое взрослых с ребенком, ширина 180 см, усиленный край, независимые пружины'),
      option('sometimes', 'Ребёнок прибегает под утро, часто сидим на краю', 'ребенок иногда спит со взрослым, максимально усиленный край и съемный чехол'),
    ],
  },
  parent_child_weight: {
    id: 'parent_child_weight', title: 'Вес самого крупного взрослого и рост',
    howToChoose: 'Считайте нагрузку по взрослому; при большом весе нужен запас и усиленный периметр.',
    options: [
      option('under85', 'До 85 кг, обычный рост', 'вес взрослого 80 кг, средне-упругая поверхность не мягче 5'),
      option('85to110', '85–110 кг', 'вес взрослого 100 кг, нагрузка от 135 кг, средне-упругая поверхность не мягче 5'),
      option('heavyOrTall', 'Свыше 110 кг или рост от 180 см', 'вес взрослого 120 кг или высокий рост, длина 200 см, нагрузка от 160 кг, не мягче 5'),
    ],
  },
  child_age_bed: {
    id: 'child_age_bed', title: 'Для какого возраста и в какую кровать?',
    howToChoose: 'Для кровати с бортиками обычно нужна высота 10–16 см; предел уточняйте у производителя.',
    options: [
      option('bunk', 'Кровать с бортиками или двухъярусная (нужен невысокий)', 'детская кровать с бортиками или второй ярус, низкий матрас до 16 см, жесткость 6–7'),
      option('school', 'Обычная кровать для школьника / подростка', 'матрас школьнику или подростку, ширина 140 см, низкий или средний, жесткость 5–7'),
      option('tallTeen', 'Высокий подросток или занимается спортом (на вырост)', 'высокий подросток или спортсмен, длина 200 см, упругая опора 5–7 или две стороны'),
    ],
  },
  child_material: {
    id: 'child_material', title: 'Какая конструкция вам ближе?',
    howToChoose: 'Койра делает матрас плотнее, пены дают больше анатомичности, а две стороны оставляют выбор.',
    options: [
      option('foam', 'Беспружинный из упругих пен', 'беспружинный матрас из orthoFoam или forplit'),
      option('coir', 'С кокосовой койрой (поплотнее)', 'кокосовая койра, жесткость 6–7'),
      option('spring', 'На независимых пружинах', 'независимые пружины и усиленный край'),
      option('dual', 'Двусторонний (разная жёсткость на вырост)', 'две стороны разной жесткости 5 и 7'),
    ],
  },
  topper_goal: {
    id: 'topper_goal', title: 'Какую задачу должен решить тонкий матрас?',
    howToChoose: 'Топпер меняет комфорт матраса и выравнивает стыки или износ раскладного дивана.',
    options: [
      option('soften', 'Смягчить жёсткий диван или матрас', 'топпер на диван, смягчить жесткую поверхность, жесткость 3–5, Memory Foam или латекс'),
      option('level', 'Выровнять стыки и неровности дивана', 'топпер выровнять стыки дивана, жесткость 5–7, ортопедическая пена, кокос или forplit'),
      option('firm', 'Сделать спальное место поплотнее', 'топпер сделать поверхность плотнее, жесткость 6–8, кокос или ортопедическая пена'),
    ],
  },
  topper_size: {
    id: 'topper_size', title: 'Какой размер дивана и вес спящего?',
    howToChoose: 'Размер топпера должен совпадать со спальным местом; измеряйте поверхность, а не внешний габарит.',
    options: [
      option('140', 'Ширина 140 см, стандартная нагрузка', 'топпер размера 140x190 или 140x200'),
      option('160', 'Ширина 160 см, стандартная нагрузка', 'топпер размера 160x190 или 160x200'),
      option('180heavy', 'Ширина 180 см или вес выше 100 кг', 'плотный топпер 180x200 или 160x200, вес выше 100 кг'),
      option('all', 'Показать все подходящие топперы', 'показать все подходящие топперы'),
    ],
  },
  final_firmness: {
    id: 'final_firmness', title: 'Какое ощущение жёсткости вам ближе?',
    howToChoose: 'На боку лучше мягче, на животе — средний уровень; если сомневаетесь, выбирайте две стороны.',
    options: [
      option('soft', 'Мягче и деликатнее', 'хочу мягче и деликатнее'),
      option('medium', 'Упругая середина (баланс)', 'нужна средняя жесткость, упругий баланс'),
      option('hard', 'Плотнее и собраннее (пожёстче)', 'хочу плотнее и пожестче'),
      option('dual', 'Две разные стороны / Не знаю', 'не знаю жесткость, нужны две стороны разной жесткости 5 и 7'),
    ],
  },
}

export function getNextStepId(currentStepId: QuizStepId, answers: QuizAnswers): QuizStepId | null {
  if (currentStepId === 'step_target') {
    return ({ single: 'single_position', couple: 'couple_weight', parentWithChild: 'parent_child_mode', childOnly: 'child_age_bed', topper: 'topper_goal' } as Record<string, QuizStepId>)[answers.step_target || ''] || null
  }
  const transitions: Partial<Record<QuizStepId, QuizStepId>> = {
    single_position: 'single_weight', single_weight: 'single_health', single_health: 'final_firmness',
    couple_weight: 'couple_discrepancy', couple_discrepancy: 'couple_comfort', couple_comfort: 'final_firmness',
    parent_child_mode: 'parent_child_weight', parent_child_weight: 'final_firmness',
    child_age_bed: 'child_material', child_material: 'final_firmness',
    topper_goal: 'topper_size',
  }
  return transitions[currentStepId] || null
}

export function getBranchTotal(answers: QuizAnswers): number {
  if (answers.step_target === 'topper') return 3
  if (answers.step_target === 'parentWithChild' || answers.step_target === 'childOnly') return 4
  return 5
}

export function getStepNode(id: QuizStepId, answers: QuizAnswers): QuizStepNode {
  const node = QUIZ_STEPS[id]
  if (id !== 'final_firmness' || (answers.step_target !== 'childOnly' && answers.step_target !== 'parentWithChild')) return node
  return {
    ...node,
    options: node.options.map((item) => item.value === 'soft' ? { ...item, label: 'Умеренно-мягкая без проваливания', query: 'умеренно-мягкая без проваливания, жесткость не ниже 5' } : item),
  }
}

export const QUIZ_STEP_IDS = Object.keys(QUIZ_STEPS) as QuizStepId[]
