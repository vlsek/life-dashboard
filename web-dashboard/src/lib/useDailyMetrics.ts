import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { findWaterMetric } from './water'
import { DATA_CHANGED, notifyDataChanged, type DataChangedDetail } from './events'
import {
  applyDelta,
  dayScore,
  initialPending,
  parseFixedTotal,
  parseNumberInput,
  toggleOption,
  valueToSave,
  type PendingValues,
} from './daily'
import type { Metric, MetricValue } from './types'

// Блок «Дневные метрики» (boolean / number / multiselect + «Что полезного сделал за день»).
// Портировано из renderDay() в dashboard.js. Отдельный composable — как useWater/useSets/
// usePlanned: несколько людей переносят разные блоки одновременно, свои файлы меньше шансов
// столкнуться при мерже. Пересчёт стриков/колец — не отсюда напрямую, а через notifyDataChanged()
// (см. lib/events.ts): useDashboard.ts сам слушает DATA_CHANGED и перечитывает всё нужное.
//
// Что НЕ делает (осознанно, чтобы не затирать чужое):
//  • «Подходы» (type=sets) и «Вода» — свои блоки (SetsSection/WaterSection), эта секция их не
//    сохраняет, только читает их daily_values для «Баллов за день» и подписывается на их события,
//    чтобы баллы не устаревали, когда человек вводит подход или воду в соседнем блоке.
//  • planned_goals в daily_notes не трогаем (план на день — PlannedSection), пишем только items.
export function useDailyMetrics() {
  const metrics = ref<Metric[]>([])
  const pending = ref<PendingValues>({}) // значения метрик, которыми владеет этот блок
  const external = ref<PendingValues>({}) // значения sets/воды — только для подсчёта баллов
  const items = ref<string[]>([])
  const error = ref<string | null>(null)
  const loaded = ref(false)
  const saving = ref(false)
  const flashed = ref<Record<string, boolean>>({})

  let userId = ''
  let date = ''
  let loadToken = 0 // защита от гонки: ответ на устаревший день (быстро листали) не применяем

  const water = computed(() => findWaterMetric(metrics.value))
  const owned = computed(() => metrics.value.filter((m) => m !== water.value && m.type !== 'sets'))
  const booleans = computed(() => owned.value.filter((m) => m.type === 'boolean'))
  const numbers = computed(() => owned.value.filter((m) => m.type === 'number'))
  const multiselects = computed(() => owned.value.filter((m) => m.type === 'multiselect'))

  const score = computed(() => dayScore(metrics.value, { ...external.value, ...pending.value }))

  async function fetchValues(uid: string, dateStr: string): Promise<Record<string, MetricValue> | string> {
    const { data, error: err } = await sb.from('daily_values').select('metric_id, value').eq('user_id', uid).eq('date', dateStr)
    if (err) return err.message
    const byMetric: Record<string, MetricValue> = {}
    for (const v of (data || []) as { metric_id: string; value: MetricValue }[]) byMetric[v.metric_id] = v.value
    return byMetric
  }

  async function load(uid: string, dateStr: string) {
    userId = uid
    date = dateStr
    const token = ++loadToken
    loaded.value = false

    const [metricsRes, values, noteRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', uid).eq('active', true).order('position'),
      fetchValues(uid, dateStr),
      sb.from('daily_notes').select('items').eq('user_id', uid).eq('date', dateStr).maybeSingle(),
    ])
    if (token !== loadToken) return // пока грузили, день уже сменился
    if (metricsRes.error || typeof values === 'string' || noteRes.error) {
      error.value = metricsRes.error?.message ?? (typeof values === 'string' ? values : noteRes.error!.message)
      loaded.value = true
      return
    }
    error.value = null
    const all = (metricsRes.data || []) as Metric[]
    metrics.value = all
    const w = findWaterMetric(all)
    const mine = new Set(all.filter((m) => m !== w && m.type !== 'sets').map((m) => m.id))
    pending.value = initialPending(all.filter((m) => mine.has(m.id)), values)
    external.value = initialPending(all.filter((m) => !mine.has(m.id)), values)
    items.value = Array.isArray(noteRes.data?.items) ? (noteRes.data!.items as string[]) : []
    loaded.value = true
  }

  // «Баллы за день» читают и подходы, и воду — их сохраняют соседние блоки (SetsSection/
  // WaterSection), которые после своего autosave шлют DATA_CHANGED. Ловим это здесь и тихо
  // перечитываем только внешние значения (свои поля/pending не трогаем).
  async function onExternalChange(e: Event) {
    const detail = (e as CustomEvent<DataChangedDetail>).detail
    if (!detail || detail.source === 'day' || detail.date !== date || !userId) return
    const token = loadToken
    const values = await fetchValues(userId, date)
    if (token !== loadToken || typeof values === 'string') return
    const ext = metrics.value.filter((m) => !owned.value.includes(m))
    external.value = initialPending(ext, values)
  }
  onMounted(() => window.addEventListener(DATA_CHANGED, onExternalChange))
  onBeforeUnmount(() => window.removeEventListener(DATA_CHANGED, onExternalChange))

  function flash(id: string) {
    flashed.value = { ...flashed.value, [id]: true }
    setTimeout(() => {
      const { [id]: _drop, ...rest } = flashed.value
      flashed.value = rest
    }, 900)
  }

  async function autoSave(m: Metric, value: MetricValue) {
    const { error: err } = await sb
      .from('daily_values')
      .upsert({ user_id: userId, date, metric_id: m.id, value }, { onConflict: 'user_id,date,metric_id' })
    if (err) {
      error.value = err.message
      return false
    }
    error.value = null
    flash(m.id)
    notifyDataChanged({ source: 'day', metricId: m.id, date, value: typeof value === 'number' ? value : null })
    return true
  }

  const setBoolean = (m: Metric, checked: boolean) => {
    pending.value = { ...pending.value, [m.id]: checked }
    return autoSave(m, checked)
  }

  // Режим "заменять": пустое поле → значение не задано (undefined) в UI, но в базу пишем 0
  async function setNumber(m: Metric, raw: string) {
    const v = parseNumberInput(raw)
    pending.value = { ...pending.value, [m.id]: v }
    return autoSave(m, v ?? 0)
  }

  // Режим "прибавлять": введённое число добавляется к итогу за день
  async function addToNumber(m: Metric, raw: string) {
    const next = applyDelta(pending.value[m.id], raw)
    if (next === null) return false
    pending.value = { ...pending.value, [m.id]: next }
    return autoSave(m, next)
  }

  // Ручная правка итога (карандаш) — минуя логику "прибавить дельту"
  async function fixTotal(m: Metric, raw: string | null) {
    const fixed = parseFixedTotal(raw)
    if (fixed === null) return false
    pending.value = { ...pending.value, [m.id]: fixed }
    return autoSave(m, fixed)
  }

  async function toggleOpt(m: Metric, key: string) {
    const cur = Array.isArray(pending.value[m.id]) ? (pending.value[m.id] as string[]) : []
    const next = toggleOption(cur, key)
    pending.value = { ...pending.value, [m.id]: next }
    return autoSave(m, next)
  }

  // «Что полезного сделал за день»: пишем только items. Сначала update существующей строки (не
  // задевая planned_goals), и лишь если строки за этот день ещё нет — insert.
  async function persistItems(next: string[]) {
    items.value = next
    const { data, error: err } = await sb
      .from('daily_notes')
      .update({ items: next })
      .eq('user_id', userId)
      .eq('date', date)
      .select('date')
    if (err) {
      error.value = err.message
      return false
    }
    if (!data || data.length === 0) {
      const { error: insErr } = await sb.from('daily_notes').insert({ user_id: userId, date, items: next, planned_goals: [] })
      if (insErr) {
        error.value = insErr.message
        return false
      }
    }
    error.value = null
    notifyDataChanged({ source: 'day', date })
    return true
  }

  const addItem = (text: string) => {
    const v = text.trim()
    return v ? persistItems([...items.value, v]) : Promise.resolve(false)
  }
  const removeItem = (idx: number) => persistItems(items.value.filter((_, i) => i !== idx))

  // «Сохранить день»: явно записывает все свои поля (number без значения → 0) одним запросом
  async function saveDay() {
    saving.value = true
    const rows = owned.value.map((m) => ({ user_id: userId, date, metric_id: m.id, value: valueToSave(m, pending.value) }))
    let ok = true
    if (rows.length > 0) {
      const { error: err } = await sb.from('daily_values').upsert(rows, { onConflict: 'user_id,date,metric_id' })
      if (err) {
        error.value = err.message
        ok = false
      }
    }
    if (ok) ok = await persistItems(items.value) // сама шлёт notifyDataChanged
    if (ok) {
      error.value = null
      notifyDataChanged({ source: 'day', date })
    }
    saving.value = false
    return ok
  }

  return {
    metrics, booleans, numbers, multiselects, pending, items, score, error, loaded, saving, flashed,
    load, setBoolean, setNumber, addToNumber, fixTotal, toggleOpt, addItem, removeItem, saveDay,
  }
}
