import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { todayStr } from './date'
import { computeDayProgressPure, computeWeekProgressPure, getWeekDates, type GoalLite, type PlannedItem, type ProgressResult } from './progress'
import { daySummary, weekSummary, type ProgressSummary } from './progressSummary'
import { getDayProgressSettings, setDayProgressSettings, type DayProgressSettings } from './progressSettings'
import { DATA_CHANGED } from './events'
import type { Metric } from './types'

// Кольца дня/недели для шапки ЛЮБОЙ страницы (BACKLOG 2.3). Тот же расчёт, что в useDashboard.loadAll(), но без
// стриков. Пересчёт: по событию DATA_CHANGED (вода из этого же бандла или Дашборд), когда вкладка снова видна и
// когда окно получает фокус — другие страницы (Цели, Тренировки...) пишут в БД, не зная про шапку.
export function useHeaderProgress() {
  const day = ref<ProgressResult | null>(null)
  const week = ref<ProgressResult | null>(null)
  const summaries = ref<{ day: ProgressSummary; week: ProgressSummary } | null>(null)
  const settings = ref<DayProgressSettings>(getDayProgressSettings())
  let userId: string | null = null
  let running = false
  let queued = false

  async function load() {
    if (!userId) return
    if (running) {
      queued = true
      return
    }
    running = true
    try {
      await loadAll(userId)
    } finally {
      running = false
      if (queued) {
        queued = false
        void load()
      }
    }
  }

  async function loadAll(uid: string) {
    const [metricsRes, valuesRes, notesRes, goalsRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', uid).eq('active', true).order('position'),
      fetchAllRows<{ date: string; metric_id: string; value: unknown }>((from, to) =>
        sb.from('daily_values').select('date, metric_id, value').eq('user_id', uid).order('date').order('metric_id').range(from, to),
      ),
      fetchAllRows<{ date: string; planned_goals?: PlannedItem[] }>((from, to) =>
        sb.from('daily_notes').select('date, planned_goals').eq('user_id', uid).order('date').range(from, to),
      ),
      sb.from('goals').select('name, stages, done, current_stage').eq('user_id', uid),
    ])
    if (metricsRes.error || valuesRes.error || notesRes.error || goalsRes.error) return // шапка молча остаётся с прошлыми значениями

    const metrics = (metricsRes.data || []) as Metric[]
    const byDay: Record<string, Record<string, unknown>> = {}
    for (const v of valuesRes.rows) (byDay[v.date] ||= {})[v.metric_id] = v.value
    const planned: Record<string, PlannedItem[]> = {}
    for (const n of notesRes.rows) planned[n.date] = n.planned_goals || []
    const allGoals = (goalsRes.data || []) as GoalLite[]

    const s = getDayProgressSettings()
    settings.value = s
    const today = todayStr()
    day.value = computeDayProgressPure(s, metrics, byDay[today] || {}, today, planned[today] || [], allGoals)
    const pastOrToday = getWeekDates(new Date()).filter((d) => d <= today)
    const plannedByDate: Record<string, PlannedItem[]> = {}
    for (const d of pastOrToday) plannedByDate[d] = planned[d] || []
    week.value = computeWeekProgressPure(s, metrics, byDay, pastOrToday, plannedByDate, allGoals)
    summaries.value = {
      day: daySummary(s, metrics, byDay[today] || {}, today, planned[today] || [], allGoals),
      week: weekSummary(s, metrics, byDay, pastOrToday, plannedByDate, allGoals),
    }
  }

  function onVisible() {
    if (document.visibilityState === 'visible') void load()
  }
  onMounted(() => {
    window.addEventListener(DATA_CHANGED, load)
    window.addEventListener('focus', load)
    document.addEventListener('visibilitychange', onVisible)
  })
  onBeforeUnmount(() => {
    window.removeEventListener(DATA_CHANGED, load)
    window.removeEventListener('focus', load)
    document.removeEventListener('visibilitychange', onVisible)
  })

  async function init(uid: string) {
    userId = uid
    await load()
  }

  async function saveSettings(s: DayProgressSettings) {
    setDayProgressSettings(s)
    await load()
  }

  return { day, week, summaries, settings, init, saveSettings }
}
