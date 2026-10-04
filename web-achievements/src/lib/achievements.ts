// «Достижения» (BACKLOG 19:06, решение владельца 2026-10-03): единый реестр + чистый расчёт прогресса.
// Здесь НЕТ сети, DOM и localStorage — загрузка данных и хранение открытых достижений в useAchievements.ts.
// Награды первого среза — значки; предметы из «Кастомизации» и поздравляющее окно — следующими срезами.
import { addDays, fmtDate } from './date'
import { isMetricDone, metricDayPointsTenths, metricExpectedOn } from './metrics'
import type { Metric, MetricValue, PointsRow } from './types'

// Какие числа считаем по данным пользователя. Достижение = «счётчик >= порог».
export type CounterKey =
  | 'streakBest' // лучшая серия «идеальных дней» (в днях)
  | 'pointsTotal' // накоплено баллов за всё время (не баланс: потраченное в магазине не вычитается)
  | 'metricDone' // сколько раз отмечена метрика (то же число, что даёт 1 балл за выполненную метрику-день)
  | 'weightEntries' // записей веса
  | 'goalsDone'
  | 'skillsMastered'
  | 'booksDone'
  | 'workoutDays' // дней, в которые есть хотя бы одна запись тренировки
  | 'challengesDone'

export type Counters = Record<CounterKey, number>

export type GroupKey = 'streak' | 'points' | 'first' | 'workouts' | 'challenges' | 'goals' | 'books'

export interface AchievementDef {
  key: string
  group: GroupKey
  counter: CounterKey
  target: number
  icon: string // имя SVG-иконки из lib/icons.ts
}

// Порядок групп на странице.
export const GROUP_ORDER: readonly GroupKey[] = ['first', 'streak', 'points', 'workouts', 'challenges', 'goals', 'books']

// Стартовый набор (~20), одобрен владельцем 2026-10-03. Пороги серий — как у поздравлений (DAY_THRESHOLDS в web-dashboard).
export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { key: 'first_metric', group: 'first', counter: 'metricDone', target: 1, icon: 'done' },
  { key: 'first_weight', group: 'first', counter: 'weightEntries', target: 1, icon: 'scale' },
  { key: 'first_goal', group: 'first', counter: 'goalsDone', target: 1, icon: 'goals' },
  { key: 'first_skill', group: 'first', counter: 'skillsMastered', target: 1, icon: 'skills' },
  { key: 'first_book', group: 'first', counter: 'booksDone', target: 1, icon: 'book' },
  { key: 'first_workout', group: 'first', counter: 'workoutDays', target: 1, icon: 'dumbbell' },
  { key: 'streak_5', group: 'streak', counter: 'streakBest', target: 5, icon: 'flame' },
  { key: 'streak_10', group: 'streak', counter: 'streakBest', target: 10, icon: 'flame' },
  { key: 'streak_30', group: 'streak', counter: 'streakBest', target: 30, icon: 'flame' },
  { key: 'streak_100', group: 'streak', counter: 'streakBest', target: 100, icon: 'flame' },
  { key: 'points_100', group: 'points', counter: 'pointsTotal', target: 100, icon: 'coin' },
  { key: 'points_500', group: 'points', counter: 'pointsTotal', target: 500, icon: 'coin' },
  { key: 'points_1000', group: 'points', counter: 'pointsTotal', target: 1000, icon: 'coin' },
  { key: 'workouts_10', group: 'workouts', counter: 'workoutDays', target: 10, icon: 'dumbbell' },
  { key: 'workouts_50', group: 'workouts', counter: 'workoutDays', target: 50, icon: 'dumbbell' },
  { key: 'challenges_1', group: 'challenges', counter: 'challengesDone', target: 1, icon: 'challenges' },
  { key: 'challenges_5', group: 'challenges', counter: 'challengesDone', target: 5, icon: 'challenges' },
  { key: 'goals_10', group: 'goals', counter: 'goalsDone', target: 10, icon: 'goals' },
  { key: 'books_5', group: 'books', counter: 'booksDone', target: 5, icon: 'book' },
]

export interface AchievementState {
  def: AchievementDef
  value: number // текущее значение счётчика
  progress: number // 0..1
  met: boolean // условие выполнено прямо сейчас
}

export function evaluate(counters: Counters, defs: readonly AchievementDef[] = ACHIEVEMENTS): AchievementState[] {
  return defs.map((def) => {
    const value = Math.max(0, counters[def.counter] || 0)
    return { def, value, progress: Math.min(1, value / def.target), met: value >= def.target }
  })
}

// ---- Что уже открыто (хранится в user_achievements / localStorage) ----
// ключ → момент открытия (ISO) или null, если достижение было выполнено ещё до появления раздела (дата неизвестна).
export type Unlocked = Record<string, string | null>

// Служебная запись «раздел уже заглядывал в этот аккаунт»: отличает «первый заход» (всё выполненное — задним числом, без
// даты) от «позже» (новое достижение получает настоящую дату). В списках не показывается и не считается.
export const BASELINE_KEY = '_baseline'

export interface ReconcileResult {
  unlocked: Unlocked // полное состояние после слияния (то, что показывать)
  added: Record<string, string | null> // что НОВОГО нужно записать в хранилище (пусто — писать нечего)
  newlyUnlocked: string[] // открыто именно сейчас (не задним числом) — для будущего поздравляющего окна
}

