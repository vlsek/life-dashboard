import { normalizeName } from './muscles'
import type { Exercise, WorkoutEntry } from './types'

// Деревья прогрессии упражнений (BACKLOG 3.3, первый срез). Каждая цепочка — ступени от лёгкой к
// сложной; ступень «пройдена», когда в ОДНОМ подходе набрано не меньше `goal` повторений.
// Ступени сопоставляются с упражнениями пользователя по названию (RU/EN), как и карта мышц —
// колонок в БД под это нет. Только повторения: в подходах `duration` хранится в минутах
// (для бега/кардио), поэтому ступени «на время» (планка) сюда не входят.

export interface ProgressionStep {
  id: string
  ru: string
  en: string
  // Название упражнения подходит, если совпала хотя бы одна подстрока из КАЖДОЙ группы `req`
  // (нормализованное название обёрнуто пробелами: ключ с пробелом в начале — целое слово)
  // и не совпала ни одна подстрока из `not`.
  req: string[][]
  not?: string[]
  goal: number
}

export interface ProgressionChain {
  id: string
  ru: string
  en: string
  steps: ProgressionStep[]
}

const PUSHUP = ['отжиман', 'push-up', 'pushup', 'push up']
const PULLUP = ['подтягива', 'pull-up', 'pullup', 'pull up', 'chin-up', 'chinup']
const WEIGHTED = ['с весом', 'weighted', 'утяж']

export const PROGRESSIONS: ProgressionChain[] = [
  {
    id: 'pushups',
    ru: 'Отжимания',
    en: 'Push-ups',
    steps: [
      { id: 'pushup_knees', ru: 'Отжимания с колен', en: 'Knee push-ups', req: [PUSHUP, ['колен', 'knee']], goal: 15 },
      {
        id: 'pushup_regular',
        ru: 'Обычные отжимания',
        en: 'Regular push-ups',
        req: [PUSHUP],
        not: ['колен', 'knee', 'кулак', 'fist', 'knuckle', 'алмаз', 'diamond', 'лучник', 'archer', 'брусь', 'dips', 'скамь', 'bench', 'стен', 'wall', 'наклонн', 'incline', 'хлопк', 'clap'],
        goal: 30,
      },
      { id: 'pushup_fists', ru: 'Отжимания на кулаках', en: 'Fist push-ups', req: [PUSHUP, ['кулак', 'fist', 'knuckle']], goal: 20 },
      { id: 'pushup_diamond', ru: 'Алмазные отжимания', en: 'Diamond push-ups', req: [PUSHUP, ['алмаз', 'diamond']], goal: 15 },
      { id: 'pushup_archer', ru: 'Отжимания лучника', en: 'Archer push-ups', req: [PUSHUP, ['лучник', 'archer']], goal: 8 },
    ],
  },
  {
    id: 'pullups',
    ru: 'Подтягивания',
    en: 'Pull-ups',
    steps: [
      { id: 'pullup_australian', ru: 'Австралийские подтягивания', en: 'Australian (inverted) rows', req: [['австралийск', 'australian', 'inverted row', 'ring row']], goal: 15 },
      { id: 'pullup_assisted', ru: 'Подтягивания с резинкой', en: 'Assisted pull-ups', req: [PULLUP, ['резинк', 'band', 'assist', 'гравитрон']], goal: 10 },
      {
        id: 'pullup_regular',
        ru: 'Подтягивания',
        en: 'Pull-ups',
        req: [PULLUP],
        not: ['австралийск', 'australian', 'резинк', 'band', 'assist', 'гравитрон', 'широк', 'wide', 'лучник', 'archer', ...WEIGHTED],
        goal: 12,
      },
      { id: 'pullup_wide', ru: 'Подтягивания широким хватом', en: 'Wide-grip pull-ups', req: [PULLUP, ['широк', 'wide']], goal: 8 },
      { id: 'pullup_archer', ru: 'Подтягивания лучника', en: 'Archer pull-ups', req: [PULLUP, ['лучник', 'archer']], goal: 5 },
      { id: 'pullup_weighted', ru: 'Подтягивания с весом', en: 'Weighted pull-ups', req: [PULLUP, WEIGHTED], goal: 8 },
    ],
  },
  {
    id: 'squats',
    ru: 'Приседания и ноги',
    en: 'Squats & legs',
    steps: [
      {
        id: 'squat_regular',
        ru: 'Приседания',
        en: 'Bodyweight squats',
        req: [['присед', 'squat']],
        not: ['выпад', 'lunge', 'болгарск', 'bulgarian', 'split', 'пистолет', 'pistol', 'с весом', 'штанг', 'barbell', 'гантел', 'dumbbell', 'goblet', 'гобле', 'прыж', 'jump', 'weighted'],
        goal: 30,
      },
      { id: 'squat_lunge', ru: 'Выпады', en: 'Lunges', req: [['выпад', 'lunge']], not: ['болгарск', 'bulgarian'], goal: 20 },
      { id: 'squat_bulgarian', ru: 'Болгарские сплит-приседания', en: 'Bulgarian split squats', req: [['болгарск', 'bulgarian', 'split squat']], goal: 15 },
      { id: 'squat_pistol_assisted', ru: 'Пистолетик с опорой', en: 'Assisted pistol squats', req: [['пистолет', 'pistol'], ['опор', 'assist', 'support']], goal: 8 },
      { id: 'squat_pistol', ru: 'Приседания «пистолетик»', en: 'Pistol squats', req: [['пистолет', 'pistol']], not: ['опор', 'assist', 'support'], goal: 5 },
    ],
  },
  {
    id: 'core',
    ru: 'Пресс',
    en: 'Core',
    steps: [
      { id: 'core_crunch', ru: 'Скручивания', en: 'Crunches', req: [['скручиван', 'crunch']], goal: 30 },
      { id: 'core_leg_raise', ru: 'Подъёмы ног лёжа', en: 'Lying leg raises', req: [['подъем ног', 'подъемы ног', 'leg raise']], not: ['вис', 'hang'], goal: 20 },
      { id: 'core_hang_knee', ru: 'Подъёмы коленей в висе', en: 'Hanging knee raises', req: [['вис', 'hang'], ['колен', 'knee']], goal: 15 },
      { id: 'core_hang_leg', ru: 'Подъёмы ног в висе', en: 'Hanging leg raises', req: [['вис', 'hang'], ['ног', 'leg']], not: ['колен', 'knee'], goal: 12 },
    ],
  },
  {
    id: 'dips',
    ru: 'Брусья и трицепс',
    en: 'Dips & triceps',
    steps: [
      { id: 'dips_bench', ru: 'Отжимания от скамьи', en: 'Bench dips', req: [['от скамьи', 'со скамьи', 'bench dip']], goal: 20 },
      { id: 'dips_regular', ru: 'Отжимания на брусьях', en: 'Parallel-bar dips', req: [['брусь', ' dips']], not: ['скамь', 'bench', ...WEIGHTED], goal: 12 },
      { id: 'dips_weighted', ru: 'Брусья с весом', en: 'Weighted dips', req: [['брусь', ' dips'], WEIGHTED], goal: 8 },
    ],
  },
]

