import { todayStr } from './date'
import { findWaterMetric } from './water'
import type { GoalDirection, Metric, MetricOption, MetricType, Schedule } from './types'

// Портировано из блока «Настройка метрик» в dashboard.js (openMetricFormModal/addMetric/
// editMetric/parseOptionsRaw/scheduleFields/streakImportFields) — только чистая логика,
// без DOM и без сети (сеть — в useMetricsManager.ts).

export type ScheduleKind = 'daily' | 'days' | 'weekly' | 'at_most'

export interface MetricFormValues {
  name: string
  icon: string
  type: MetricType
  goalDirection: GoalDirection
  goalValue: number
  unit: string
  optionsRaw: string
  categoryId: string // '' — без категории, '__new__' — создать новую
  inputMode: 'set' | 'add'
  scheduleKind: ScheduleKind
  days: number[] // 0 = воскресенье, как Date.getDay()
  weeklyMin: number
  atMostMax: number
  streakImportDays: string // строка, потому что пустое поле ≠ 0
}

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

export function parseOptionsRaw(raw: string | null | undefined): MetricOption[] {
  if (!raw?.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [key, ...rest] = pair.split(':')
      return { key: key.trim(), label: rest.join(':').trim() || key.trim() }
    })
}

export function optionsToRaw(options: MetricOption[] | null | undefined): string {
  return (options || []).map((o) => `${o.key}:${o.label}`).join(', ')
}

// Расписание из значений формы. «days» с 0 или 7 выбранными днями = «каждый день» (null).
export function buildSchedule(f: Pick<MetricFormValues, 'scheduleKind' | 'days' | 'weeklyMin' | 'atMostMax'>): Schedule {
  if (f.scheduleKind === 'days' && f.days.length > 0 && f.days.length < 7) {
    return { type: 'days', days: [...f.days].sort((a, b) => a - b) }
  }
  if (f.scheduleKind === 'weekly') return { type: 'weekly', min: Math.min(7, Math.max(1, Math.trunc(f.weeklyMin) || 1)) }
  if (f.scheduleKind === 'at_most') return { type: 'at_most', max: Math.min(7, Math.max(0, Math.trunc(f.atMostMax) || 0)) }
  return null
}

export function scheduleKindOf(s: Schedule | undefined): ScheduleKind {
  return s?.type ?? 'daily'
}

// Краткая подпись расписания для списка метрик (портировано из openMetricsManagerModal()).
export function scheduleSummary(
  s: Schedule | undefined,
  weekdayNames: string[],
  weeklyShort: string,
  atMostShort: string,
): string | null {
  if (!s) return null
  if (s.type === 'days') {
    return WEEK_ORDER.filter((d) => s.days.includes(d))
      .map((d) => weekdayNames[WEEK_ORDER.indexOf(d)])
      .join(' ')
  }
  if (s.type === 'weekly') return `${s.min}${weeklyShort}`
  return `${atMostShort} ${s.max}${weeklyShort}`
}

// Какие поля формы активны для типа — портировано из applyTypeState().
export function fieldsEnabledForType(type: MetricType) {
  const goalApplies = type === 'number' || type === 'sets'
  return {
    goal: goalApplies, // направление цели, значение цели, единица
    inputMode: type === 'number',
    options: type === 'multiselect' || type === 'sets',
  }
}

// При смене типа на boolean цель/единица/варианты очищаются (как в оригинале).
export function clearedForBoolean(f: MetricFormValues): MetricFormValues {
  return { ...f, goalValue: 0, unit: '', optionsRaw: '' }
}

export function emptyForm(): MetricFormValues {
  return {
    name: '',
    icon: 'svg:pin',
    type: 'number',
    goalDirection: 'at_least',
    goalValue: 0,
    unit: '',
    optionsRaw: '',
    categoryId: '',
    inputMode: 'set',
    scheduleKind: 'daily',
    days: [1, 2, 3, 4, 5],
    weeklyMin: 3,
    atMostMax: 2,
    streakImportDays: '',
  }
}

