import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { todayStr } from './date'
import { DATA_CHANGED } from './events'
import type { DataChangedDetail } from './events'
import { findWaterNumberMetric, withWaterGoal } from './waterGoal'
import { readLastShown, remindersOff, shouldRemindWater, writeLastShown } from './waterReminder'
import type { Metric } from './types'

// Плашка-напоминание о воде (BACKLOG 18.5). Решение «показывать ли» принимается РОВНО ОДИН РАЗ — при открытии страницы
// (первый успешный load после входа), а не по таймеру. Дальше плашка только может погаснуть: если человек добавил воду и
// норма выпита, или закрыл её сам. BACKLOG 23 🐞 «15:19»: гаснет и тогда, когда человек просто добавил воды после показа плашки
// (раньше — только при выполненной норме, поэтому «выпил воду, а напоминалка висит»). Отдельный composable со своим небольшим запросом — по тому же принципу, что и
// useEveningReminder: окно воды и копию для шапки (useWater) не трогаем.
// Количество воды из БД/события: число, либо числовая строка («1500» — jsonb бывает и таким), иначе 0; не меньше 0.
// Раньше строка превращалась в 0 и плашка писала «выпито 0 мл» при выпитых полутора литрах.
export function toMl(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN
  return Number.isFinite(n) && n > 0 ? n : 0
}

export function useWaterReminder() {
  const visible = ref(false)
  const ml = ref(0)
  const goal = ref(0)
  let userId = ''
  let decided = false // решение при открытии уже принято
  let mlAtShow = 0 // сколько было выпито в момент показа плашки: больше — значит, человек уже выпил воды
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
    return { ml: toMl(raw), goal: water.goal_value ?? 0 }
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
          mlAtShow = state.ml
          writeLastShown(now.getTime())
        }
      } else if (visible.value && (state.ml >= state.goal || state.ml > mlAtShow)) {
        visible.value = false // выпили воды (или всю норму), пока плашка висела
      }
    } catch {
      /* не мешаем странице */
    }
  }

  // Событие шапки/правой панели/Дашборда несёт новый итог дня: используем его сразу, не дожидаясь чтения из БД, — иначе плашка
  // секунду-другую показывала старое число. Только за сегодня: вода, добавленная за другую дату, сегодняшнюю плашку не гасит.
  function onDataChanged(e: Event) {
    if (!visible.value) return
    const d = (e as CustomEvent<DataChangedDetail>).detail
    if (d?.source === 'water' && d.date === todayStr() && typeof d.value === 'number' && Number.isFinite(d.value)) {
      const next = Math.max(0, d.value)
      ml.value = next
      if (next >= goal.value || next > mlAtShow) visible.value = false
    }
    void load() // и сверяемся с БД: итог мог измениться и не из воды (другая вкладка)
  }
  onMounted(() => window.addEventListener(DATA_CHANGED, onDataChanged))
  onBeforeUnmount(() => window.removeEventListener(DATA_CHANGED, onDataChanged))

  function dismiss() {
    visible.value = false
  }

  return { visible, ml, goal, load, dismiss }
}