export function matchesStep(step: ProgressionStep, exerciseName: string): boolean {
  const n = normalizeName(exerciseName)
  if (!step.req.every((group) => group.some((k) => n.includes(k)))) return false
  return !(step.not ?? []).some((k) => n.includes(k))
}

export type StepStatus = 'done' | 'current' | 'progress' | 'locked'

export interface StepState {
  step: ProgressionStep
  status: StepStatus
  best: number // лучший подход по повторениям среди подходящих упражнений (0, если записей нет)
  exercises: Exercise[] // упражнения пользователя, сопоставленные с этой ступенью
}

// done — цель достигнута в одном подходе; current — первая непройденная ступень цепочки;
// progress — более поздняя непройденная ступень, по которой уже есть записи (пользователь
// «перепрыгнул»); locked — остальные. Пустые подходы и записи из будущего не считаются.
export function chainState(chain: ProgressionChain, exercises: Exercise[], entries: WorkoutEntry[], today: string): StepState[] {
  const states: StepState[] = chain.steps.map((step) => {
    const exs = exercises.filter((ex) => matchesStep(step, ex.name))
    const ids = new Set(exs.map((e) => e.id))
    let best = 0
    for (const e of entries) {
      if (!ids.has(e.exercise_id) || e.date > today) continue
      for (const s of e.sets) if (s.reps != null && s.reps > best) best = s.reps
    }
    return { step, status: 'locked', best, exercises: exs }
  })
  let currentFound = false
  for (const st of states) {
    if (st.best >= st.step.goal) st.status = 'done'
    else if (!currentFound) {
      st.status = 'current'
      currentFound = true
    } else st.status = st.best > 0 ? 'progress' : 'locked'
  }
  return states
}

export function chainDoneCount(states: StepState[]): number {
  return states.filter((s) => s.status === 'done').length
}
