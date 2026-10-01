import { addDaysIso } from './date'
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

// Дата i-го дня челленджа, считая от start_date. Календарная арифметика в локальном поясе
// (addDaysIso), а не «мс от start_date»: new Date('YYYY-MM-DD') — это UTC-полночь, и к западу
// от UTC fmtDate() давал предыдущий день.
export function dayDateStr(startDate: string, i: number): string {
  return addDaysIso(startDate, i)
}

export interface DayDot {
  i: number
  dateStr: string
  done: boolean
  isFuture: boolean
  isToday: boolean
  value: number | null // внесённое значение за этот день (null — записи нет)
  target: number | null // цель на этот день (null — у типа нет числовой цели)
}

// Какой день выбран в карточке по умолчанию: сегодняшний; если челлендж уже закончился — последний
// день. Если он ещё не начался (todayIdx < 0), берём первый — он будущий, ввод для него закрыт.
export function defaultDayIdx(todayIdx: number, duration: number): number {
  return Math.max(0, Math.min(todayIdx, duration - 1))
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
    doneDays.push({ i, dateStr, done, isFuture: i > todayIdx, isToday: i === todayIdx, value: e?.value ?? null, target })
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
    // Поле добавляем только когда источник выбран: без миграции 032 колонки нет, и лишний null уронил бы любой insert.
    ...(type.startsWith('daily') && form.sourceMetricId ? { source_metric_id: form.sourceMetricId } : {}),
  }
}

// Правка уже созданного челленджа (BACKLOG 14, 11:26). Тип и дата старта НЕ меняются: смена типа
// переосмыслила бы уже внесённые записи (значение за день / 1 за штуку), а дата старта сдвинула бы
// нумерацию дней. Поэтому патч содержит только редактируемые поля; template_id и type остаются как
// были (челлендж из шаблона после правки остаётся челленджем из шаблона). Поля, не относящиеся к
// типу, пишутся как null — как и при создании.
export function buildUpdateFromForm(form: CustomChallengeFormInput, type: ChallengeType, existing?: Pick<Challenge, 'source_metric_id'>) {
  const { template_id: _templateId, type: _type, ...patch } = buildInsertCustom({ ...form, type })
  void _templateId
  void _type
  // Снять источник (вернуться к ручному вводу) можно, только если колонка уже есть у этой записи.
  if (type.startsWith('daily') && !form.sourceMetricId && existing && 'source_metric_id' in existing) {
    return { ...patch, source_metric_id: null }
  }
  return patch
}

// Значения формы правки из существующего челленджа (то, чего в базе нет, берём как при создании).
export function formFromChallenge(ch: Challenge): CustomChallengeFormInput {
  return {
    title: ch.title,
    icon: ch.icon || '🏆',
    type: ch.type,
    duration: ch.duration_days ?? 30,
    dailyTarget: ch.daily_target ?? 0,
    startValue: ch.start_value ?? 0,
    increment: ch.daily_increment ?? 1,
    unit: ch.unit ?? '',
    targetCount: ch.target_count ?? 10,
    itemLabel: ch.item_label ?? '',
    sourceMetricId: ch.source_metric_id ?? '',
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

// ===== Значения из метрики (BACKLOG 14, «11:28») =====

// Значение метрики за день -> число для челленджа. boolean: true=1, false=0; число — как есть; подходы ('sets') —
// сумма повторений (как metric_numeric_value() в migrations/018 и metricNumericValue() в Дашборде). Остальное — null.
export function metricValueToNumber(metricType: string, raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'boolean') return raw ? 1 : 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  if (metricType === 'sets' && Array.isArray(raw)) {
    return (raw as { reps?: number }[]).reduce((sum, set) => sum + (Number(set?.reps) || 0), 0)
  }
  return null
}

export const METRIC_ENTRY_PREFIX = 'metric:'
export function isMetricEntry(e: Pick<ChallengeEntry, 'id'>): boolean {
  return e.id.startsWith(METRIC_ENTRY_PREFIX)
}

// Ручные записи + значения метрики за дни, где ручной записи нет. Для boolean-челленджа любое положительное
// значение метрики = «сделано» (1). Дни вне окна челленджа не добавляем — карточка их всё равно не показывает.
export function mergeMetricValues(
  ch: Pick<Challenge, 'id' | 'user_id' | 'type'>,
  entries: ChallengeEntry[],
  metricByDate: Record<string, number>,
): ChallengeEntry[] {
  if (!ch.type.startsWith('daily')) return entries
  const manualDates = new Set(entries.map((e) => e.date))
  const extra: ChallengeEntry[] = []
  for (const [date, raw] of Object.entries(metricByDate)) {
    if (manualDates.has(date)) continue
    const value = ch.type === 'daily_boolean' ? (raw > 0 ? 1 : 0) : raw
    extra.push({ id: `${METRIC_ENTRY_PREFIX}${ch.id}:${date}`, user_id: ch.user_id, challenge_id: ch.id, date, value, note: null, created_at: '' })
  }
  extra.sort((a, b) => a.date.localeCompare(b.date))
  return extra.length ? [...entries, ...extra] : entries
}
