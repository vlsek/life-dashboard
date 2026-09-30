import { ref } from 'vue'
import { sb } from './supabase'
import { fmtDate } from './date'
import { normalizePlanned } from './calendar'
import type { PlannedItem } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в useMilestones.ts (web-milestones/) —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useCalendar() {
  const auth = ref<AuthState>({ status: 'loading' })
  const byDate = ref<Record<string, PlannedItem[]>>({})
  const error = ref<string | null>(null)

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
  }

  async function loadMonth(userId: string, year: number, month: number) {
    const from = fmtDate(new Date(year, month, 1))
    const to = fmtDate(new Date(year, month + 1, 0))
    const { data, error: err } = await sb.from('daily_notes').select('date, planned_goals').eq('user_id', userId).gte('date', from).lte('date', to)
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    const next: Record<string, PlannedItem[]> = {}
    for (const n of data || []) next[n.date] = normalizePlanned(n.planned_goals)
    byDate.value = next
  }

  async function savePlanned(userId: string, dateStr: string, planned: PlannedItem[]) {
    const { error: err } = await sb.from('daily_notes').upsert({ user_id: userId, date: dateStr, planned_goals: planned }, { onConflict: 'user_id,date' })
    if (err) throw err
    byDate.value = { ...byDate.value, [dateStr]: planned }
  }

  return { auth, byDate, error, init, loadMonth, savePlanned }
}
