import { t } from './i18n'
import type { Exercise } from './types'

// Единица веса в Workouts (BACKLOG 18: «просто повторения не должны запрашивать вес и единицу» +
// «единица веса: по умолчанию кг + карандашик для смены»).
//
// Раньше форма упражнения всегда предзаполняла «Единицу веса» значением «кг» и сохраняла его даже для упражнений
// БЕЗ веса, а formatSets/рекорд/график дописывали exercise.unit после повторений: «добавляю отжимания просто раз,
// а в итоге пишет кг» → «10 кг». Теперь: у упражнений без веса единица веса не спрашивается и не пишется, а уже
// сохранённая «кг/lb/…» у них не показывается; у упражнений с весом единица по умолчанию «кг» (или последняя
// выбранная человеком — запоминается), сменить её можно карандашиком в форме.

export const WEIGHT_UNIT_KEY = 'workouts_weight_unit'

// Единицы, которые считаем весовыми. Нужно, чтобы не показывать их как «единицу повторений» у старых упражнений.
const WEIGHT_UNITS = new Set(['кг', 'kg', 'kgs', 'г', 'гр', 'g', 'lb', 'lbs', 'фунт', 'фунта', 'фунтов', 'фунты', 'oz', 'унц', 'st'])

export function isWeightUnit(unit: string | null | undefined): boolean {
  if (!unit) return false
  return WEIGHT_UNITS.has(unit.trim().toLowerCase().replace(/\.$/, ''))
}

// Единица, которую дописываем после ПОВТОРЕНИЙ у упражнения без веса: весовые единицы не показываем, прочие (старые
// «раз», «мин», …) оставляем как есть.
export function repUnit(exercise: Pick<Exercise, 'unit'>): string {
  const u = exercise.unit?.trim() ?? ''
  return isWeightUnit(u) ? '' : u
}

// Последняя выбранная человеком единица веса (запоминается при сохранении упражнения с весом); иначе — fallback.
export function readWeightUnit(fallback: string): string {
  try {
    const v = localStorage.getItem(WEIGHT_UNIT_KEY)?.trim()
    return v || fallback
  } catch {
    return fallback
  }
}

export function rememberWeightUnit(unit: string): void {
  const u = unit.trim()
  if (!u) return
  try {
    localStorage.setItem(WEIGHT_UNIT_KEY, u)
  } catch {
    /* хранилище недоступно — просто не запомним */
  }
}

// Единица веса по умолчанию для интерфейса: запомненная или «кг/kg» по языку.
export const defaultWeightUnit = (): string => readWeightUnit(t('workouts_default_unit'))

// Что писать в колонку unit. Без веса — пусто (или прежняя НЕвесовая единица, если она была); с весом — выбранная
// или единица по умолчанию. Пустая строка, а не null: колонка могла быть NOT NULL.
export function unitToSave(input: { unit?: string | null; tracks_weight?: string | null }, defaultUnit: string): string {
  const u = input.unit?.trim() ?? ''
  if (input.tracks_weight === 'no') return isWeightUnit(u) ? '' : u
  return u || defaultUnit
}
