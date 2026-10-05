import { ref } from 'vue'
import { sb } from './supabase'
import { t } from './i18n'
import { notifyDataChanged } from './events'
import { emitPointsFloat, pointsDelta } from './pointsFloat'
import { forgetVariationOptions, normalizeSets, rememberVariationOptions } from './setsBlock'
import type { SetRow } from './setsBlock'
import type { Metric, MetricValue } from './types'

import { friendlyError } from './friendlyError'
// Композабл блока «Подходы» (метрики типа sets) — отдельно от useDashboard.ts, чтобы не пересекаться
// с другими блоками (см. ROADMAP.md). Блок 6 («дневные метрики») может использовать его же
// или только SetsCard.vue, отдавая ему свои данные.
export function useSets() {
  const metrics = ref<Metric[]>([])
  const setsByMetric = ref<Record<string, SetRow[]>>({})
  const error = ref<string | null>(null)
  const loaded = ref(false)
  let userId = ''
  let date = ''

  async function load(uid: string, dateStr: string) {
    userId = uid
    date = dateStr
    const { data: ms, error: mErr } = await sb
      .from('metrics')
      .select('*')
      .eq('user_id', uid)
      .eq('active', true)
      .eq('type', 'sets')
      .order('position')
    if (mErr) {
      error.value = friendlyError(mErr, 'load')
      loaded.value = true
      return
    }
    metrics.value = (ms || []) as Metric[]
    const ids = metrics.value.map((m) => m.id)
    const byMetric: Record<string, SetRow[]> = {}
    ids.forEach((id) => (byMetric[id] = []))
    if (ids.length > 0) {
      const { data: vals, error: vErr } = await sb
        .from('daily_values')
        .select('metric_id, value')
        .eq('user_id', uid)
        .eq('date', dateStr)
        .in('metric_id', ids)
      if (vErr) error.value = friendlyError(vErr, 'load')
      else error.value = null
      ;(vals || []).forEach((v: { metric_id: string; value: unknown }) => (byMetric[v.metric_id] = normalizeSets(v.value)))
    } else {
      error.value = null
    }
    setsByMetric.value = byMetric
    loaded.value = true
  }

  // Автосохранение при каждой правке (как autoSaveMetric в оригинале).
  async function saveSets(m: Metric, sets: SetRow[]) {
    const before = setsByMetric.value[m.id] // до правки — по нему видно, перешла ли метрика в «выполнено» (+1) или обратно (−1)
    setsByMetric.value = { ...setsByMetric.value, [m.id]: sets }
    const { error: err } = await sb
      .from('daily_values')
      .upsert({ user_id: userId, date, metric_id: m.id, value: sets }, { onConflict: 'user_id,date,metric_id' })
    if (err) error.value = t('dash_metric_save_error') + m.name + '»: ' + friendlyError(err)
    else {
      error.value = null
      // подход засчитывается в «идеальный день»/кольца — пересчитать стрики; в графике точка = сумма повторений
      notifyDataChanged({ source: 'sets', metricId: m.id, date, value: sets.reduce((sum, s) => sum + (s?.reps || 0), 0) })
      emitPointsFloat(pointsDelta(m, before as unknown as MetricValue, sets as unknown as MetricValue, date || undefined)) // BACKLOG 14, 11:11
    }
  }

  function patchMetric(id: string, options: Metric['options']) {
    metrics.value = metrics.value.map((m) => (m.id === id ? { ...m, options } : m))
  }

  // Тихо: подсказка варианта — фоновая, ошибка сохранения не критична (как в оригинале).
  async function rememberVariation(m: Metric, text: string) {
    const options = rememberVariationOptions(m, text)
    if (!options) return
    const { error: err } = await sb.from('metrics').update({ options }).eq('id', m.id)
    if (!err) patchMetric(m.id, options)
  }

  async function forgetVariation(m: Metric, label: string) {
    const options = forgetVariationOptions(m, label)
    const { error: err } = await sb.from('metrics').update({ options }).eq('id', m.id)
    if (err) {
      error.value = friendlyError(err)
      return
    }
    patchMetric(m.id, options)
  }

  return { metrics, setsByMetric, error, loaded, load, saveSets, rememberVariation, forgetVariation }
}
