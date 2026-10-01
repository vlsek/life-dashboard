import { ref } from 'vue'
import { sb } from './supabase'
import { todayStr, addDaysIso } from './date'
import { buildPointsLog, LOG_DAYS } from './pointsLog'
import type { LogBook, LogGoal, LogMetric, LogPurchase, PointsLog } from './pointsLog'
import type { BalanceValueRow } from './balance'
import { withWaterGoal } from './waterGoal'

// Данные окна «За что начислены баллы»: читаются при открытии окна (не при загрузке Дашборда) и только
// за последние LOG_DAYS дней — лёгкие запросы, без постраничной выборки всего daily_values.
export function usePointsLog(userId: string) {
  const log = ref<PointsLog | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  async function load() {
    loading.value = true
    error.value = null
    const today = todayStr()
    const from = addDaysIso(today, -(LOG_DAYS - 1))
    const [metricsRes, valuesRes, goalsRes, booksRes, shopRes] = await Promise.all([
      sb.from('metrics').select('id, name, icon, type, goal_value, goal_direction, position').eq('user_id', userId).eq('active', true).order('position'),
      sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).gte('date', from).lte('date', today),
      sb.from('goals').select('name, points, done_date').eq('user_id', userId).eq('done', true).gte('done_date', from).lte('done_date', today),
      sb.from('books').select('title, points, done_date').eq('user_id', userId).eq('status', 'done').gte('done_date', from).lte('done_date', today),
      sb.from('shop_items').select('name, cost, redeemed_date').eq('user_id', userId).eq('redeemed', true).gte('redeemed_date', from).lte('redeemed_date', today),
    ])
    const err = metricsRes.error || valuesRes.error || goalsRes.error || booksRes.error || shopRes.error
    if (err) {
      error.value = err.message
      log.value = null
    } else {
      log.value = buildPointsLog(
        today,
        await withWaterGoal(userId, (metricsRes.data || []) as LogMetric[]),
        (valuesRes.data || []) as BalanceValueRow[],
        (goalsRes.data || []) as LogGoal[],
        (booksRes.data || []) as LogBook[],
        (shopRes.data || []) as LogPurchase[],
      )
    }
    loading.value = false
  }

  return { log, error, loading, load }
}
