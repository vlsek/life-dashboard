import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { buildInsertRow, buildUpdateRow, stageResult, stepStage } from './goals'
import type { Goal, GoalFormInput } from './types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'redirecting' }
  | { status: 'ready'; userId: string; userEmail: string | null }

// Тот же паттерн session/onboarded redirect, что и в useMilestones.ts/useCalendar.ts —
// портировано из requireAuth()/requireOnboarded() в config.js.
export function useGoals() {
  const auth = ref<AuthState>({ status: 'loading' })
  const items = ref<Goal[]>([])
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
    await load(userId)
  }

  async function load(userId: string) {
    const { data, error: err } = await sb.from('goals').select('*').eq('user_id', userId).order('created_at')
    if (err) {
      error.value = err.message
      return
    }
    error.value = null
    items.value = (data || []) as Goal[]
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  async function addGoal(userId: string, res: GoalFormInput, noCategoryLabel: string) {
    const row = buildInsertRow(res, noCategoryLabel)
    const { error: err } = await sb.from('goals').insert({ user_id: userId, ...row })
    if (err) throw err
    await reload()
  }

  async function updateGoal(existing: Goal, res: GoalFormInput, noCategoryLabel: string) {
    const patch = buildUpdateRow(res, existing, noCategoryLabel)
    const { error: err } = await sb.from('goals').update(patch).eq('id', existing.id)
    if (err) throw err
    await reload()
  }

  async function deleteGoal(id: string) {
    const { error: err } = await sb.from('goals').delete().eq('id', id)
    if (err) throw err
    await reload()
  }

  async function toggleGoal(g: Goal) {
    const done = !g.done
    const { error: err } = await sb.from('goals').update({ done, done_date: done ? todayStr() : null }).eq('id', g.id)
    if (err) throw err
    await reload()
  }

  async function stepGoal(g: Goal, delta: number) {
    const { current_stage, done } = stepStage(g, delta)
    const { error: err } = await sb.from('goals').update({ current_stage, done, done_date: done ? todayStr() : null }).eq('id', g.id)
    if (err) throw err
    await reload()
  }

  // Выставить прогресс многоэтапной цели сразу до этапа `target` (тап по этапу в карточке, BACKLOG 7.1)
  async function setStage(g: Goal, target: number) {
    const { current_stage, done } = stageResult(g.stages ?? 1, target)
    const { error: err } = await sb.from('goals').update({ current_stage, done, done_date: done ? todayStr() : null }).eq('id', g.id)
    if (err) throw err
    await reload()
  }

  return { auth, items, error, init, reload, addGoal, updateGoal, deleteGoal, toggleGoal, stepGoal, setStage }
}
