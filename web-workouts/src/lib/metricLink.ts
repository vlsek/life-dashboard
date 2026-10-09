import { sb } from './supabase'
import type { WorkoutEntry, WorkoutSet } from './types'

// Связь «метрика дня ↔ упражнение» (BACKLOG 19 «13:06», 30, «8:29 — третий раз»; миграция 054, решение владельца 2026-10-06:
// подходы вводятся ОДИН раз, тренировка и метрика считаются вместе). «Тренировки» — единственный источник правды: после каждой правки
// записей клиент пересчитывает значение связанной метрики за дату и пишет его в daily_values (серверные баллы/рейтинг/серии читают
// daily_values и про связь не знают). Чистая логика — здесь; запросы — внизу файла.

export interface MetricSetRow {
  reps: number | null
  variation: string | null
  time: string | null
}

export interface LinkedMetric {
  id: string
  name: string
  icon: string | null
  type: string // 'sets' | 'number' — только эти два можно связать с упражнением
  goal_value: number | null
  source_exercise_id: string | null
  position?: number
  // «Подходов в день по плану» (миграция 041): журнал [{from:'ГГГГ-ММ-ДД', n:число|null}] по возрастанию дат; нет колонки/плана — undefined/null
  planned_sets_log?: unknown
}

export const LINKABLE_TYPES = ['sets', 'number']

// Плановое число подходов на дату: последняя запись журнала с from <= date (прошлое по прежнему правилу, как на Дашборде). n=null или мусор — плана нет.
export function plannedSetsOn(log: unknown, date: string): number | null {
  if (!Array.isArray(log)) return null
  let best: { from: string; n: unknown } | null = null
  for (const e of log) {
    if (!e || typeof e !== 'object') continue
    const from = (e as { from?: unknown }).from
    if (typeof from !== 'string' || from > date) continue
    if (!best || from >= best.from) best = { from, n: (e as { n?: unknown }).n }
  }
  const n = best?.n
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null
}

// Подходы упражнения за дату — из всех записей этого дня, по порядку времени (подходы без времени — в порядке записи, после тех, что со временем).
export function setsOfDay(entries: WorkoutEntry[], exerciseId: string, date: string): WorkoutSet[] {
  const out: { s: WorkoutSet; i: number }[] = []
  let i = 0
  for (const e of entries) {
    if (e.exercise_id !== exerciseId || e.date !== date) continue
    for (const s of e.sets || []) out.push({ s, i: i++ })
  }
  out.sort((a, b) => {
    const ta = a.s.time ?? '\uffff'
    const tb = b.s.time ?? '\uffff'
    return ta === tb ? a.i - b.i : ta < tb ? -1 : 1
  })
  return out.map((x) => x.s)
}

// Значение метрики за день из подходов. null — подходов нет (значение дня удаляется). Основное число подхода — reps (у «Секунд»/«Километров»
// оно тоже лежит в reps, см. 014 value_label).
export function metricValueFor(metricType: string, sets: WorkoutSet[]): unknown {
  if (sets.length === 0) return null
  if (metricType === 'sets') {
    return sets.map((s): MetricSetRow => ({ reps: s.reps ?? null, variation: null, time: s.time ?? null }))
  }
  return sets.reduce((sum, s) => sum + (s.reps || 0), 0)
}

// Сегодняшнее значение метрики → подходы тренировки (однократный импорт при привязке уже заведённой метрики, чтобы ничего не потерять).
export function setsFromMetricValue(value: unknown): WorkoutSet[] {
  const mk = (reps: number | null, time: string | null): WorkoutSet => ({ reps, weight: null, time, duration: null, side: null })
  if (Array.isArray(value)) {
    return (value as Partial<MetricSetRow>[])
      .filter((s) => s && (s.reps ?? 0) > 0)
      .map((s) => mk(s.reps ?? null, typeof s.time === 'string' ? s.time : null))
  }
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
  return Number.isFinite(n) && n > 0 ? [mk(n, null)] : []
}

export function totalReps(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => sum + (s.reps || 0), 0)
}

// Колонки source_exercise_id нет (миграция 054 не применена) — PostgREST отвечает кодом 42703 / PGRST204 / текстом про колонку.
export function isMissingColumn(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null
  if (!e) return false
  return e.code === '42703' || e.code === 'PGRST204' || /source_exercise_id/.test(e.message || '')
}

