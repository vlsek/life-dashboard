import { parseIso } from './date'

// Чистая логика блока «Профиль» — портировано из loadProfileInner()/formatAge() в dashboard.js.
// Без сети и без Vue, чтобы проверяться тестами.

export interface ProfileRow {
  avatar_url: string | null
  birthdate: string | null
  goal_type: string | null
}

export interface BodyParam {
  id: string
  name: string
  icon: string | null
  unit: string | null
  position: number
}

export interface BodyValue {
  parameter_id: string
  date: string
  value: number | null
}

export interface BodyParamForm {
  name: string
  icon: string
  unit: string
}

export const DEFAULT_PARAM_ICON = 'svg:ruler'
export const MIN_BIRTHDATE = '1900-01-01'

// Возраст в полных годах на дату today (та же логика сравнения месяца/дня, что и в оригинале;
// дата рождения разбирается как локальная, а не UTC — чтобы день рождения не «съезжал» в
// часовых поясах западнее UTC).
export function calcAge(birthdate: string, today: Date = new Date()): number {
  const bd = parseIso(birthdate)
  let age = today.getFullYear() - bd.getFullYear()
  if (today.getMonth() < bd.getMonth() || (today.getMonth() === bd.getMonth() && today.getDate() < bd.getDate())) age--
  return age
}

// Склонение: 21 год, 22 года, 25 лет (ru); 1 year / N years (en).
export function formatAge(age: number, lang: 'en' | 'ru'): string {
  if (lang === 'en') return `${age} ${age === 1 ? 'year' : 'years'}`
  const mod100 = age % 100
  const mod10 = age % 10
  let word: string
  if (mod100 >= 11 && mod100 <= 14) word = 'лет'
  else if (mod10 === 1) word = 'год'
  else if (mod10 >= 2 && mod10 <= 4) word = 'года'
  else word = 'лет'
  return `${age} ${word}`
}

// 'ok' | 'range' (вне 1900..сегодня) | 'empty' — сравнение строк ISO-дат, как в оригинале.
export function validateBirthdate(value: string, todayIso: string): 'ok' | 'range' | 'empty' {
  if (!value) return 'empty'
  if (value < MIN_BIRTHDATE || value > todayIso) return 'range'
  return 'ok'
}

// «%» прижимается к числу, остальные единицы — через пробел.
export function unitSuffix(unit: string | null | undefined): string {
  if (!unit) return ''
  return unit.startsWith('%') ? unit : ' ' + unit
}

export type DeltaTone = 'success' | 'danger' | 'neutral'

export interface ParamStat {
  param: BodyParam
  latest: number
  sinceFirst: number | null
  sincePrev: number | null
  tone: DeltaTone
}

// Динамика по параметрам тела для карточки профиля. «Хорошее» направление зависит от цели
// из онбординга (goal_type) и определяется по названию параметра — как в оригинале:
// вес при lose_weight — вниз хорошо, при gain_muscle — вверх; мышцы — всегда вверх хорошо.
// Цвет считается по сравнению с ПРЕДЫДУЩИМ значением, а показанная разница — с ПЕРВЫМ.
export function paramStats(params: BodyParam[], values: BodyValue[], goalType: string | null): ParamStat[] {
  const wantsDown = goalType === 'lose_weight'
  const wantsUp = goalType === 'gain_muscle'
  const out: ParamStat[] = []
  for (const param of params) {
    const own = values.filter((v) => v.parameter_id === param.id && v.value != null) as (BodyValue & { value: number })[]
    if (own.length === 0) continue
    own.sort((a, b) => a.date.localeCompare(b.date))
    const first = own[0]
    const latest = own[own.length - 1]
    const prev = own.length > 1 ? own[own.length - 2] : null
    const sinceFirst = latest.value - first.value
    const sincePrev = prev ? latest.value - prev.value : null

    let tone: DeltaTone = 'neutral'
    if (sincePrev != null) {
      const name = param.name.toLowerCase()
      const isWeight = name.includes('вес') || name.includes('weight')
      const isMuscle = name.includes('мыш') || name.includes('muscle')
      const good = (d: number): DeltaTone => (d > 0 ? 'success' : d < 0 ? 'danger' : 'neutral')
      if (isWeight && wantsDown) tone = good(-sincePrev)
      if (isWeight && wantsUp) tone = good(sincePrev)
      if (isMuscle) tone = good(sincePrev)
    }
    out.push({ param, latest: latest.value, sinceFirst, sincePrev, tone })
  }
  return out
}

// «+1.5» / «-0.8» — знак плюс для роста, 1 знак после запятой. null, если изменение ~0.
export function formatDelta(sinceFirst: number | null): string | null {
  if (sinceFirst == null || Math.abs(sinceFirst) <= 0.001) return null
  return (sinceFirst > 0 ? '+' : '') + sinceFirst.toFixed(1)
}

export function emptyParamForm(): BodyParamForm {
  return { name: '', icon: DEFAULT_PARAM_ICON, unit: '' }
}

export function paramFormFrom(p: BodyParam): BodyParamForm {
  return { name: p.name, icon: p.icon ?? DEFAULT_PARAM_ICON, unit: p.unit ?? '' }
}

// Путь файла аватара в Storage-бакете avatars: одна «текущая» картинка на пользователя.
export function avatarPath(userId: string, fileName: string): string {
  return `${userId}/avatar.${fileName.split('.').pop()}`
}
