import { sb } from './supabase'

// Вода «выполнена» по ЭФФЕКТИВНОЙ норме (решение владельца 2026-10-01, вариант «б»; SQL — migrations/033_water_effective_norm.sql).
// Если у метрики воды `goal_value` не задан, её норма — авто-норма (вес × 30 мл, без веса 2000), а не 0: иначе балл за воду
// давало любое записанное значение, даже 100 мл. Правило здесь — зеркало SQL-функций is_water_like / is_weight_like /
// water_auto_norm_ml / metric_null_goal; менять их нужно ВМЕСТЕ. Чистые функции без сети/DOM; сетевой вход — withWaterGoal().
// Как пользоваться: после загрузки метрик для подсчёта «выполнено»/баллов/колец пропустить их через withWaterGoal(userId, metrics).
// НЕ применять к метрикам, которые редактируются формой (Управление метриками): иначе в goal_value «запишется» авто-норма.

export const WATER_ML_PER_KG = 30
export const WATER_DEFAULT_ML = 2000

export interface GoalMetric {
  id: string
  type: string
  goal_value?: number | null
  name?: string | null
  icon?: string | null
  position?: number | null
}

const stripVs16 = (s: string | null | undefined) => (s ?? '').replace(/\uFE0F/g, '').trim()

// Зеркало SQL is_water_like: иконка-капля (svg:droplet, 💧, 💦) или название со словом «вода»/«water».
export function isWaterLike(icon: string | null | undefined, name: string | null | undefined): boolean {
  return ['svg:droplet', '💧', '💦'].includes(stripVs16(icon)) || /вода|water/i.test(name ?? '')
}

// Зеркало SQL is_weight_like: иконка весов (svg:scale, ⚖) или название со словом «вес»/«weight».
export function isWeightLike(icon: string | null | undefined, name: string | null | undefined): boolean {
  return ['svg:scale', '⚖'].includes(stripVs16(icon)) || /вес|weight/i.test(name ?? '')
}

// «Главная» вода пользователя: первая по position (пустые в конце), затем по id — как в SQL metric_null_goal.
export function findWaterNumberMetric<T extends GoalMetric>(metrics: T[]): T | undefined {
  const water = metrics.filter((m) => m.type === 'number' && isWaterLike(m.icon, m.name))
  water.sort((a, b) => {
    const pa = a.position ?? Number.MAX_SAFE_INTEGER
    const pb = b.position ?? Number.MAX_SAFE_INTEGER
    return pa !== pb ? pa - pb : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
  return water[0]
}

// round(вес × 30); нет веса или 0 → null. Умножаем через ×3000/100, чтобы 70,05 × 30 = 2101,5 не «плыло» из-за float (SQL считает numeric точно).
export function autoNormFromWeight(weightKg: number | null | undefined): number | null {
  if (!weightKg) return null
  return Math.round(Math.round(weightKg * WATER_ML_PER_KG * 100) / 100)
}

// Подставляет эффективную норму в goal_value воды, если он пуст. Остальные метрики и вода с заданной нормой — без изменений.
export function applyWaterGoal<T extends GoalMetric>(metrics: T[], autoNormMl: number | null): T[] {
  const water = findWaterNumberMetric(metrics)
  if (!water || water.goal_value != null) return metrics
  const norm = autoNormMl ?? WATER_DEFAULT_ML
  return metrics.map((m) => (m === water ? { ...m, goal_value: norm } : m))
}

// --- сеть: последний вес пользователя (как useWater.loadAutoNorm), коротко кэшируется, чтобы 5 загрузчиков не ходили 5 раз ---
const TTL_MS = 10_000
let cache: { userId: string; at: number; promise: Promise<number | null> } | null = null

export function resetWaterGoalCache() {
  cache = null
}
// Вес/параметры тела или данные изменились — сбросить кэш. Имена событий — те же, что BODY_VALUES_CHANGED / BODY_PARAMS_CHANGED в
// useCharts.ts (строками, чтобы не тянуть в расчёт баллов весь модуль графиков).
if (typeof window !== 'undefined') {
  for (const ev of ['dashboard:data-changed', 'dashboard:body-values-changed', 'dashboard:body-params-changed']) window.addEventListener(ev, resetWaterGoalCache)
}

async function fetchAutoNormMl(userId: string): Promise<number | null> {
  const { data: params } = await sb.from('body_parameters').select('id, name, icon, position').eq('user_id', userId)
  const weightParam = ((params || []) as { id: string; name: string; icon: string | null; position: number | null }[])
    .filter((p) => isWeightLike(p.icon, p.name))
    .sort((a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || (a.id < b.id ? -1 : 1))[0]
  if (!weightParam) return null
  const { data: values } = await sb
    .from('body_parameter_values')
    .select('value')
    .eq('user_id', userId)
    .eq('parameter_id', weightParam.id)
    .order('date', { ascending: false })
    .limit(1)
  return autoNormFromWeight(values?.[0]?.value as number | null | undefined)
}

export function loadAutoNormMl(userId: string): Promise<number | null> {
  if (cache && cache.userId === userId && Date.now() - cache.at < TTL_MS) return cache.promise
  const promise = fetchAutoNormMl(userId).catch(() => {
    cache = null // сбой не кэшируем
    return null
  })
  cache = { userId, at: Date.now(), promise }
  return promise
}

// Вход для загрузчиков: лишних запросов нет, пока у воды норма задана или воды нет вовсе.
export async function withWaterGoal<T extends GoalMetric>(userId: string, metrics: T[]): Promise<T[]> {
  const water = findWaterNumberMetric(metrics)
  if (!water || water.goal_value != null) return metrics
  return applyWaterGoal(metrics, await loadAutoNormMl(userId))
}
