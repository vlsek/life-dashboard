import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { buildInsertRow, buildUpdateRow, stageResult, stepStage } from './goals'
import type { Goal, GoalFormInput } from './types'
import { completionDelta, emitPointsFloat } from './pointsFloat'

// Очки цели по умолчанию — как в балансе (balance.ts / web-shop points.ts): пусто → 5
const GOAL_DEFAULT_POINTS = 5

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
  // id целей, у которых только что подтвердилась запись: на ~0,9 с показываем галочку «сохранено» (BACKLOG 23:25 / 815, срез 3)
  const flashed = ref<Record<string, boolean>>({})

  function flash(id: string) {
    flashed.value = { ...flashed.value, [id]: true }
    setTimeout(() => {
      const { [id]: _drop, ...rest } = flashed.value
      flashed.value = rest
    }, 900)
  }

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
      error.value = err.message // «Цели» показывают ошибку через friendlyError в App.vue (loadError) — здесь сырой текст нужен для классификации
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
    // правка числа этапов может сама закрыть/открыть многоэтапную цель (patch.done) — баллы идут по новым очкам цели
    if (typeof patch.done === 'boolean') emitPointsFloat(completionDelta(!!existing.done, patch.done, Number(patch.points) || GOAL_DEFAULT_POINTS, GOAL_DEFAULT_POINTS))
    await reload()
    flash(existing.id)
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
    emitPointsFloat(completionDelta(!!g.done, done, g.points, GOAL_DEFAULT_POINTS))
    await reload()
    flash(g.id)
  }

  async function stepGoal(g: Goal, delta: number) {
    const { current_stage, done } = stepStage(g, delta)
    const { error: err } = await sb.from('goals').update({ current_stage, done, done_date: done ? todayStr() : null }).eq('id', g.id)
    if (err) throw err
    emitPointsFloat(completionDelta(!!g.done, done, g.points, GOAL_DEFAULT_POINTS))
    await reload()
    flash(g.id)
  }

  // Выставить прогресс многоэтапной цели сразу до этапа `target` (тап по этапу в карточке, BACKLOG 7.1)
  async function setStage(g: Goal, target: number) {
    const { current_stage, done } = stageResult(g.stages ?? 1, target)
    const { error: err } = await sb.from('goals').update({ current_stage, done, done_date: done ? todayStr() : null }).eq('id', g.id)
    if (err) throw err
    emitPointsFloat(completionDelta(!!g.done, done, g.points, GOAL_DEFAULT_POINTS))
    await reload()
    flash(g.id)
  }

  return { auth, items, error, flashed, init, reload, addGoal, updateGoal, deleteGoal, toggleGoal, stepGoal, setStage }
}