// Открытое остаётся открытым навсегда: если счётчик потом упал (цель удалили, книгу вернули в «читаю»), значок не пропадает.
export function reconcile(states: AchievementState[], stored: Unlocked, nowIso: string): ReconcileResult {
  const firstVisit = !(BASELINE_KEY in stored)
  const added: Record<string, string | null> = {}
  const newlyUnlocked: string[] = []
  if (firstVisit) added[BASELINE_KEY] = nowIso
  for (const s of states) {
    if (s.def.key in stored || !s.met) continue
    if (firstVisit) {
      added[s.def.key] = null
    } else {
      added[s.def.key] = nowIso
      newlyUnlocked.push(s.def.key)
    }
  }
  return { unlocked: { ...stored, ...added }, added, newlyUnlocked }
}

export function isUnlocked(key: string, unlocked: Unlocked): boolean {
  return key in unlocked && key !== BASELINE_KEY
}

// ---- Расчёт счётчиков ----

export interface ValueRow {
  date: string
  metric_id: string
  value: MetricValue
}

export interface CounterInput {
  metrics: Metric[] // активные; у воды уже подставлена эффективная норма (withWaterGoal)
  values: ValueRow[] // вся история daily_values
  doneGoals: PointsRow[]
  masteredSkills: PointsRow[]
  doneBooks: PointsRow[]
  weightEntries: number
  workoutDates: string[] // даты записей тренировок (повторы допустимы)
  challengesDone: number
  today: Date
}

function groupByDay(values: ValueRow[]): Record<string, Record<string, MetricValue>> {
  const byDay: Record<string, Record<string, MetricValue>> = {}
  for (const v of values) (byDay[v.date] ||= {})[v.metric_id] = v.value
  return byDay
}

// Лучшая серия «идеальных дней» за всю историю — по тем же правилам, что серия на Дашборде (computeStreakItemsPure):
// метрики с count_streak=false не участвуют; день без обязательных по расписанию метрик серию не рвёт и не считается.
// Незавершённый СЕГОДНЯ не обнуляет серию (смотрим по дням до сегодняшнего включительно, но сегодняшний неполный пропускаем).
export function bestPerfectStreak(metrics: Metric[], byDay: Record<string, Record<string, MetricValue>>, today: Date): number {
  const ms = (metrics || []).filter((m) => m.count_streak !== false)
  const days = Object.keys(byDay).sort()
  if (!ms.length || !days.length) return 0
  const expectedOn = (d: string) => ms.filter((m) => metricExpectedOn(m, d))
  const isPerfect = (d: string) => {
    const exp = expectedOn(d)
    return exp.length > 0 && exp.every((m) => isMetricDone(m, byDay[d]?.[m.id], d))
  }
  const todayStr = fmtDate(today)
  let best = 0
  let run = 0
  const cursor = new Date(days[0] + 'T00:00:00')
  for (let i = 0; i < 20000 && fmtDate(cursor) <= todayStr; i++) {
    const d = fmtDate(cursor)
    if (isPerfect(d)) {
      run++
      if (run > best) best = run
    } else if (expectedOn(d).length === 0) {
      // день отдыха по расписанию: серию не рвёт
    } else if (d === todayStr) {
      // сегодня ещё не закончился: не рвём серию (она уже учтена вчерашним днём)
    } else {
      run = 0
    }
    cursor.setTime(addDays(cursor, 1).getTime())
  }
  return best
}

export function computeCounters(input: CounterInput): Counters {
  const byDay = groupByDay(input.values)
  let metricDone = 0
  // Баллы метрик считаем в ДЕСЯТЫХ долях целыми и делим один раз в конце (как calcTotalPoints в web-shop/web-dashboard): выполненная
  // метрика-день — 10, у метрики-подходов с планом и флагом frac (миграция 045) недобор даёт 1…9 десятых. Хвоста плавающей точки нет.
  let dailyTenths = 0
  for (const d of Object.keys(byDay)) {
    for (const m of input.metrics) {
      if (isMetricDone(m, byDay[d][m.id], d)) metricDone++
      dailyTenths += metricDayPointsTenths(m, byDay[d][m.id], d)
    }
  }
  const sum = (rows: PointsRow[], fallback: number) => rows.reduce((s, r) => s + (r.points ?? fallback), 0)
  const otherPoints = sum(input.doneGoals, 5) + sum(input.masteredSkills, 10) + sum(input.doneBooks, 10)
  const pointsTotal = (dailyTenths + Math.round(otherPoints * 10)) / 10
  return {
    streakBest: bestPerfectStreak(input.metrics, byDay, input.today),
    pointsTotal,
    metricDone,
    weightEntries: input.weightEntries,
    goalsDone: input.doneGoals.length,
    skillsMastered: input.masteredSkills.length,
    booksDone: input.doneBooks.length,
    workoutDays: new Set(input.workoutDates).size,
    challengesDone: input.challengesDone,
  }
}

// ---- Для страницы: состояния, разложенные по группам в порядке GROUP_ORDER ----
export interface AchievementGroup {
  group: GroupKey
  items: AchievementState[]
  unlockedCount: number // сколько из группы открыто (по хранилищу, а не по текущему счётчику)
}

export function groupStates(states: AchievementState[], unlocked: Unlocked): AchievementGroup[] {
  return GROUP_ORDER.map((group) => {
    const items = states.filter((s) => s.def.group === group)
    return { group, items, unlockedCount: items.filter((s) => isUnlocked(s.def.key, unlocked)).length }
  }).filter((g) => g.items.length > 0)
}
