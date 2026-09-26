import { ref } from 'vue'
import { sb } from './supabase'
import type { Milestone } from './types'
// MilestoneFormInput/buildRow are wired in once the add/edit forms land (TODO, see
// ROADMAP.md "B-milestones: формы") — addMilestone/updateMilestone below already accept
// a pre-built row so the form component can call buildRow() itself.
import { addInterval } from './milestones'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и useHistoryData.ts (web-history/) —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useMilestones() {
  const auth = ref<AuthState>({ status: 'loading' })
  const items = ref<Milestone[]>([])
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
    await load(userId)
  }

  async function load(userId: string) {
    const { data, error: err } = await sb.from('milestones').select('*').eq('user_id', userId).order('created_at')
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    items.value = (data || []) as Milestone[]
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  async function addMilestone(userId: string, row: ReturnType<typeof import('./milestones').buildRow>) {
    const { error: err } = await sb.from('milestones').insert({ user_id: userId, history: [], done: false, ...row })
    if (err) throw err
    await reload()
  }

  async function updateMilestone(id: string, row: ReturnType<typeof import('./milestones').buildRow>) {
    const { error: err } = await sb.from('milestones').update(row).eq('id', id)
    if (err) throw err
    await reload()
  }

  // "Сделано": переносит регулярную веху на следующий срок, разовую — помечает выполненной.
  async function markDone(m: Milestone, date: string, km: number | null, note: string | null) {
    const history = [...(Array.isArray(m.history) ? m.history : []), { date, km, note }]
    const patch: Record<string, unknown> = { last_date: date, history }
    if (km) patch.last_km = km
    if (m.interval_value && m.interval_unit) patch.due_date = addInterval(date, m.interval_value, m.interval_unit)
    else patch.done = true
    const { error: err } = await sb.from('milestones').update(patch).eq('id', m.id)
    if (err) throw err
    await reload()
  }

  async function deleteMilestone(id: string) {
    const { error: err } = await sb.from('milestones').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  return { auth, items, error, init, reload, addMilestone, updateMilestone, markDone, deleteMilestone }
}
