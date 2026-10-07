import { ref } from 'vue'
import { sb } from './supabase'
import { fetchAllRows } from './fetchAll'
import { variationMaxima, variationOrder, type VariationRecord } from './variationChart'
import type { DailyValueRow } from './types'

// Рекорд за ОДИН подход по каждой особенности (вариации) у карточки метрики-подходов (BACKLOG раздел 28, решение владельца 2026-10-04:
// «в обоих местах — под графиком и у карточки метрики»). Под графиком это уже есть (v3.01, `variationMaxima` в `chartSeries.ts`);
// здесь тот же расчёт за ВСЮ историю, но для карточки в «Дневных метриках». Выключатель — «рекорды у метрик» (`recordsEnabled('metrics')`).

// Слияние: по каждой особенности побеждает больший рекорд, при равенстве — более ранняя дата (как у `bestRecord`). Порядок — как в `current`
// (цвета и подписи не прыгают), новые особенности — в конец, «без особенности» — всегда последней.
export function mergeVariationRecords(current: readonly VariationRecord[] | null | undefined, incoming: readonly VariationRecord[]): VariationRecord[] {
  const best = new Map<string | null, VariationRecord>()
  const order: (string | null)[] = []
  for (const r of [...(current ?? []), ...incoming]) {
    const cur = best.get(r.label)
    if (!cur) {
      best.set(r.label, r)
      order.push(r.label)
    } else if (r.y > cur.y || (r.y === cur.y && r.date < cur.date)) best.set(r.label, r)
  }
  const out = order.filter((l) => l !== null).map((l) => best.get(l)!)
  if (best.has(null)) out.push(best.get(null)!)
  return out
}

export function useVariationRecords() {
  const records = ref<Record<string, VariationRecord[]>>({})

  // Вся история подходов по метрикам одним запросом (страницами по 1000 строк). При ошибке рекордов просто нет — карточка работает как раньше.
  async function init(userId: string, metricIds: string[]) {
    if (!metricIds.length) return
    let res: Awaited<ReturnType<typeof fetchAllRows<DailyValueRow>>>
    try {
      res = await fetchAllRows<DailyValueRow>((from, to) =>
        sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).in('metric_id', metricIds).order('date').order('metric_id').range(from, to),
      )
    } catch {
      return // сеть упала — рекордов по вариациям просто нет, остальная карточка работает
    }
    if (res.error) return
    const byMetric: Record<string, { date: string; value: unknown }[]> = {}
    for (const row of res.rows) (byMetric[row.metric_id] ||= []).push({ date: row.date, value: row.value })
    const out: Record<string, VariationRecord[]> = {}
    for (const id of metricIds) {
      const days = byMetric[id] ?? []
      out[id] = variationMaxima(days, variationOrder(days))
    }
    // правка могла прийти, пока шла загрузка: не затираем более свежий рекорд
    for (const id of Object.keys(records.value)) out[id] = mergeVariationRecords(out[id], records.value[id])
    records.value = out
  }

  // Новые/изменённые подходы дня обновляют рекорд сразу, без перезагрузки. Правка ВНИЗ рекорд не снижает — полный пересчёт делает `init`.
  function observe(metricId: string, date: string, sets: unknown) {
    const incoming = variationMaxima([{ date, value: sets }])
    if (!incoming.length) return
    records.value = { ...records.value, [metricId]: mergeVariationRecords(records.value[metricId], incoming) }
  }

  return { records, init, observe }
}
