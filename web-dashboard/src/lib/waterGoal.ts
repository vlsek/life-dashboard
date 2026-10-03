import { sb } from './supabase'
import { DATA_CHANGED } from './events'

// Вода «выполнена» по ЭФФЕКТИВНОЙ норме (решение владельца 2026-10-01, вариант «б»; SQL — migrations/033_water_effective_norm.sql).
// Если у метрики воды `goal_value` не задан, её норма — авто-норма (вес × 26 мл, без веса 1800; v2.49 — с поправкой на воду из еды), а не 0: иначе балл за воду
// давало любое записанное значение, даже 100 мл. Правило здесь — зеркало SQL-функций is_water_like / is_weight_like /
// water_auto_norm_ml / metric_null_goal; менять их нужно ВМЕСТЕ. Чистые функции без сети/DOM; сетевой вход — withWaterGoal().
// Как пользоваться: после загрузки метрик для подсчёта «выполнено»/баллов/колец пропустить их через withWaterGoal(userId, metrics).
// НЕ применять к метрикам, которые редактируются формой (Управление метриками): иначе в goal_value «запишется» авто-норма.

export const WATER_ML_PER_KG = 26
export const WATER_DEFAULT_ML = 1800

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

// round(вес × 26); нет веса или 0 → null. Умножаем через ×3000/100, чтобы 70,05 × 26 = 1821,3 не «плыло» из-за float (SQL считает numeric точно).
export function autoNormFromWeight(weightKg: number | null | undefined): number | null {
  if (!weightKg) return null
  return Math.round(Math.round(weightKg * WATER_ML_PER_KG * 100) / 100)
}

// --- Рост в формуле (BACKLOG 17, просьба владельца 2026-10-01) ---
// Норма — это ПИТЬЁ, без воды из еды (супы, фрукты, овощи и т. д. сюда НЕ входят; решение владельца 2026-10-03, v2.49).
// Площадь поверхности тела — по формуле Мостеллера BSA = √(рост[см] × вес[кг] / 3600) (Mosteller, NEJM 1987). Суточная потребность во ВСЕЙ воде
// ≈ 1250 мл на м² (ориентир EFSA: ≈2,0 л женщинам и ≈2,5 л мужчинам при BSA 1,6–1,9 м²), около 20% её приходит с едой,
// поэтому «питьевая» норма = BSA × 1250 × 0.8 = BSA × 1000 мл. Округляем до 10 мл. (До v2.49 было 1200 мл/м² от клинических 1500 мл/м².)
// Пример: 70 кг, 175 см → BSA 1,84 м² → 1840 мл. Без роста (или рост вне 100–250 см) — вес × 26 мл (= вес × 32,5 всей воды × 0.8), без веса — 1800.
// SQL-зеркало: migrations/043_water_norm_food.sql (water_auto_norm_ml, metric_null_goal) — править ВМЕСТЕ.
export const WATER_ML_PER_M2 = 1000
export const HEIGHT_MIN_CM = 100
export const HEIGHT_MAX_CM = 250

export function validHeightCm(heightCm: number | null | undefined): number | null {
  const h = Number(heightCm)
  return Number.isFinite(h) && h >= HEIGHT_MIN_CM && h <= HEIGHT_MAX_CM ? h : null
}

export function bodySurfaceAreaM2(weightKg: number, heightCm: number): number {
  return Math.sqrt((heightCm * weightKg) / 3600)
}

export function autoNormFromBody(weightKg: number | null | undefined, heightCm: number | null | undefined): number | null {
  if (!weightKg) return null
  const h = validHeightCm(heightCm)
  if (h == null) return autoNormFromWeight(weightKg)
  return Math.round((bodySurfaceAreaM2(weightKg, h) * WATER_ML_PER_M2) / 10) * 10
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
  for (const ev of [DATA_CHANGED, 'dashboard:body-values-changed', 'dashboard:body-params-changed']) window.addEventListener(ev, resetWaterGoalCache)
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
  const weight = values?.[0]?.value as number | null | undefined
  if (!weight) return null
  const { data: prof } = await sb.from('profiles').select('height').eq('user_id', userId).maybeSingle()
  return autoNormFromBody(weight, (prof as { height?: number | null } | null)?.height)
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
