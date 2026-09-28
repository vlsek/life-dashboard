import { ref } from 'vue'
import { sb } from './supabase'
import { pointsPerDaySeries } from './points-series'
import type { ChartPoint } from './chart'
import type { Metric, DailyValueRow } from './types'

// Отдельный композабл для блока «Графики» (не трогает useDashboard.ts/loadStreaks —
// минимизирует пересечение с другими блоками, которые переносятся параллельно, см.
// ROADMAP.md, тот же паттерн, что useWater.ts). Вызывать init(userId) после того, как
// useDashboard() определил auth.status === 'ready'.
//
// TODO(следующая итерация): buildAvailableSeries() в dashboard.js строит намного больше
// серий, чем здесь — параметры тела (Профиль, ещё не перенесённый блок), отдельные
// number/sets-метрики с целевой линией, редактирование значения прямо из графика
// (renderEditableSeriesValues/pushPointToChart), выбор серии через модалку
// (openChartsConfigModal). Здесь — только "баллы за день", единственная серия, которая
// не зависит от body_parameters. Остальное — когда будет перенесён блок Профиль.
export function useCharts() {
  const pointsSeries = ref<ChartPoint[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)

  async function init(userId: string) {
    const [metricsRes, valuesRes] = await Promise.all([
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true),
      sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId),
    ])
    if (metricsRes.error || valuesRes.error) {
      error.value = (metricsRes.error || valuesRes.error)!.message
      loaded.value = true
      return
    }
    pointsSeries.value = pointsPerDaySeries((metricsRes.data || []) as Metric[], (valuesRes.data || []) as DailyValueRow[])
    loaded.value = true
  }

  return { pointsSeries, loaded, error, init }
}
