import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { DATA_CHANGED } from './events'
import { findWaterNumberMetric, withWaterGoal } from './waterGoal'
import { readLastShown, remindersOff, shouldRemindWater, writeLastShown } from './waterReminder'
import type { Metric } from './types'

// Плашка-напоминание о воде (BACKLOG 18.5). Решение «показывать ли» принимается РОВНО ОДИН РАЗ — при открытии страницы
// (первый успешный load после входа), а не по таймеру. Дальше плашка только может погаснуть: если человек добавил воду и
// норма выпита, или закрыл её сам. Отдельный composable со своим небольшим запросом — по тому же принципу, что и
// useEveningReminder: окно воды и копию для шапки (useWater) не трогаем.
export function useWaterReminder() {
  const visible = ref(false)
  const ml = ref(0)
  const goal = ref(0)
  let userId = ''
  let decided = false // решение при открытии уже принято
  let token = 0

  async function read(): Promise<{ ml: number; goal: number } | null> {
    const myToken = ++token
    const { data: rows, error } = await sb.from('metrics').select('*').eq('user_id', userId).eq('active', true)
    if (error || myToken !== token) return null
    const metrics = await withWaterGoal(userId, (rows || []) as Metric[])
    const water = findWaterNumberMetric(metrics)
    if (!water) return null
    const { data: val, error: err2 } = await sb.from('daily_values').select('value').eq('user_id', userId).eq('metric_id', water.id).eq('date', todayStr()).maybeSingle()
    if (err2 || myToken !== token) return null
    const raw = (val as { value?: unknown } | null)?.value
    return { ml: typeof raw === 'number' && Number.isFinite(raw) ? raw : 0, goal: water.goal_value ?? 0 }
  }

  async function load(uid?: string) {
    if (uid) userId = uid
    if (!userId) return
    try {
      const state = await read()
      if (!state) return // вспомогательная функция: при ошибке молча ничего не показываем (и решение не тратим)
      ml.value = state.ml
      goal.value = state.goal
      if (!decided) {
        decided = true
        const now = new Date()
        if (shouldRemindWater({ now, lastShownMs: readLastShown(), ml: state.ml, goal: state.goal, off: remindersOff() })) {
          visible.value = true
          writeLastShown(now.getTime())
        }
      } else if (visible.value && state.ml >= state.goal) {
        visible.value = false // выпили норму, пока плашка висела
      }
    } catch {
      /* не мешаем странице */
    }
  }

  function onDataChanged() {
    if (visible.value) void load()
  }
  onMounted(() => window.addEventListener(DATA_CHANGED, onDataChanged))
  onBeforeUnmount(() => window.removeEventListener(DATA_CHANGED, onDataChanged))

  function dismiss() {
    visible.value = false
  }

  return { visible, ml, goal, load, dismiss }
}
