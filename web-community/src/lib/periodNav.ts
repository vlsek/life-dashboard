import { addDaysIso, fmtDate, mondayOf, parseIso, todayStr } from './date'
import { periodBounds, type PeriodRange, type PeriodState } from './chart'

// Выбор периода у графиков (BACKLOG 16, 13:44 «организован плохо» + «современное оформление», раздел 18). Чистая логика без DOM:
// как показать сохранённый период и куда его листать. Формат хранения НЕ менялся (`PeriodState`: range/from/to), поэтому всё, что у людей
// уже лежит в localStorage (days10, week, last_week, month, custom), продолжает работать; календарная неделя/месяц, выбранные стрелками,
// хранятся как custom с точными границами и при чтении распознаются обратно.

export const PRESETS = ['days7', 'days30', 'days90', 'year', 'all'] as const
export type PresetKey = (typeof PRESETS)[number]

// Ключи i18n коротких подписей пресетов (используют выбор периода и таблетка у графика)
export const PRESET_LABEL_KEYS: Record<PresetKey, string> = {
  days7: 'period_7d',
  days30: 'period_30d',
  days90: 'period_90d',
  year: 'period_1y',
  all: 'period_all_short',
}

export type PeriodView =
  | { kind: 'preset'; key: PresetKey }
  | { kind: 'week' | 'month'; from: string; to: string }
  | { kind: 'custom'; from: string | null; to: string | null }

export function weekOf(iso: string): { from: string; to: string } {
  const from = mondayOf(iso)
  return { from, to: addDaysIso(from, 6) }
}

export function monthOf(iso: string): { from: string; to: string } {
  const d = parseIso(iso)
  return { from: fmtDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: fmtDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
}

// Как период выглядит для человека: короткий пресет, календарная неделя/месяц (листаются) или произвольный диапазон.
export function classifyPeriod(state: PeriodState, today: string = todayStr()): PeriodView {
  const r: PeriodRange = state.range
  if ((PRESETS as readonly string[]).includes(r)) return { kind: 'preset', key: r as PresetKey }
  if (r === 'week') return { kind: 'week', ...weekOf(today) }
  if (r === 'last_week') return { kind: 'week', ...weekOf(addDaysIso(today, -7)) }
  if (r === 'month') return { kind: 'month', ...monthOf(today) }
  if (r === 'days10') {
    const [from, to] = periodBounds('days10', null, null, parseIso(today))
    return { kind: 'custom', from, to }
  }
  const { from, to } = state
  if (from && to) {
    if (from === mondayOf(from) && to === addDaysIso(from, 6)) return { kind: 'week', from, to }
    const m = monthOf(from)
    if (from === m.from && to === m.to) return { kind: 'month', from, to }
  }
  return { kind: 'custom', from: from ?? null, to: to ?? null }
}

// Границы, по которым реально фильтруется график (для подписи датами).
export function viewBounds(view: PeriodView, today: string = todayStr()): [string | null, string | null] {
  if (view.kind === 'preset') return periodBounds(view.key, null, null, parseIso(today))
  return [view.from, view.to]
}

// Соседний календарный период (dir = −1 назад, +1 вперёд) как состояние для сохранения.
export function stepPeriod(view: { kind: 'week' | 'month'; from: string }, dir: -1 | 1): PeriodState {
  const next =
    view.kind === 'week'
      ? weekOf(addDaysIso(view.from, 7 * dir))
      : monthOf(fmtDate(new Date(parseIso(view.from).getFullYear(), parseIso(view.from).getMonth() + dir, 1)))
  return { range: 'custom', from: next.from, to: next.to }
}

// Вперёд листать можно, пока следующий период уже начался (в будущее, где данных быть не может, не уходим).
export function canStepForward(view: { kind: 'week' | 'month'; from: string }, today: string = todayStr()): boolean {
  return (stepPeriod(view, 1).from as string) <= today
}

// Переключение режима «Неделя/Месяц»: период, содержащий сегодня.
export function currentPeriod(kind: 'week' | 'month', today: string = todayStr()): PeriodState {
  const p = kind === 'week' ? weekOf(today) : monthOf(today)
  return { range: 'custom', from: p.from, to: p.to }
}

export function containsDay(view: { from: string; to: string }, day: string = todayStr()): boolean {
  return view.from <= day && day <= view.to
}

const loc = (lang: string) => (lang === 'en' ? 'en-US' : 'ru-RU')

// RU: «3–9 сент.» / «29 сент. – 5 окт.»; EN: «Sep 3–9» / «Sep 29 – Oct 5»; год добавляется, если конец периода не в текущем году.
// Пустая граница → «…».
export function formatRange(from: string | null, to: string | null, lang: string, today: string = todayStr()): string {
  if (!from && !to) return ''
  const en = lang === 'en'
  const day = (iso: string) => new Intl.DateTimeFormat(loc(lang), { day: 'numeric' }).format(parseIso(iso))
  const mon = (iso: string) => new Intl.DateTimeFormat(loc(lang), { month: 'short' }).format(parseIso(iso))
  const year = (iso: string) => String(parseIso(iso).getFullYear())
  const dm = (iso: string) => (en ? `${mon(iso)} ${day(iso)}` : `${day(iso)} ${mon(iso)}`)
  const yearTail = (iso: string) => (year(iso) !== today.slice(0, 4) ? (en ? `, ${year(iso)}` : ` ${year(iso)}`) : '')
  if (from && to) {
    if (from.slice(0, 7) === to.slice(0, 7)) {
      return (en ? `${mon(from)} ${day(from)}–${day(to)}` : `${day(from)}–${day(to)} ${mon(to)}`) + yearTail(to)
    }
    return `${dm(from)} – ${dm(to)}${yearTail(to)}`
  }
  if (from) return `${dm(from)}${yearTail(from)} – …`
  return `… – ${dm(to as string)}${yearTail(to as string)}`
}

// «сентябрь» / «сентябрь 2025» (год — если не текущий).
export function monthLabel(iso: string, lang: string, today: string = todayStr()): string {
  const d = parseIso(iso)
  const sameYear = String(d.getFullYear()) === today.slice(0, 4)
  return new Intl.DateTimeFormat(loc(lang), { month: 'long', ...(sameYear ? {} : { year: 'numeric' }) }).format(d)
}