// ---------- запросы ----------

// Метрики, связанные с упражнениями. Нет колонки (миграция не применена) → { supported: false }, раздел работает как раньше.
export async function loadMetricLinks(userId: string): Promise<{ supported: boolean; metrics: LinkedMetric[] }> {
  const q = (cols: string) => sb.from('metrics').select(cols).eq('user_id', userId).eq('active', true).order('position')
  // Сначала с планом подходов (041); нет этой колонки — без неё, кольца просто не будет (связь с метриками от этого не страдает).
  let res = await q('id, name, icon, type, goal_value, source_exercise_id, position, planned_sets_log')
  if (res.error) res = await q('id, name, icon, type, goal_value, source_exercise_id, position')
  if (res.error) return { supported: false, metrics: [] } // нет колонки (миграция 054 не применена) или метрики недоступны — раздел работает как раньше
  return { supported: true, metrics: (res.data || []) as unknown as LinkedMetric[] }
}

// Пересчитать значение связанных метрик за даты по ТЕКУЩИМ записям (вызывать после reload). Ошибки не бросает наружу — запись тренировки
// важнее, чем зеркало в метрике; возвращает число ошибок для отчёта.
export async function syncLinkedMetrics(
  userId: string,
  exerciseId: string,
  linked: LinkedMetric[],
  entries: WorkoutEntry[],
  dates: string[],
): Promise<number> {
  let failures = 0
  for (const m of linked.filter((x) => x.source_exercise_id === exerciseId)) {
    for (const date of [...new Set(dates)]) {
      const value = metricValueFor(m.type, setsOfDay(entries, exerciseId, date))
      const res =
        value === null
          ? await sb.from('daily_values').delete().eq('user_id', userId).eq('metric_id', m.id).eq('date', date)
          : await sb.from('daily_values').upsert({ user_id: userId, date, metric_id: m.id, value }, { onConflict: 'user_id,date,metric_id' })
      if (res.error) failures++
    }
  }
  return failures
}

// Привязать метрику к упражнению; сегодняшние подходы, уже введённые в метрику вручную, переносим в тренировку (без потерь), если за сегодня
// тренировок по этому упражнению ещё нет. Возвращает вставленную запись (или null) — вызывающий перезагружает данные и пересчитывает.
export async function linkMetric(
  userId: string,
  exerciseId: string,
  metric: LinkedMetric,
  today: string,
  entries: WorkoutEntry[],
): Promise<{ imported: boolean }> {
  const { error } = await sb.from('metrics').update({ source_exercise_id: exerciseId }).eq('id', metric.id).eq('user_id', userId)
  if (error) throw error
  const hasToday = entries.some((e) => e.exercise_id === exerciseId && e.date === today)
  if (hasToday) return { imported: false }
  const { data } = await sb.from('daily_values').select('value').eq('user_id', userId).eq('metric_id', metric.id).eq('date', today).maybeSingle()
  const sets = setsFromMetricValue((data as { value?: unknown } | null)?.value)
  if (sets.length === 0) return { imported: false }
  const { error: insErr } = await sb.from('workout_entries').insert({ user_id: userId, exercise_id: exerciseId, date: today, sets, notes: null })
  if (insErr) throw insErr
  return { imported: true }
}

export async function unlinkMetric(userId: string, metricId: string): Promise<void> {
  const { error } = await sb.from('metrics').update({ source_exercise_id: null }).eq('id', metricId).eq('user_id', userId)
  if (error) throw error
}

// Создать новую метрику «Подходы» под упражнение и сразу связать.
export async function createLinkedMetric(userId: string, exerciseId: string, name: string, position: number): Promise<LinkedMetric> {
  const row = {
    user_id: userId,
    name,
    icon: '💪',
    type: 'sets',
    goal_value: null,
    goal_direction: 'at_least',
    unit: '',
    options: [],
    position,
    active: true,
    source_exercise_id: exerciseId,
  }
  const { data, error } = await sb.from('metrics').insert(row).select('id, name, icon, type, goal_value, source_exercise_id').single()
  if (error) throw error
  return data as LinkedMetric
}
