import { ref } from 'vue'
import { sb } from './supabase'
import { dailyValueKey, qUpdate, qUpsert } from './outboxClient'
import { t } from './i18n'
import { notifyDataChanged } from './events'
import { emitPointsFloat, pointsDelta } from './pointsFloat'
import { forgetVariationOptions, normalizeSets, rememberVariationOptions } from './setsBlock'
import { addDayRow, editDayRow, mirrorSets, removeDayRow } from './linkedSets'
import type { DayEdit, DayEntry } from './linkedSets'
import { applyDayEdit, loadDayEntries } from './linkedEntries'
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
  // «значение сохранено» (BACKLOG 780/815): id метрики на ~0,9 с после ПОДТВЕРЖДЁННОЙ записи подходов
  const flashed = ref<Record<string, boolean>>({})
  function flash(id: string) {
    flashed.value = { ...flashed.value, [id]: true }
    setTimeout(() => {
      const { [id]: _drop, ...rest } = flashed.value
      flashed.value = rest
    }, 900)
  }
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
    const { error: err } = await qUpsert(userId, 'daily_values', dailyValueKey(date, m.id), { user_id: userId, date, metric_id: m.id, value: sets }, 'user_id,date,metric_id')
    if (err) error.value = t('dash_metric_save_error') + m.name + '»: ' + friendlyError(err)
    else {
      error.value = null
      flash(m.id)
      // подход засчитывается в «идеальный день»/кольца — пересчитать стрики; в графике точка = сумма повторений
      notifyDataChanged({ source: 'sets', metricId: m.id, date, value: sets.reduce((sum, s) => sum + (s?.reps || 0), 0) })
      emitPointsFloat(pointsDelta(m, before as unknown as MetricValue, sets as unknown as MetricValue, date || undefined)) // BACKLOG 14, 11:11
    }
  }

  // Общий хвост правок связанной метрики: значение дня = подходы из «Тренировок», пишем зеркало, вспышка, пересчёт стриков и очков.
  async function commitLinkedValue(m: Metric, before: SetRow[] | undefined, value: SetRow[]): Promise<boolean> {
    setsByMetric.value = { ...setsByMetric.value, [m.id]: value }
    const { error: err } = await qUpsert(userId, 'daily_values', dailyValueKey(date, m.id), { user_id: userId, date, metric_id: m.id, value }, 'user_id,date,metric_id')
    if (err) {
      error.value = t('dash_metric_save_error') + m.name + '»: ' + friendlyError(err)
      return false
    }
    error.value = null
    flash(m.id)
    notifyDataChanged({ source: 'sets', metricId: m.id, date, value: value.reduce((sum, s) => sum + (s?.reps || 0), 0) })
    emitPointsFloat(pointsDelta(m, before as unknown as MetricValue, value as unknown as MetricValue, date || undefined))
    return true
  }

  // Правка подходов связанной метрики «столбиком» (BACKLOG 63.2): читаем записи дня, строим план, пишем в «Тренировки», затем зеркало метрики.
  async function mutateLinked(m: Metric, make: (entries: DayEntry[]) => DayEdit | null): Promise<boolean> {
    const exerciseId = m.source_exercise_id
    if (!exerciseId || !userId || !date) return false
    const before = setsByMetric.value[m.id]
    const res = await loadDayEntries(userId, date, exerciseId)
    if (res.error) {
      error.value = t('dash_metric_save_error') + m.name + '»: ' + friendlyError(res.error)
      return false
    }
    const edit = make(res.entries)
    if (!edit) return false
    const w = await applyDayEdit(userId, date, exerciseId, edit)
    if (w.error) {
      error.value = t('dash_metric_save_error') + m.name + '»: ' + friendlyError(w.error)
      return false
    }
    return commitLinkedValue(m, before, mirrorSets(edit.rows))
  }
  const editLinkedRow = (m: Metric, index: number, patch: Partial<SetRow>) => mutateLinked(m, (e) => editDayRow(e, index, patch))
  const removeLinkedRow = (m: Metric, index: number) => mutateLinked(m, (e) => removeDayRow(e, index))
  const addLinkedRow = (m: Metric) => mutateLinked(m, (e) => addDayRow(e))

  function patchMetric(id: string, options: Metric['options']) {
    metrics.value = metrics.value.map((m) => (m.id === id ? { ...m, options } : m))
  }

  // Тихо: подсказка варианта — фоновая, ошибка сохранения не критична (как в оригинале).
  async function rememberVariation(m: Metric, text: string) {
    const options = rememberVariationOptions(m, text)
    if (!options) return
    const { error: err } = await qUpdate(userId, 'metrics', `metrics:${m.id}:options`, { options }, { id: m.id })
    if (!err) patchMetric(m.id, options)
  }

  async function forgetVariation(m: Metric, label: string) {
    const options = forgetVariationOptions(m, label)
    const { error: err } = await qUpdate(userId, 'metrics', `metrics:${m.id}:options`, { options }, { id: m.id })
    if (err) {
      error.value = friendlyError(err)
      return
    }
    patchMetric(m.id, options)
  }

  return { metrics, setsByMetric, error, loaded, flashed, load, saveSets, editLinkedRow, removeLinkedRow, addLinkedRow, rememberVariation, forgetVariation }
}
