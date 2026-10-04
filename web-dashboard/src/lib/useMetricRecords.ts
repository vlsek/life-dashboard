import { onBeforeUnmount, ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { DATA_CHANGED, type DataChangedDetail } from './events'
import { metricNumericValue } from './metrics'
import { bestRecord, mergeRecord, type RecordInfo } from './records'
import type { DailyValueRow, Metric } from './types'

// Рекорды числовых метрик и метрик-подходов за всё время (для «Дневных метрик»): наибольшее значение за день
// (для подходов — сумма повторений) и дата. Свой лёгкий запрос по этим метрикам; при ошибке рекордов просто нет.
// Новая запись из любого блока страницы (событие DATA_CHANGED) обновляет рекорд сразу, без перезагрузки.
export function useMetricRecords() {
  const records = ref<Record<string, RecordInfo>>({})
  const known = new Set<string>()

  function onChanged(e: Event) {
    const d = (e as CustomEvent<DataChangedDetail>).detail
    if (!d?.metricId || !known.has(d.metricId)) return
    const next = mergeRecord(records.value[d.metricId], d.value, d.date)
    if (next && next !== records.value[d.metricId]) records.value = { ...records.value, [d.metricId]: next }
  }
  window.addEventListener(DATA_CHANGED, onChanged)
  onBeforeUnmount(() => window.removeEventListener(DATA_CHANGED, onChanged))

  async function init(userId: string) {
    const { data, error } = await sb.from('metrics').select('*').eq('user_id', userId).eq('active', true).in('type', ['number', 'sets'])
    if (error) return
    const metrics = (data || []) as Metric[]
    known.clear()
    metrics.forEach((m) => known.add(m.id))
    if (!metrics.length) return
    const ids = metrics.map((m) => m.id)
    const res = await fetchAllRows<DailyValueRow>((from, to) =>
      sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).in('metric_id', ids).order('date').order('metric_id').range(from, to),
    )
    if (res.error) return
    const byMetric: Record<string, { date: string; y: number | null }[]> = {}
    const byId = new Map(metrics.map((m) => [m.id, m]))
    for (const row of res.rows) {
      const m = byId.get(row.metric_id)
      if (!m) continue
      ;(byMetric[m.id] ||= []).push({ date: row.date, y: metricNumericValue(m, row.value) })
    }
    const out: Record<string, RecordInfo> = {}
    for (const id of Object.keys(byMetric)) {
      const best = bestRecord(byMetric[id])
      if (best) out[id] = best
    }
    // событие могло прийти, пока шла загрузка: не затираем более свежий рекорд
    for (const id of Object.keys(records.value)) out[id] = mergeRecord(out[id], records.value[id].y, records.value[id].date)!
    records.value = out
  }

  return { records, init }
}
