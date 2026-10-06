import { ref } from 'vue'
import { sb } from './supabase'
import { fmtDate } from './date'
import { groupDeadlines, normalizePlanned } from './calendar'
import type { GoalDeadline, PlannedItem } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в useMilestones.ts (web-milestones/) —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useCalendar() {
  const auth = ref<AuthState>({ status: 'loading' })
  const byDate = ref<Record<string, PlannedItem[]>>({})
  const deadlines = ref<Record<string, GoalDeadline[]>>({})
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
    const [notesRes, goalsRes] = await Promise.all([
      sb.from('daily_notes').select('date, planned_goals').eq('user_id', userId).gte('date', from).lte('date', to),
      sb.from('goals').select('id, name, done, deadline').eq('user_id', userId).gte('deadline', from).lte('deadline', to),
    ])
    const { data, error: err } = notesRes
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    const next: Record<string, PlannedItem[]> = {}
    for (const n of data || []) next[n.date] = normalizePlanned(n.planned_goals)
    byDate.value = next
    // ошибка чтения целей календарь не ломает: просто нет маркеров сроков
    deadlines.value = goalsRes.error ? {} : groupDeadlines(goalsRes.data)
  }

  async function savePlanned(userId: string, dateStr: string, planned: PlannedItem[]) {
    const { error: err } = await sb.from('daily_notes').upsert({ user_id: userId, date: dateStr, planned_goals: planned }, { onConflict: 'user_id,date' })
    if (err) throw err
    byDate.value = { ...byDate.value, [dateStr]: planned }
  }

  return { auth, byDate, deadlines, error, init, loadMonth, savePlanned }
}
