import { ref } from 'vue'
import { sb } from './supabase'
import type { HistoryContext } from './stats'
import type { DailyNote, DayProgressSettings, Metric, MetricValue } from './types'
import { fmtDate, todayStr } from './date'

// Те же ключ и формат, что у getDayProgressSettings() в config.js — читаем настройки,
// сохранённые на этом же устройстве через основной сайт.
function getDayProgressSettings(): DayProgressSettings {
  const defaults: DayProgressSettings = {
    enabled: true,
    includePlanned: true,
    includeMetrics: true,
    dayPlace: 'avatar',
    weekPlace: 'profile',
  }
  try {
    const raw = localStorage.getItem('day_progress_settings')
    if (!raw) return defaults
    const saved = JSON.parse(raw)
    return { ...defaults, ...saved }
  } catch {
    return defaults
  }
}

// Supabase отдаёт максимум 1000 строк за запрос — без постраничного чтения история и
// проценты у давних пользователей считались бы по обрезанным данным (тот же баг, что
// был и на ванильном сайте, см. v0.56).
const PAGE_SIZE = 1000
async function fetchAllRows<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < PAGE_SIZE) break
  }
  return rows
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

export function useAuthAndData() {
  const auth = ref<AuthState>({ status: 'loading' })
  const ctx = ref<HistoryContext | null>(null)
  const error = ref<string | null>(null)

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

    auth.value = { status: 'ready', userId, userEmail }
    await loadData(userId)
  }

  async function loadData(userId: string) {
    try {
      const [metricsRes, values, notes, goalsRes] = await Promise.all([
        sb.from('metrics').select('*').eq('user_id', userId).eq('active', true).order('position'),
        fetchAllRows<{ date: string; metric_id: string; value: MetricValue }>((from, to) =>
          sb.from('daily_values').select('*').eq('user_id', userId).order('date').order('metric_id').range(from, to),
        ),
        fetchAllRows<DailyNote>((from, to) =>
          sb.from('daily_notes').select('date, items, planned_goals').eq('user_id', userId).order('date').range(from, to),
        ),
        sb.from('goals').select('name, stages, done, current_stage').eq('user_id', userId),
      ])
      if (metricsRes.error) throw metricsRes.error

      const metrics = (metricsRes.data || []) as Metric[]
      const byDate: Record<string, Record<string, MetricValue>> = {}
      for (const v of values) {
        ;(byDate[v.date] ||= {})[v.metric_id] = v.value
      }
      const notesByDate: Record<string, DailyNote> = {}
      for (const n of notes) {
        notesByDate[n.date] = n
      }
      let firstDate: string | null = null
      for (const d of [...Object.keys(byDate), ...Object.keys(notesByDate)]) {
        if (!firstDate || d < firstDate) firstDate = d
      }

      ctx.value = {
        metrics,
        byDate,
        notesByDate,
        goals: goalsRes.data || [],
        settings: getDayProgressSettings(),
        firstDate,
        today: todayStr(),
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
    }
  }

  init()

  return { auth, ctx, error }
}

export { fmtDate }