export function formFromMetric(m: Metric): MetricFormValues {
  const s = m.schedule
  return {
    name: m.name,
    icon: m.icon ?? 'svg:pin',
    type: m.type,
    goalDirection: m.goal_direction ?? 'at_least',
    goalValue: m.goal_value ?? 0,
    unit: m.unit ?? '',
    optionsRaw: optionsToRaw(m.options),
    categoryId: m.category_id ?? '',
    inputMode: m.input_mode ?? 'set',
    scheduleKind: scheduleKindOf(s),
    days: s?.type === 'days' ? [...s.days] : [1, 2, 3, 4, 5],
    weeklyMin: s?.type === 'weekly' ? s.min : 3,
    atMostMax: s?.type === 'at_most' ? s.max : 2,
    streakImportDays: m.streak_import_days != null ? String(m.streak_import_days) : '',
  }
}

function parsedImportDays(f: MetricFormValues): number | null {
  return f.streakImportDays === '' ? null : Math.max(0, parseInt(f.streakImportDays, 10) || 0)
}

// Расписание пишем только если оно задано (или колонка уже есть у метрики) — так правка
// метрик работает и до применения миграции 021 (портировано из scheduleFields()).
export function scheduleFields(f: MetricFormValues, existing: Metric | null): { schedule?: Schedule } {
  const schedule = buildSchedule(f)
  if (schedule || (existing && 'schedule' in existing)) return { schedule }
  return {}
}

// Портировано из streakImportFields(): импорт стрика (миграция 026) — «уже было N дней».
export function streakImportFields(
  f: MetricFormValues,
  existing: Metric,
  today: string = todayStr(),
): { streak_import_days?: number | null; streak_import_date?: string | null } {
  const days = parsedImportDays(f)
  if (!(days != null && days > 0)) {
    return 'streak_import_days' in existing ? { streak_import_days: null, streak_import_date: null } : {}
  }
  if (!('streak_import_days' in existing)) return {} // миграция 026 ещё не применена
  const changed = days !== (existing.streak_import_days ?? null) // дата сбрасывается, только если число поменяли
  return { streak_import_days: days, streak_import_date: changed ? today : (existing.streak_import_date ?? today) }
}

// Общие поля insert/update. category_id — уже разрешённый (не '__new__').
function commonFields(f: MetricFormValues, categoryId: string | null) {
  return {
    name: f.name.trim(),
    icon: f.icon || 'svg:pin',
    type: f.type,
    goal_direction: f.goalDirection,
    goal_value: Number.isFinite(f.goalValue) ? f.goalValue : 0,
    unit: f.unit,
    options: parseOptionsRaw(f.optionsRaw),
    category_id: categoryId,
    input_mode: f.inputMode,
  }
}

export function buildInsertRow(f: MetricFormValues, userId: string, position: number, categoryId: string | null) {
  return { user_id: userId, ...commonFields(f, categoryId), position, active: true, ...scheduleFields(f, null) }
}

export function buildUpdateRow(f: MetricFormValues, existing: Metric, categoryId: string | null) {
  return { ...commonFields(f, categoryId), ...scheduleFields(f, existing), ...streakImportFields(f, existing) }
}

// Позиция новой метрики — максимум существующих + 1 (пусто → 0).
export function nextPosition(existing: { position: number }[]): number {
  return existing.reduce((mx, m) => Math.max(mx, m.position), -1) + 1
}

// Ключ для новой категории — портировано из resolveCategoryId().
export function categoryKeyFor(label: string, nowMs: number = Date.now()): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_').slice(0, 30) + '_' + nowMs.toString(36)
}

// Подпись цели в списке метрик (портировано из openMetricsManagerModal()).
export function goalSummary(m: Pick<Metric, 'type' | 'goal_direction' | 'goal_value' | 'unit'>, boolLabel: string, multiLabel: string): string {
  if (m.type === 'number') return `${m.goal_direction === 'at_most' ? '<' : '≥'} ${m.goal_value ?? 0} ${m.unit || ''}`
  return m.type === 'boolean' ? boolLabel : multiLabel
}

// «Вода» живёт своим блоком (правый верхний угол Дашборда) и в списке настроек метрик дня быть не должна
// (BACKLOG 7.1, решение владельца): отключается только из будущих «Глобальных настроек». Скрываем ровно ту
// метрику, которую Дашборд считает водой (findWaterMetric — первая по иконке-капле/названию), остальные — как есть.
export function withoutWater(metrics: Metric[]): Metric[] {
  const water = findWaterMetric(metrics)
  return water ? metrics.filter((m) => m !== water) : metrics
}
