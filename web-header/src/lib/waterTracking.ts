import { computed, ref } from 'vue'
import { sb } from './supabase'
import { notifyDataChanged } from './events'
import { findWaterNumberMetric, type GoalMetric } from './waterGoal'

// «Отслеживать воду» (BACKLOG 932; ответ владельца 2026-10-07: флаг в профиле — profiles.track_water, миграция 055; прошлые баллы за воду остаются).
// ВЫКЛЮЧЕНО — клиент не показывает стакан/окно воды/напоминания/блок «Вода» и не учитывает воду в кольцах дня и недели, «идеальных днях», сериях и
// «баллах за день». НЕ меняются: данные воды (daily_values, water_log), баланс и журнал баллов (loadBalance/usePointsLog), графики и история —
// прошлые записи и баллы остаются. Файл один в один лежит в web-header и web-dashboard (общий код; сверяет web-dashboard/src/waterSharedCopies.test.ts).
// Хранение: localStorage `track_water_off:<userId>` ('1' = выключено) — мгновенно, чтобы стакан не мигал при открытии страницы; источник правды —
// профиль (синхронизация между устройствами). Нет колонки (миграция 055 не применена) / нет сети — остаётся кэш устройства, по умолчанию «включено».
// Бандлы независимы (шапка и Дашборд), поэтому изменение объявляется событием на window — второй бандл на странице обновляет своё состояние.
export const WATER_TRACKING_EVENT = 'water-tracking:changed'
const cacheKey = (userId: string) => `track_water_off:${userId}`

const on = ref(true)
// Для шаблонов и computed: включён ли учёт воды (реактивно)
export const trackWater = computed(() => on.value)

export function cachedTrackWater(userId: string): boolean {
  try {
    return localStorage.getItem(cacheKey(userId)) !== '1'
  } catch {
    return true
  }
}

function writeCache(userId: string, value: boolean) {
  try {
    if (value) localStorage.removeItem(cacheKey(userId))
    else localStorage.setItem(cacheKey(userId), '1')
  } catch {
    /* приватный режим: значение живёт в профиле */
  }
}

async function fetchFlag(userId: string): Promise<boolean> {
  try {
    const { data, error } = await sb.from('profiles').select('track_water').eq('user_id', userId).maybeSingle()
    if (!error) {
      const v = (data as { track_water?: boolean | null } | null)?.track_water
      if (typeof v === 'boolean') {
        writeCache(userId, v)
        on.value = v
      }
    }
  } catch {
    /* нет сети — остаётся значение из кэша устройства */
  }
  return on.value
}

const loaded = new Map<string, Promise<boolean>>()

// Один раз на страницу: сначала мгновенно из кэша устройства, затем из профиля. Повторные вызовы возвращают то же (актуальное) состояние без запроса.
export function ensureTrackWater(userId: string): Promise<boolean> {
  let p = loaded.get(userId)
  if (!p) {
    on.value = cachedTrackWater(userId)
    p = fetchFlag(userId)
    loaded.set(userId, p)
  }
  return p.then(() => on.value)
}

export type SaveTrackWaterResult = { ok: true } | { ok: false; error: unknown }

// Записать выбор в профиль. Успех — кэш, состояние, событие для второго бандла и «данные изменились» (кольца, серии, баллы за день пересчитаются).
export async function saveTrackWater(userId: string, value: boolean): Promise<SaveTrackWaterResult> {
  const { error } = await sb.from('profiles').upsert({ user_id: userId, track_water: value })
  if (error) return { ok: false, error }
  writeCache(userId, value)
  on.value = value
  loaded.set(userId, Promise.resolve(value))
  window.dispatchEvent(new CustomEvent(WATER_TRACKING_EVENT, { detail: { on: value } }))
  notifyDataChanged({ source: 'water-tracking' })
  return { ok: true }
}

// Метрики без «главной» воды, когда учёт воды выключен (для колец, серий, «идеальных дней», «баллов за день»). Баланс/журнал баллов её не вызывают.
export function dropWaterIfOff<T extends GoalMetric>(metrics: T[], trackOn: boolean): T[] {
  if (trackOn) return metrics
  const water = findWaterNumberMetric(metrics)
  return water ? metrics.filter((m) => m !== water) : metrics
}

// Только для тестов: сбросить состояние модуля (кэш запросов и значение), чтобы тесты одного файла не влияли друг на друга.
export function _resetTrackWaterForTests() {
  loaded.clear()
  on.value = true
}

if (typeof window !== 'undefined') {
  // Второй бандл на странице (или другое окно этого же бандла) изменил выбор — подхватываем без запроса
  window.addEventListener(WATER_TRACKING_EVENT, (e) => {
    const v = (e as CustomEvent<{ on?: boolean }>).detail?.on
    if (typeof v === 'boolean') on.value = v
  })
}
