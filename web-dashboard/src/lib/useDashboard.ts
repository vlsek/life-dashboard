import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { fmtDate, todayStr } from './date'
import { computeStreakItemsPure, type StreakItem } from './streaks'
import { computeDayProgressPure, computeWeekProgressPure, getWeekDates, type ProgressResult, type PlannedItem, type GoalLite } from './progress'
import { getDayProgressSettings, setDayProgressSettings, type DayProgressSettings } from './progressSettings'
import { DATA_CHANGED } from './events'
import type { Metric } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

export function useDashboard() {
  const auth = ref<AuthState>({ status: 'loading' })
  const streaks = ref<StreakItem[]>([])
  const dayProgress = ref<ProgressResult | null>(null)
  const weekProgress = ref<ProgressResult | null>(null)
  const progressSettings = ref<DayProgressSettings>(getDayProgressSettings())
  const loadError = ref<string | null>(null)

  let currentUserId: string | null = null

  // Пересчёт стриков и колец после действий в других блоках. Один запрос за раз: пока идёт
  // загрузка, новые события лишь помечают «нужен ещё один проход» (как Running/Queued в
  // refreshStreakBadge() в dashboard.js) — быстрые нажатия «+250 мл» не плодят запросы.
  let refreshing = false
  let refreshQueued = false
  async function refresh() {
    if (!currentUserId) return
    if (refreshing) {
      refreshQueued = true
      return
    }
    refreshing = true
    try {
      await loadAll(currentUserId)
    } finally {
      refreshing = false
      if (refreshQueued) {
        refreshQueued = false
        void refresh()
      }
    }
  }
  onMounted(() => window.addEventListener(DATA_CHANGED, refresh))
  onBeforeUnmount(() => window.removeEventListener(DATA_CHANGED, refresh))

  async function init() {
    const { data } = await sb.auth.getSession()
    const session = data.session
    if (!session) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/login.html'
      return
    }
    const userId = session.user.id
    const userEmail = session.user.email ?? null

    const { data: profile } = await sb.from('profiles').select('onboarded').eq('user_id', userId).maybeSingle()
    if (!profile?.onboarded) {
      auth.value = { status: 'redirecting' }
      window.location.href = '/onboarding.html'
      return
    }

    currentUserId = userId
    auth.value = { status: 'ready', userId, userEmail }
    await loadAll(userId)
  }

  // Один поход за данными для стриков + дневного/недельного прогресса — все три расчёта
  // читают в основном одни и те же таблицы (metrics/daily_values/daily_notes/goals), портировано
  // из computeStreakItems()/computeDayProgress()/computeWeekProgress() в dashboard.js, но с общим
  // fetch вместо трёх независимых.
  async function loadAll(userId: string) {
    const [metricsRes, valuesRes, notesRes, goalsRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true).order('position'),
      // Supabase отдаёт максимум 1000 строк за запрос — без постраничного чтения у пользователя
      // с длинной историей стрики и прогресс считались бы по обрезанным данным.
      fetchAllRows<{ date: string; metric_id: string; value: unknown }>((from, to) =>
        sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).order('date').order('metric_id').range(from, to),
      ),
      fetchAllRows<{ date: string; items?: unknown[]; planned_goals?: PlannedItem[] }>((from, to) =>
        sb.from('daily_notes').select('date, items, planned_goals').eq('user_id', userId).order('date').range(from, to),
      ),
      sb.from('goals').select('name, stages, done, current_stage').eq('user_id', userId),
    ])
    const firstError = metricsRes.error?.message || valuesRes.error || notesRes.error || goalsRes.error?.message
    if (firstError) {
      loadError.value = firstError
      return
    }
    loadError.value = null

    const metrics = (metricsRes.data || []) as Metric[]
    const byDay: Record<string, Record<string, unknown>> = {}
    for (const v of valuesRes.rows) {
      ;(byDay[v.date] ||= {})[v.metric_id] = v.value
    }
    const notesByDate: Record<string, { items?: unknown[]; planned_goals?: PlannedItem[] }> = {}
    for (const n of notesRes.rows) {
      notesByDate[n.date] = n as any
    }
    const noteDays = new Set(
      Object.entries(notesByDate)
        .filter(([, n]) => Array.isArray(n.items) && n.items.length > 0)
        .map(([d]) => d),
    )
    const allGoals = (goalsRes.data || []) as GoalLite[]

    streaks.value = computeStreakItemsPure(metrics, byDay, noteDays, new Date())

    const settings = getDayProgressSettings()
    progressSettings.value = settings
    const today = todayStr()
    dayProgress.value = computeDayProgressPure(
      settings,
      metrics,
      byDay[today] || {},
      today,
      notesByDate[today]?.planned_goals || [],
      allGoals,
    )

    const weekDates = getWeekDates(new Date())
    const pastOrToday = weekDates.filter((d) => d <= today)
    const plannedByDate: Record<string, PlannedItem[]> = {}
    for (const d of pastOrToday) plannedByDate[d] = notesByDate[d]?.planned_goals || []
    weekProgress.value = computeWeekProgressPure(settings, metrics, byDay, pastOrToday, plannedByDate, allGoals)
  }

  async function saveProgressSettings(s: DayProgressSettings) {
    setDayProgressSettings(s)
    if (currentUserId) await loadAll(currentUserId)
  }

  return { auth, streaks, dayProgress, weekProgress, progressSettings, loadError, init, refresh, saveProgressSettings }
}

export { fmtDate }
