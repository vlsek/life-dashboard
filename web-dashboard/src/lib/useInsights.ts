import { ref } from 'vue'
import { sb } from './supabase'
import { addDays, fmtDate, todayStr } from './date'
import { isMood, isMissingColumn } from './dayReflection'
import { WINDOW_DAYS, moodInsight, type Insight } from './insights'
import { doneDaysOf } from './skipYesterday'
import { findWaterNumberMetric, withWaterGoal } from './waterGoal'
import type { Metric, MetricValue } from './types'

// Карточка инсайтов (BACKLOG 75.7): самочувствие в дни с выполненной водой и без. Любая ошибка или отсутствие миграции 114 — карточки нет (вспомогательный блок).
export function useInsights() {
  const water = ref<Insight | null>(null)
  const workout = ref<Insight | null>(null)
  async function load(userId: string) {
    water.value = null
    workout.value = null
    const since = fmtDate(addDays(new Date(), -WINDOW_DAYS))
    const [notes, metricsRes] = await Promise.all([
      sb.from('daily_notes').select('date, mood').eq('user_id', userId).gte('date', since).lte('date', todayStr()).not('mood', 'is', null),
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true),
    ])
    if (notes.error || metricsRes.error) {
      if (notes.error && !isMissingColumn(notes.error)) console.warn('insights', notes.error.message)
      return
    }
    const mood: Record<string, number> = {}
    for (const r of (notes.data || []) as { date: string; mood: unknown }[]) if (isMood(r.mood)) mood[r.date] = r.mood
    if (Object.keys(mood).length < 30) return // дёшево отсекаем: дальше метрики и значения не нужны
    // день с тренировкой: любая запись в «Тренировках» за дату (вспомогательный запрос; ошибка — просто нет этого инсайта)
    const wk = await sb.from('workout_entries').select('date').eq('user_id', userId).gte('date', since)
    if (!wk.error) workout.value = moodInsight(mood, new Set(((wk.data || []) as { date: string }[]).map((r) => r.date)))
    const metrics = await withWaterGoal(userId, (metricsRes.data || []) as unknown as Metric[])
    const wm = findWaterNumberMetric(metrics)
    if (!wm) return
    const vals = await sb.from('daily_values').select('date, value').eq('user_id', userId).eq('metric_id', wm.id).gte('date', since)
    if (vals.error) return
    water.value = moodInsight(mood, doneDaysOf(wm, (vals.data || []) as { date: string; value: MetricValue }[]))
  }
  return { water, workout, load }
}
