import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { buildInsertCustom, buildInsertFromTemplate, buildUpdateFromForm, exerciseRepsByDate, mergeMetricValues, metricValueToNumber } from './challenges'
import type { Challenge, ChallengeEntry, ChallengeTemplate, CustomChallengeFormInput, SourceExercise, SourceMetric } from './types'
import { friendlyError } from './friendlyError'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в useGoals.ts/useMilestones.ts —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useChallenges() {
  const auth = ref<AuthState>({ status: 'loading' })
  const instances = ref<Challenge[]>([])
  const entriesByChallenge = ref<Record<string, ChallengeEntry[]>>({})
  const error = ref<string | null>(null)
  // Метрики пользователя (для выбора источника значений) и значения источников по дням: challengeId -> дата -> число.
  const metrics = ref<SourceMetric[]>([])
  const sourceValues = ref<Record<string, Record<string, number>>>({})
  // Упражнения Workouts для выбора источника. Пусто, пока нет миграции 042 (колонки source_exercise_id нет) — тогда выбор скрыт.
  const exercises = ref<SourceExercise[]>([])

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login/'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding/'
      return
    }

    auth.value = { status: 'ready', userId, userEmail }
    await load(userId)
  }

  async function load(userId: string) {
    const { data: rows, error: err } = await sb
      .from('challenge_instances')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at')
    if (err) {
      error.value = friendlyError(err, 'load')
      return
    }
    error.value = null
    instances.value = (rows || []) as Challenge[]

    const { data: allEntries } = await sb.from('challenge_entries').select('*').eq('user_id', userId).order('date')
    const grouped: Record<string, ChallengeEntry[]> = {}
    ;(allEntries || []).forEach((e) => {
      const list = (grouped[e.challenge_id] ??= [])
      list.push(e as ChallengeEntry)
    })
    entriesByChallenge.value = grouped

    await loadMetricSources(userId)
    await loadExerciseSources(userId)
  }

  // Необязательная часть: любая ошибка (нет колонки source_metric_id до миграции 032, сеть) просто оставляет
  // челленджи в режиме ручного ввода и не ломает страницу.
  async function loadMetricSources(userId: string) {
    try {
      const { data: metricRows } = await sb.from('metrics').select('id, name, icon, type, unit, active').eq('user_id', userId)
      const allMetrics = (metricRows || []) as (SourceMetric & { active?: boolean })[]
      metrics.value = allMetrics.filter((m) => m.active !== false && ['number', 'sets', 'boolean'].includes(m.type))

      const sourced = instances.value.filter((c) => c.source_metric_id && c.type.startsWith('daily'))
      if (!sourced.length) {
        sourceValues.value = {}
        return
      }
      const ids = [...new Set(sourced.map((c) => c.source_metric_id as string))]
      const minStart = sourced.reduce((min, c) => (c.start_date < min ? c.start_date : min), sourced[0].start_date)
      const rows: { metric_id: string; date: string; value: unknown }[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error: err } = await sb
          .from('daily_values')
          .select('metric_id, date, value')
          .eq('user_id', userId)
          .in('metric_id', ids)
          .gte('date', minStart)
          .order('date')
          .range(from, from + 999)
        if (err) throw err
        rows.push(...((data || []) as typeof rows))
        if (!data || data.length < 1000) break
      }
      const typeById = new Map(allMetrics.map((m) => [m.id, m.type]))
      const out: Record<string, Record<string, number>> = {}
      for (const c of sourced) {
        const byDate: Record<string, number> = {}
        for (const r of rows) {
          if (r.metric_id !== c.source_metric_id) continue
          const n = metricValueToNumber(typeById.get(r.metric_id) || 'number', r.value)
          if (n !== null) byDate[r.date] = n
        }
        out[c.id] = byDate
      }
      sourceValues.value = out
    } catch {
      sourceValues.value = {}
    }
  }

  // Источник «упражнение» (миграция 042). Необязательная часть, как и метрики: нет колонки, сеть, нет таблицы тренировок —
  // выбор упражнения скрыт, челленджи остаются в ручном режиме. Значения дописываем к уже посчитанным значениям метрик.
  async function loadExerciseSources(userId: string) {
    try {
      // Колонка есть? Проверка запросом: до миграции 042 он вернёт ошибку, и фича остаётся скрытой.
      const probe = await sb.from('challenge_instances').select('source_exercise_id').limit(1)
      if (probe.error) {
        exercises.value = []
        return
      }
      const { data: exRows, error: exErr } = await sb.from('workout_exercises').select('id, name, category, unit').eq('user_id', userId).order('name')
      if (exErr) throw exErr
      exercises.value = (exRows || []) as SourceExercise[]

      const sourced = instances.value.filter((c) => c.source_exercise_id && c.type.startsWith('daily'))
      if (!sourced.length) return
      const ids = [...new Set(sourced.map((c) => c.source_exercise_id as string))]
      const minStart = sourced.reduce((min, c) => (c.start_date < min ? c.start_date : min), sourced[0].start_date)
      const rows: { exercise_id: string; date: string; sets: unknown }[] = []
      for (let from = 0; ; from += 1000) {
        const { data, error: err } = await sb
          .from('workout_entries')
          .select('exercise_id, date, sets')
          .eq('user_id', userId)
          .in('exercise_id', ids)
          .gte('date', minStart)
          .order('date')
          .range(from, from + 999)
        if (err) throw err
        rows.push(...((data || []) as typeof rows))
        if (!data || data.length < 1000) break
      }
      const out = { ...sourceValues.value }
      for (const c of sourced) out[c.id] = exerciseRepsByDate(rows, c.source_exercise_id as string)
      sourceValues.value = out
    } catch {
      // значения упражнений не подтянулись — ручные записи и метрики остаются как есть
    }
  }

  // Записи челленджа для показа: ручные + значения из метрики-источника там, где ручной записи нет.
  function effectiveEntries(ch: Challenge): ChallengeEntry[] {
    return mergeMetricValues(ch, entriesByChallenge.value[ch.id] || [], sourceValues.value[ch.id] || {})
  }

  function sourceMetricName(ch: Challenge): string | null {
    if (!ch.source_metric_id) return null
    return metrics.value.find((m) => m.id === ch.source_metric_id)?.name ?? null
  }

  function sourceExerciseName(ch: Challenge): string | null {
    if (!ch.source_exercise_id) return null
    return exercises.value.find((e) => e.id === ch.source_exercise_id)?.name ?? null
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  function requireUserId(): string {
    if (auth.value.status !== 'ready') throw new Error('not authenticated')
    return auth.value.userId
  }

  async function startFromTemplate(tpl: ChallengeTemplate) {
    const userId = requireUserId()
    const { error: err } = await sb.from('challenge_instances').insert({ user_id: userId, ...buildInsertFromTemplate(tpl) })
    if (err) throw err
    await reload()
  }

  async function startCustom(form: CustomChallengeFormInput) {
    const userId = requireUserId()
    const { error: err } = await sb.from('challenge_instances').insert({ user_id: userId, ...buildInsertCustom(form) })
    if (err) throw err
    await reload()
  }

  // Портировано из upsertDailyEntry(): select-затем-update-или-insert, не onConflict —
  // см. комментарий в migrations/019_challenges.sql про то, почему нет уникального индекса.
  async function upsertDailyEntry(challengeId: string, dateStr: string, value: number) {
    const userId = requireUserId()
    const { data: existing } = await sb.from('challenge_entries').select('id').eq('challenge_id', challengeId).eq('date', dateStr).maybeSingle()
    if (existing) {
      const { error: err } = await sb.from('challenge_entries').update({ value }).eq('id', existing.id)
      if (err) throw err
    } else {
      const { error: err } = await sb.from('challenge_entries').insert({ user_id: userId, challenge_id: challengeId, date: dateStr, value })
      if (err) throw err
    }
    await reload()
  }

  async function addCumulativeEntry(challengeId: string, note: string) {
    const userId = requireUserId()
    const { error: err } = await sb
      .from('challenge_entries')
      .insert({ user_id: userId, challenge_id: challengeId, date: todayStr(), value: 1, note: note || null })
    if (err) throw err
    await reload()
  }

  async function deleteEntry(id: string) {
    const { error: err } = await sb.from('challenge_entries').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  // Возвращает, сколько челленджей завершено теперь (для поздравления: номер по счёту и шаг лесенки достижений, BACKLOG 642).
  async function markCompleted(ch: Challenge): Promise<number> {
    const { error: err } = await sb.from('challenge_instances').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', ch.id)
    if (err) throw err
    await reload()
    return instances.value.filter((c) => c.completed).length
  }

  // Правка полей существующего челленджа (тип и дата старта не меняются — см. buildUpdateFromForm).
  async function updateChallenge(ch: Challenge, form: CustomChallengeFormInput) {
    const userId = requireUserId()
    const { error: err } = await sb.from('challenge_instances').update(buildUpdateFromForm(form, ch.type, ch)).eq('id', ch.id).eq('user_id', userId)
    if (err) throw err
    await reload()
  }

  async function abandonChallenge(ch: Challenge) {
    const { error: err } = await sb.from('challenge_instances').update({ active: false }).eq('id', ch.id)
    if (err) throw err
    await reload()
  }

  return {
    auth,
    instances,
    entriesByChallenge,
    metrics,
    effectiveEntries,
    sourceMetricName,
    exercises,
    sourceExerciseName,
    error,
    init,
    reload,
    startFromTemplate,
    startCustom,
    updateChallenge,
    upsertDailyEntry,
    addCumulativeEntry,
    deleteEntry,
    markCompleted,
    abandonChallenge,
  }
}
