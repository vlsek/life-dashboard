import { ref } from 'vue'
import { sb } from './supabase'
import { MUSCLE_IDS, type MuscleId } from './muscles'
import { WEEK_TARGET } from './todayFocus'

// BACKLOG 80.5 «Свои цели подходов по группам»: подходов в неделю на группу мышц. Нет записи — WEEK_TARGET (10). Хранение: profiles.muscle_goals
// (миграция 117) + localStorage как запасной слой; без колонки цели живут только на этом устройстве. Чистая нормализация отдельно от сети.
export type MuscleGoals = Partial<Record<MuscleId, number>>
export const GOALS_KEY = 'workout_muscle_goals'
export const GOAL_PRESETS = [
  { id: 'maintain', n: 6 },
  { id: 'normal', n: WEEK_TARGET },
  { id: 'priority', n: 15 },
] as const
export const GOAL_MAX = 60

// Только известные группы и целые 1..60; значение по умолчанию не храним (запись «10» — то же, что её отсутствие).
export function normalizeGoals(raw: unknown): MuscleGoals {
  const out: MuscleGoals = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const m of MUSCLE_IDS) {
    const v = (raw as Record<string, unknown>)[m]
    if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= GOAL_MAX && v !== WEEK_TARGET) out[m] = v
  }
  return out
}

export const goalFor = (goals: MuscleGoals, m: MuscleId): number => goals[m] ?? WEEK_TARGET

function readLocal(): MuscleGoals {
  try {
    return normalizeGoals(JSON.parse(localStorage.getItem(GOALS_KEY) || 'null'))
  } catch {
    return {}
  }
}
function writeLocal(g: MuscleGoals): void {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(g))
  } catch {
    /* хранилище недоступно — цель просто не сохранится на устройстве */
  }
}

// Общее состояние: карта мышц и блок «Что тренировать сегодня» читают одни и те же цели.
export const muscleGoals = ref<MuscleGoals>(readLocal())
let uid: string | null = null

export async function saveGoalsToProfile(userId: string, g: MuscleGoals): Promise<boolean> {
  const { error } = await sb.from('profiles').upsert({ user_id: userId, muscle_goals: g })
  return !error
}

// Правила как у программы (programSync): колонки нет — остаёмся на устройстве; в профиле объект (даже пустой) — он главный;
// в профиле null, а на устройстве цели есть — один раз загружаем их в профиль. Сброс пишет {} (не null), чтобы он не «воскресал».
export async function syncGoalsFromProfile(userId: string): Promise<MuscleGoals> {
  uid = userId
  const { data, error } = await sb.from('profiles').select('muscle_goals').eq('user_id', userId).maybeSingle()
  if (error) return muscleGoals.value
  const raw = (data as { muscle_goals?: unknown } | null)?.muscle_goals
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    muscleGoals.value = normalizeGoals(raw)
    writeLocal(muscleGoals.value)
  } else if (Object.keys(muscleGoals.value).length) {
    void saveGoalsToProfile(userId, muscleGoals.value)
  }
  return muscleGoals.value
}

// Задать цель группе (null / значение по умолчанию — убрать свою).
export function setGoal(m: MuscleId, n: number | null): void {
  const next = { ...muscleGoals.value }
  if (n === null || n === WEEK_TARGET) delete next[m]
  else Object.assign(next, normalizeGoals({ [m]: n }))
  muscleGoals.value = next
  writeLocal(next)
  if (uid) void saveGoalsToProfile(uid, next)
}
