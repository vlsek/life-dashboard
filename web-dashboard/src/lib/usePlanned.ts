import { getCurrentScope, onScopeDispose, ref } from 'vue'
import { sb } from './supabase'
import { addDaysIso, todayStr } from './date'
import { notifyDataChanged } from './events'
import {
  CARRY_OVER_DAYS,
  addCustom,
  addGoal,
  appendCarried,
  editCustom,
  nowHHMM,
  setDoneAt,
  carryOverCandidates,
  goalOptions,
  monthGoalsFor,
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
import { addManyToNextDay, addToNextDay, canPostpone } from './planPostpone'
import { applyTemplate, type TemplateItem } from './planTemplates'
// Композабл блока «Планы» (раньше «Цели на сегодня») (план на день). Портировано из renderPlanned()/
// openCarryOverModal() в dashboard.js. load(userId, date) — после auth 'ready' и при смене даты.
// После КАЖДОЙ записи шлёт dashboard:data-changed — кольца дня/недели и стрики пересчитает useDashboard.
export function usePlanned() {
  const planned = ref<PlannedEntry[]>([])
  const goals = ref<PlanGoal[]>([])
  // id целей с горизонтом «неделя» и «месяц» (миграции 084/086; нет колонки — запрос вернёт ошибку, и список просто пуст)
  const monthIds = ref<Set<string>>(new Set())
  const loaded = ref(false)
  const loadedDate = ref('') // день, чей план сейчас лежит в `planned` (при листании дат до ответа базы там ещё прошлый день) — для моста planBridge
  const error = ref<string | null>(null)
  const notice = ref<string | null>(null) // информационное сообщение (в оригинале — тост)
  // Галочка «сохранено» на ~0,9 с после ПОДТВЕРЖДЁННОЙ записи плана или отметки цели (BACKLOG 784/819, срез 4); при ошибке не включается.
  const savedTick = ref(false)
  let savedTimer: ReturnType<typeof setTimeout> | undefined
  function flashSaved() {
    savedTick.value = true
    clearTimeout(savedTimer)
    savedTimer = setTimeout(() => (savedTick.value = false), 900)
  }
  if (getCurrentScope()) onScopeDispose(() => clearTimeout(savedTimer))
  let userId = ''
  let date = ''

  async function load(uid: string, dateStr: string) {
    userId = uid
    date = dateStr
    const [noteRes, goalsRes, monthRes, weekRes] = await Promise.all([
      sb.from('daily_notes').select('planned_goals').eq('user_id', uid).eq('date', dateStr).maybeSingle(),
      sb.from('goals').select('id, name, stages, done, current_stage, done_date').eq('user_id', uid),
      sb.from('goals').select('id').eq('user_id', uid).eq('horizon', 'month').eq('done', false),
      sb.from('goals').select('id').eq('user_id', uid).eq('horizon', 'week').eq('done', false), // миграция 086; нет её — ошибка, неделя просто пуста
    ])
    const err = noteRes.error?.message || goalsRes.error?.message
    error.value = err ? friendlyError(err, 'load') : null
    planned.value = normalizePlanned(noteRes.data?.planned_goals)
    loadedDate.value = dateStr
    saved = planned.value
    version++ // ответ на загрузку новее любых незавершённых откатов предыдущей даты
    goals.value = (goalsRes.data || []) as PlanGoal[]
    const idsOf = (r: { error?: unknown; data?: unknown } | undefined): string[] => (r?.error ? [] : ((r?.data || []) as { id: string }[]).map((x) => x.id))
    monthIds.value = new Set([...idsOf(monthRes), ...idsOf(weekRes)])
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
      flashSaved()
      return true
    })
    chain = run.catch(() => undefined)
    return run
  }

  const addCustomItem = (text: string, time?: string | null, done = false, repeat?: string | null) => persist(addCustom(planned.value, text, time, done, repeat))
  const addGoalItem = (name: string, time?: string | null) => persist(addGoal(planned.value, name, time))
  const removeItem = (index: number) => persist(removeAt(planned.value, index))
  const toggleItemBonus = (index: number) => persist(toggleBonus(planned.value, index))
  // Время выполнения ставится само (BACKLOG 61.4), но только когда открыт СЕГОДНЯШНИЙ день: отметка в плане прошлого дня «сейчас» была бы ложью.
  const nowIfToday = () => (date === todayStr() ? nowHHMM() : null)
  // Применить шаблон дня (BACKLOG 75.12): пункты, которых в дне ещё нет, дописываются в конец невыполненными; уже имеющиеся (тот же текст
  // и время) не дублируются. null — запись не удалась (ошибка уже показана), иначе сколько добавлено и сколько уже было.
  async function applyTemplateItems(items: TemplateItem[]): Promise<{ added: number; skipped: number } | null> {
    const r = applyTemplate(planned.value, items)
    if (r.added === 0) return { added: 0, skipped: r.skipped }
    const ok = await persist(r.list)
    return ok ? { added: r.added, skipped: r.skipped } : null
  }
  // «Отложить на завтра» (BACKLOG 75.9, срез 2): пункт переезжает в план СЛЕДУЮЩЕГО дня. Порядок важен: сначала дописываем завтра (читаем план
  // завтра, добавляем без дубля), и только потом снимаем с сегодняшнего. Если первый шаг не удался — пункт остаётся сегодня (ничего не теряем);
  // если не удался второй — пункт лежит в обоих днях (дубль лучше потери), а ошибка показана. Возвращает true, если пункт больше не сегодняшний.
  async function postponeItem(index: number): Promise<boolean> {
    const it = planned.value[index]
    if (!it || !canPostpone(it) || !userId) return false
    const target = addDaysIso(date, 1)
    const { data, error: readErr } = await sb.from('daily_notes').select('planned_goals').eq('user_id', userId).eq('date', target).maybeSingle()
    if (readErr) {
      error.value = friendlyError(readErr, 'load')
      return false
    }
    const { list, duplicate } = addToNextDay(normalizePlanned(data?.planned_goals), it)
    if (!duplicate) {
      const { error: writeErr } = await sb.from('daily_notes').upsert({ user_id: userId, date: target, planned_goals: list }, { onConflict: 'user_id,date' })
      if (writeErr) {
        error.value = friendlyError(writeErr)
        return false
      }
      notifyDataChanged({ source: 'plan', date: target })
    }
    // за время запросов список мог измениться — ищем тот же пункт заново (сначала по ссылке, затем по тексту и времени)
    let at = planned.value.indexOf(it)
    if (at < 0) at = planned.value.findIndex((x) => canPostpone(x) && x.text === it.text && (x.time ?? '') === (it.time ?? ''))
    if (at < 0) return true // уже снят
    return removeItem(at)
  }
  // Перенести на завтра несколько пунктов за один раз (вечерний шаг, BACKLOG 75.12 срез 2). Порядок и гарантии те же, что у postponeItem:
  // сначала план завтра (читаем, дописываем без дублей, ОДНА запись), потом одним сохранением снимаем эти пункты с сегодняшнего.
  // Сбой первого шага — всё остаётся сегодня; второго — пункты в обоих днях (дубль лучше потери). Возвращает сколько пунктов снято с сегодняшнего
  // дня и сколько из них завтра уже было, либо null при сбое.
  async function postponeMany(indices: number[]): Promise<{ moved: number; alreadyThere: number } | null> {
    const picked = [...new Set(indices)].map((i) => planned.value[i]).filter((x): x is PlannedEntry => !!x && canPostpone(x))
    if (!picked.length || !userId) return null
    const target = addDaysIso(date, 1)
    const { data, error: readErr } = await sb.from('daily_notes').select('planned_goals').eq('user_id', userId).eq('date', target).maybeSingle()
    if (readErr) {
      error.value = friendlyError(readErr, 'load')
      return null
    }
    const { list, added, duplicates } = addManyToNextDay(normalizePlanned(data?.planned_goals), picked)
    if (added > 0) {
      const { error: writeErr } = await sb.from('daily_notes').upsert({ user_id: userId, date: target, planned_goals: list }, { onConflict: 'user_id,date' })
      if (writeErr) {
        error.value = friendlyError(writeErr)
        return null
      }
      notifyDataChanged({ source: 'plan', date: target })
    }
    // за время запросов список мог измениться: снимаем те же пункты (по ссылке, иначе по тексту и времени), чужие и изменённые не трогаем
    const gone = (x: PlannedEntry) => picked.some((p) => p === x || (canPostpone(x) && x.text === p.text && (x.time ?? '') === (p.time ?? '')))
    const next = planned.value.filter((x) => !gone(x))
    const moved = planned.value.length - next.length
    if (moved > 0 && !(await persist(next))) return null
    return { moved, alreadyThere: duplicates }
  }
  const setItemDone = (index: number, done: boolean) => persist(setCustomDone(planned.value, index, done, nowIfToday()))
  const editItem = (index: number, patch: { text: string; time?: string | null; doneAt?: string | null }) => persist(editCustom(planned.value, index, patch))
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
    flashSaved()
    // пункт-цель плана запоминает время отметки (снятие галки — убирает); ошибка записи плана сюда не влияет на саму цель
    const idx = planned.value.findIndex((p) => p.type === 'goal' && p.text === goal.name)
    if (idx >= 0) {
      const at = done ? nowIfToday() : null
      if (at !== null || planned.value[idx].doneAt) void persist(setDoneAt(planned.value, idx, at)) // лишней записи плана нет, если время ни ставить, ни снимать не надо
    }
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
  const monthGoals = () => monthGoalsFor(goals.value, monthIds.value, planned.value, date, todayStr())

  return {
    planned, goals, loaded, loadedDate, error, notice, savedTick, load,
    addCustomItem, addGoalItem, createGoalInPlan, removeItem, postponeItem, postponeMany, applyTemplateItems, toggleItemBonus, setItemDone, editItem, setItemTime, setGoalDone, loadCarryOver, carryOver, availableGoals, monthGoals,
  }
}
