import { onBeforeUnmount, onMounted, ref } from 'vue'
import { sb } from './supabase'
import { t } from './i18n'
import { fetchAllRows } from './fetchAll'
import { DATA_CHANGED, notifyDataChanged, type DataChangedDetail } from './events'
import { addableKeys, buildSeries, parseEditedValue, parseKey, resolveEntries, upsertPoint, type ChartEntry, type ChartSeries } from './chartSeries'
import type { BodyParam, BodyValue } from './profile'
import type { Metric, DailyValueRow } from './types'

// События между независимыми блоками страницы (Профиль ↔ Графики): у каждого свой композабл,
// общего стора нет (см. ROADMAP.md — блоки не должны цепляться друг за друга), поэтому
// «данные тела изменились» передаётся браузерным событием (detail.source — кто изменил, чтобы
// источник не перезагружал сам себя).
export const BODY_VALUES_CHANGED = 'dashboard:body-values-changed'
export const BODY_PARAMS_CHANGED = 'dashboard:body-params-changed'

// Композабл блока «Графики»: серии (параметры тела, «баллы за день», числовые метрики),
// сохранённый выбор и порядок (profiles.dashboard_charts), правка значений прямо из графика.
// Портировано из buildAvailableSeries()/loadCharts() в dashboard.js. init(userId) — после auth 'ready'.
export function useCharts() {
  const series = ref<Record<string, ChartSeries>>({})
  const entries = ref<ChartEntry[]>([])
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let userId = ''

  async function load() {
    const [paramsRes, bodyRes, metricsRes, valuesRes, profileRes] = await Promise.all([
      sb.from('body_parameters').select('id, name, icon, unit, position').eq('user_id', userId).eq('active', true).order('position'),
      fetchAllRows<BodyValue>((from, to) => sb.from('body_parameter_values').select('parameter_id, date, value').eq('user_id', userId).order('date').order('parameter_id').range(from, to)),
      sb.from('metrics').select('*').eq('user_id', userId).eq('active', true),
      fetchAllRows<DailyValueRow>((from, to) => sb.from('daily_values').select('date, metric_id, value').eq('user_id', userId).order('date').order('metric_id').range(from, to)),
      sb.from('profiles').select('dashboard_charts').eq('user_id', userId).maybeSingle(),
    ])
    const err = paramsRes.error?.message || bodyRes.error || metricsRes.error?.message || valuesRes.error
    if (err) {
      error.value = err
      loaded.value = true
      return
    }
    error.value = null
    series.value = buildSeries((paramsRes.data || []) as BodyParam[], bodyRes.rows, (metricsRes.data || []) as Metric[], valuesRes.rows, t('dash_points_series_label'))
    entries.value = resolveEntries(profileRes.data?.dashboard_charts, series.value)
    loaded.value = true
  }

  async function init(uid: string) {
    userId = uid
    await load()
  }

  // Сохранить выбор/порядок/цели. Возвращает текст ошибки или null.
  async function saveEntries(order: ChartEntry[]): Promise<string | null> {
    const { error: e } = await sb.from('profiles').upsert({ user_id: userId, dashboard_charts: order })
    if (e) return t('dash_charts_save_error') + e.message + '\n\n' + t('dash_charts_save_error_hint')
    entries.value = order.filter((o) => series.value[o.key])
    return null
  }

  // Правка значения точки прямо из графика. Метрика — upsert в daily_values (пусто → 0),
  // параметр тела — upsert в body_parameter_values (пусто игнорируется). null — успех.
  async function saveValue(key: string, date: string, raw: string): Promise<string | null> {
    const value = parseEditedValue(raw)
    const { prefix, id } = parseKey(key)
    let e: { message: string } | null = null
    if (prefix === 'metric') {
      ;({ error: e } = await sb.from('daily_values').upsert({ user_id: userId, date, metric_id: id, value: value ?? 0 }, { onConflict: 'user_id,date,metric_id' }))
    } else {
      if (value == null) return null
      ;({ error: e } = await sb.from('body_parameter_values').upsert({ user_id: userId, date, parameter_id: id, value }, { onConflict: 'user_id,date,parameter_id' }))
    }
    if (e) return t('dash_save_error_generic') + e.message
    const s = series.value[key]
    if (s) series.value = { ...series.value, [key]: { ...s, points: upsertPoint(s.points, date, value) } }
    if (prefix === 'body') window.dispatchEvent(new CustomEvent(BODY_VALUES_CHANGED, { detail: { source: 'charts' } }))
    // значение метрики изменилось — стрики и кольца прогресса пересчитает useDashboard
    else notifyDataChanged({ source: 'charts', metricId: id, date, value: value ?? 0 })
    return null
  }

  // Значение числовой метрики записали в другом блоке (вода, подходы) — обновляем точку в её графике
  // (аналог pushPointToChart в оригинале). «Баллы за день» и графики других метрик не пересчитываем:
  // полная перезагрузка на каждое нажатие «+250 мл» дороже, чем устаревшая до следующего входа цифра.
  function onDataChanged(e: Event) {
    const d = (e as CustomEvent<DataChangedDetail>).detail
    if (!d || d.source === 'charts' || !d.metricId || !d.date || d.value == null) return
    const key = `metric:${d.metricId}`
    const s = series.value[key]
    if (s) series.value = { ...series.value, [key]: { ...s, points: upsertPoint(s.points, d.date, d.value) } }
  }
  onMounted(() => window.addEventListener(DATA_CHANGED, onDataChanged))
  onBeforeUnmount(() => window.removeEventListener(DATA_CHANGED, onDataChanged))

  const addable = () => addableKeys(series.value, entries.value)

  return { series, entries, loaded, error, init, reload: load, saveEntries, saveValue, addable }
}
