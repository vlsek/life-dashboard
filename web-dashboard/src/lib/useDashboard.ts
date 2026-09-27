import { ref } from 'vue'
import { sb } from './supabase'
import { fmtDate } from './date'
import { computeStreakItemsPure, type StreakItem } from './streaks'
import type { Metric } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

export function useDashboard() {
  const auth = ref<AuthState>({ status: 'loading' })
  const streaks = ref<StreakItem[]>([])
  const streaksError = ref<string | null>(null)

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
    await loadStreaks(userId)
  }

  // Тонкая обёртка вокруг computeStreakItemsPure: тянет метрики/значения/заметки и передаёт
  // уже загруженные данные в чистую функцию — портировано из computeStreakItems() в
  // dashboard.js, но fetch и расчёт разделены (расчёт покрыт тестами без сети).
  async function loadStreaks(userId: string) {
    const [metricsRes, valuesRes, notesRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true).order('position'),
      sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId),
      sb.from('daily_notes').select('date, items').eq('user_id', userId),
    ])
    if (metricsRes.error || valuesRes.error || notesRes.error) {
      streaksError.value = (metricsRes.error || valuesRes.error || notesRes.error)!.message
      return
    }
    const metrics = (metricsRes.data || []) as Metric[]
    const byDay: Record<string, Record<string, unknown>> = {}
    for (const v of valuesRes.data || []) {
      ;(byDay[v.date] ||= {})[v.metric_id] = v.value
    }
    const noteDays = new Set(
      (notesRes.data || []).filter((n: any) => Array.isArray(n.items) && n.items.length > 0).map((n: any) => n.date),
    )
    streaksError.value = null
    streaks.value = computeStreakItemsPure(metrics, byDay, noteDays, new Date())
  }

  return { auth, streaks, streaksError, init }
}

export { fmtDate }
