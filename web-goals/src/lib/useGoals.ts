import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { buildInsertRow, buildUpdateRow, stageResult, stepStage } from './goals'
import type { Goal, GoalFormInput } from './types'
import { weightProgress, weightSpecOf } from './weightGoal'
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
  const loaded = ref(false) // первая загрузка закончилась (успехом или ошибкой): до этого «нет …» показывать нельзя — ложная пустота
  // Есть ли колонка goals.horizon (миграция 084): определяем по загруженным целям, а у пустого списка — пробным запросом. Нет колонки — работаем как раньше.
  const hasHorizon = ref(false)
  // Есть ли колонки goals.weight_* (миграция 085) — так же; и последнее измерение веса тела (источник истины для целей на вес).
  const hasWeight = ref(false)
  const bodyWeight = ref<number | null>(null)
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
    try {
      await loadData(userId)
    } finally {
      loaded.value = true
    }
  }

  async function loadData(userId: string) {
    const { data, error: err } = await sb.from('goals').select('*').eq('user_id', userId).order('created_at')
    if (err) {
      error.value = err.message // «Цели» показывают ошибку через friendlyError в App.vue (loadError) — здесь сырой текст нужен для классификации
      return
    }
    error.value = null
    items.value = (data || []) as Goal[]
    if (items.value.length) hasHorizon.value = 'horizon' in items.value[0]
    else hasHorizon.value = !(await sb.from('goals').select('horizon').limit(1)).error
    if (items.value.length) hasWeight.value = 'weight_mode' in items.value[0]
    else hasWeight.value = !(await sb.from('goals').select('weight_mode').limit(1)).error
    await loadBodyWeight(userId)
  }

  // Последнее измерение веса тела (body_stats.weight). Нет записей или ошибка чтения — null: цель считается от стартового веса.
  async function loadBodyWeight(userId: string) {
    const { data, error: err } = await sb.from('body_stats').select('weight').eq('user_id', userId).not('weight', 'is', null).order('date', { ascending: false }).limit(1)
    const w = !err && data && data.length ? Number((data[0] as { weight: number | string }).weight) : NaN
    bodyWeight.value = Number.isFinite(w) ? w : null
  }

  async function reload() {
    if (auth.value.status === 'ready') await load(auth.value.userId)
  }

  async function addGoal(userId: string, res: GoalFormInput, noCategoryLabel: string) {
    const row = buildInsertRow(res, noCategoryLabel, { horizonColumn: hasHorizon.value, weightColumn: hasWeight.value })
    const { error: err } = await sb.from('goals').insert({ user_id: userId, ...row })
    if (err) throw err
    await reload()
  }

  async function updateGoal(existing: Goal, res: GoalFormInput, noCategoryLabel: string) {
    const patch = buildUpdateRow(res, existing, noCategoryLabel, { horizonColumn: hasHorizon.value, weightColumn: hasWeight.value })
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

  // Записать вес из карточки цели: запись за сегодня в body_stats (upsert по user+дата, другие показатели дня не трогаем) — так вес тела
  // и вес цели всегда одно число. Достигли цели — цель закрывается (как последний этап), вернули вес назад — открывается снова.
  async function logWeight(g: Goal, weight: number) {
    if (auth.value.status !== 'ready') return
    const { error: err } = await sb.from('body_stats').upsert({ user_id: auth.value.userId, date: todayStr(), weight }, { onConflict: 'user_id,date' })
    if (err) throw err
    bodyWeight.value = weight
    const spec = weightSpecOf(g)
    if (spec) {
      const done = weightProgress(spec, weight).reached
      if (done !== !!g.done) {
        const { error: err2 } = await sb.from('goals').update({ done, done_date: done ? todayStr() : null }).eq('id', g.id)
        if (err2) throw err2
        emitPointsFloat(completionDelta(!!g.done, done, g.points, GOAL_DEFAULT_POINTS))
      }
    }
    await reload()
    flash(g.id)
  }

  return { auth, items, error, loaded, hasHorizon, hasWeight, bodyWeight, logWeight, flashed, init, reload, addGoal, updateGoal, deleteGoal, toggleGoal, stepGoal, setStage }
}
