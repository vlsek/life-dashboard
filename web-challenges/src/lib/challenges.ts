import { fmtDate } from './date'
import type { Challenge, ChallengeEntry, ChallengeTemplate, ChallengeType, CustomChallengeFormInput } from './types'

// Портировано 1:1 из daysBetween() в challenges.js.
export function daysBetween(fromStr: string, toStr: string): number {
  return Math.round((new Date(toStr).getTime() - new Date(fromStr).getTime()) / 86400000)
}

// Цель на конкретный день челленджа (индекс с 0). null — если у типа нет числовой
// дневной цели (daily_boolean) или это не daily-тип вовсе. Портировано из targetForDay().
export function targetForDay(
  ch: Pick<Challenge, 'type' | 'daily_target' | 'start_value' | 'daily_increment'>,
  dayIndex: number,
): number | null {
  if (ch.type === 'daily_fixed') return ch.daily_target
  if (ch.type === 'daily_progressive') return (ch.start_value ?? 0) + (ch.daily_increment ?? 0) * dayIndex
  return null
}

// Дата i-го дня челленджа, считая от start_date — та же арифметика (мс от start_date),
// что и в оригинальном renderDailyChallengeCard(), не через parseIso/addDaysIso из date.ts,
// чтобы поведение не разошлось с уже работающей ванильной версией.
export function dayDateStr(startDate: string, i: number): string {
  return fmtDate(new Date(new Date(startDate).getTime() + i * 86400000))
}

export interface DayDot {
  i: number
  dateStr: string
  done: boolean
  isFuture: boolean
  isToday: boolean
}

export interface DailyStats {
  todayIdx: number
  duration: number
  isBoolean: boolean
  doneDays: DayDot[]
  completedCount: number
  isOver: boolean
  todayTarget: number | null
  todayEntryValue: number | null
}

// Портировано из renderDailyChallengeCard() в challenges.js (только расчёт, без DOM).
export function computeDailyStats(
  ch: Pick<Challenge, 'type' | 'start_date' | 'duration_days' | 'daily_target' | 'start_value' | 'daily_increment'>,
  entries: ChallengeEntry[],
  today: string,
): DailyStats {
  const entryByDate: Record<string, ChallengeEntry> = {}
  entries.forEach((e) => {
    entryByDate[e.date] = e
  })

  const todayIdx = daysBetween(ch.start_date, today)
  const duration = ch.duration_days || 30
  const isBoolean = ch.type === 'daily_boolean'
  const doneDays: DayDot[] = []
  for (let i = 0; i < duration; i++) {
    const dateStr = dayDateStr(ch.start_date, i)
    const e = entryByDate[dateStr]
    const target = targetForDay(ch, i)
    const done = isBoolean ? e?.value === 1 : !!(e && target != null && (e.value ?? 0) >= target)
    doneDays.push({ i, dateStr, done, isFuture: i > todayIdx, isToday: i === todayIdx })
  }
  const completedCount = doneDays.filter((d) => d.done).length
  const isOver = todayIdx >= duration
  const todayEntry = entryByDate[today]
  const todayTarget = targetForDay(ch, todayIdx)

  return {
    todayIdx,
    duration,
    isBoolean,
    doneDays,
    completedCount,
    isOver,
    todayTarget,
    todayEntryValue: todayEntry?.value ?? null,
  }
}

export interface CumulativeStats {
  count: number
  target: number
  itemWord: string
  pct: number
  canComplete: boolean
}

// Портировано из renderCumulativeChallengeCard() в challenges.js (только расчёт).
export function computeCumulativeStats(ch: Pick<Challenge, 'target_count' | 'item_label'>, entries: ChallengeEntry[]): CumulativeStats {
  const count = entries.reduce((sum, e) => sum + (e.value || 0), 0)
  const target = ch.target_count || 0
  const itemWord = ch.item_label || ''
  const pct = target > 0 ? Math.min(100, (count / target) * 100) : 0
  return { count, target, itemWord, pct, canComplete: count >= target && target > 0 }
}

// Патч для insert при старте челленджа из каталога. Портировано из startFromTemplate().
export function buildInsertFromTemplate(tpl: ChallengeTemplate) {
  return {
    template_id: tpl.id,
    title: tpl.title,
    icon: tpl.icon,
    type: tpl.type,
    unit: tpl.unit ?? null,
    duration_days: tpl.durationDays ?? null,
    daily_target: tpl.dailyTarget ?? null,
    start_value: tpl.startValue ?? null,
    daily_increment: tpl.dailyIncrement ?? null,
    target_count: tpl.targetCount ?? null,
    item_label: tpl.itemLabel ?? null,
  }
}

// Патч для insert своего челленджа. Портировано из okBtn.onclick в openCustomChallengeModal().
// Числовые поля не относящиеся к выбранному типу пишутся как null, как и в оригинале.
export function buildInsertCustom(form: CustomChallengeFormInput) {
  const type: ChallengeType = form.type
  return {
    template_id: null,
    title: form.title.trim(),
    icon: form.icon || '🏆',
    type,
    unit: type === 'daily_boolean' ? null : form.unit || null,
    duration_days: type.startsWith('daily') ? form.duration || 30 : null,
    daily_target: type === 'daily_fixed' ? form.dailyTarget || 0 : null,
    start_value: type === 'daily_progressive' ? form.startValue || 0 : null,
    daily_increment: type === 'daily_progressive' ? form.increment || 0 : null,
    target_count: type === 'cumulative_count' ? form.targetCount || 0 : null,
    item_label: type === 'cumulative_count' ? form.itemLabel || null : null,
  }
}

// Какие поля формы активны для данного типа — портировано из applyTypeState().
export function fieldsEnabledForType(type: ChallengeType) {
  return {
    duration: type.startsWith('daily'),
    dailyTarget: type === 'daily_fixed',
    startValue: type === 'daily_progressive',
    increment: type === 'daily_progressive',
    unit: type !== 'daily_boolean',
    targetCount: type === 'cumulative_count',
    itemLabel: type === 'cumulative_count',
  }
}
