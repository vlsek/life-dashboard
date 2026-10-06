import { ref } from 'vue'
import { sb } from './supabase'
import { addDaysIso } from './date'
import { notifyDataChanged } from './events'
import {
  CARRY_OVER_DAYS,
  addCustom,
  addGoal,
  appendCarried,
  carryOverCandidates,
  goalOptions,
  normalizePlanned,
  removeAt,
  setCustomDone,
  setTimeAt,
  toggleBonus,
  type CarryCandidate,
  type PlanGoal,
  type PlanNote,
  type CarriedItem,
  type PlannedEntry,
} from './planned'

import { friendlyError } from './friendlyError'
import { createGoal, type GoalFormInput } from './newGoal'
// Композабл блока «Планы» (раньше «Цели на сегодня») (план на день). Портировано из renderPlanned()/
// openCarryOverModal() в dashboard.js. load(userId, date) — после auth 'ready' и при смене даты.
// После КАЖДОЙ записи шлёт dashboard:data-changed — кольца дня/недели и стрики пересчитает useDashboard.
export function usePlanned() {
  const planned = ref<PlannedEntry[]>([])
  const goals = ref<PlanGoal[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)
  const notice = ref<string | null>(null) // информационное сообщение (в оригинале — тост)
  let userId = ''
  let date = ''

  async function load(uid: string, dateStr: string) {
    userId = uid
    date = dateStr
    const [noteRes, goalsRes] = await Promise.all([
      sb.from('daily_notes').select('planned_goals').eq('user_id', uid).eq('date', dateStr).maybeSingle(),
      sb.from('goals').select('id, name, stages, done, current_stage, done_date').eq('user_id', uid),
    ])
    const err = noteRes.error?.message || goalsRes.error?.message
    error.value = err ? friendlyError(err, 'load') : null
    planned.value = normalizePlanned(noteRes.data?.planned_goals)
    saved = planned.value
    version++ // ответ на загрузку новее любых незавершённых откатов предыдущей даты
    goals.value = (goalsRes.data || []) as PlanGoal[]
    loaded.value = true
  }

  // Записи идут строго по очереди: каждая шлёт ВЕСЬ список, и без очереди две быстрые правки
  // могли бы дойти до базы в обратном порядке и затереть более свежую. `saved` — последнее
  // подтверждённое базой состояние: при ошибке САМОЙ СВЕЖЕЙ правки возвращаемся к нему (а не к
  // «предыдущему оптимистичному», которое тоже могло не сохраниться).
  let chain: Promise<unknown> = Promise.resolve()
  let saved: PlannedEntry[] = []
  let version = 0
  function persist(next: PlannedEntry[]): Promise<boolean> {
    const mine = ++version
    planned.value = next // сразу показываем результат
    const run = chain.then(async () => {
      const { error: e } = await sb.from('daily_notes').upsert({ user_id: userId, date, planned_goals: next }, { onConflict: 'user_id,date' })
      if (e) {
        if (mine === version) planned.value = saved // откат, только если поверх не легла более новая правка
        error.value = friendlyError(e)
        return false
      }
      saved = next
      error.value = null
      notifyDataChanged({ source: 'plan', date })
      return true
    })
    chain = run.catch(() => undefined)
    return run
  }

  const addCustomItem = (text: string, time?: string | null, done = false) => persist(addCustom(planned.value, text, time, done))
  const addGoalItem = (name: string, time?: string | null) => persist(addGoal(planned.value, name, time))
  const removeItem = (index: number) => persist(removeAt(planned.value, index))
  const toggleItemBonus = (index: number) => persist(toggleBonus(planned.value, index))
  const setItemDone = (index: number, done: boolean) => persist(setCustomDone(planned.value, index, done))
  const setItemTime = (index: number, time: string | null) => persist(setTimeAt(planned.value, index, time))

  // Отметка одноэтапной цели прямо из плана: пишется в саму цель (done + дата выполнения).
  // doneDate — день, чей план открыт (решение владельца 2026-10-04): отметили в плане вчерашнего дня — цель
  // выполнена вчера; на сегодняшнем дне это то же самое «сегодня», что и раньше.
  async function setGoalDone(goal: PlanGoal, done: boolean, doneDate: string): Promise<boolean> {
    const before = goal.done
    const beforeDate = goal.done_date ?? null
    goals.value = goals.value.map((g) => (g.id === goal.id ? { ...g, done, done_date: done ? doneDate : null } : g))
    const { error: e } = await sb.from('goals').update({ done, done_date: done ? doneDate : null }).eq('id', goal.id)
    if (e) {
      goals.value = goals.value.map((g) => (g.id === goal.id ? { ...g, done: before, done_date: beforeDate } : g))
      error.value = friendlyError(e)
      return false
    }
    error.value = null
    notifyDataChanged({ source: 'plan', date })
    return true
  }

  // Кандидаты на перенос — читаем только окно в 7 дней, а не всю таблицу заметок.
  async function loadCarryOver(): Promise<CarryCandidate[]> {
    const { data, error: e } = await sb
      .from('daily_notes')
      .select('date, planned_goals')
      .eq('user_id', userId)
      .gte('date', addDaysIso(date, -CARRY_OVER_DAYS))
      .lt('date', date)
    if (e) {
      error.value = friendlyError(e)
      return []
    }
    return carryOverCandidates((data || []) as PlanNote[], date, planned.value)
  }

  // Новая цель с главной (BACKLOG раздел 38): сначала запись самой цели (её ошибка летит в окно — форма остаётся открытой), потом постановка в план
  // открытого дня (ошибка плана показывается в блоке, как у остальных правок). Возвращает, встала ли цель в план.
  async function createGoalInPlan(res: GoalFormInput, noCategoryLabel: string, time?: string | null): Promise<boolean> {
    const created = await createGoal(userId, res, noCategoryLabel)
    goals.value = [...goals.value, created]
    notifyDataChanged({ source: 'plan', date }) // цель появилась в «Целях» — кольца и счётчики пересчитаются
    return addGoalItem(created.name, time)
  }

  const carryOver = (items: CarriedItem[]) => persist(appendCarried(planned.value, items))
  const availableGoals = () => goalOptions(goals.value, planned.value)

  return {
    planned, goals, loaded, error, notice, load,
    addCustomItem, addGoalItem, createGoalInPlan, removeItem, toggleItemBonus, setItemDone, setItemTime, setGoalDone, loadCarryOver, carryOver, availableGoals,
  }
}
