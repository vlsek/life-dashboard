import { computed, ref } from 'vue'
import { sb } from './supabase'
import { fmtDate } from './date'
import { t } from './i18n'
import { autoNormMlFromWeight, effectiveNormMl, findWaterMetric, findWeightParam, nextWaterValue } from './water'
import type { BodyParameter } from './water'
import type { Metric } from './types'

// Отдельный композабл для блока «Вода» (не трогает useDashboard.ts/loadStreaks — минимизирует
// пересечение с другими блоками, которые переносятся параллельно, см. ROADMAP.md). Вызывать
// init(userId) после того, как useDashboard() определил auth.status === 'ready'.
export function useWater() {
  const metric = ref<Metric | null>(null)
  const autoNormMl = ref<number | null>(null)
  const weightKg = ref<number | null>(null)
  const todayMl = ref(0)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let userId = ''

  const normMl = computed(() => effectiveNormMl(metric.value?.goal_value, autoNormMl.value))

  async function loadAutoNorm() {
    const { data: params } = await sb.from('body_parameters').select('id, name, icon').eq('user_id', userId)
    const weightParam = findWeightParam((params || []) as BodyParameter[])
    if (!weightParam) {
      autoNormMl.value = null
      weightKg.value = null
      return
    }
    const { data: values } = await sb
      .from('body_parameter_values')
      .select('value')
      .eq('user_id', userId)
      .eq('parameter_id', weightParam.id)
      .order('date', { ascending: false })
      .limit(1)
    const weight = values?.[0]?.value
    weightKg.value = weight ?? null
    autoNormMl.value = weight ? autoNormMlFromWeight(weight) : null
  }

  async function init(uid: string) {
    userId = uid
    const { data: metrics, error: err } = await sb.from('metrics').select('*').eq('user_id', userId).eq('active', true)
    if (err) {
      error.value = err.message
      loaded.value = true
      return
    }
    metric.value = findWaterMetric((metrics || []) as Metric[]) ?? null
    await loadAutoNorm()
    if (metric.value) await loadToday()
    loaded.value = true
  }

  async function loadToday() {
    if (!metric.value) return
    const { data } = await sb
      .from('daily_values')
      .select('value')
      .eq('user_id', userId)
      .eq('metric_id', metric.value.id)
      .eq('date', fmtDate(new Date()))
      .maybeSingle()
    todayMl.value = (data?.value as number) ?? 0
  }

  async function getMlForDate(dateStr: string): Promise<number> {
    if (!metric.value) return 0
    const { data } = await sb
      .from('daily_values')
      .select('value')
      .eq('user_id', userId)
      .eq('metric_id', metric.value.id)
      .eq('date', dateStr)
      .maybeSingle()
    return (data?.value as number) ?? 0
  }

  // Портировано из addWaterMl(): читает текущее значение за дату, прибавляет дельту, upsert-ит.
  async function addMl(deltaMl: number, dateStr: string): Promise<number> {
    if (!metric.value) return 0
    const current = await getMlForDate(dateStr)
    const next = nextWaterValue(current, deltaMl)
    await sb
      .from('daily_values')
      .upsert({ user_id: userId, metric_id: metric.value.id, date: dateStr, value: next }, { onConflict: 'user_id,date,metric_id' })
    if (dateStr === fmtDate(new Date())) todayMl.value = next
    return next
  }

  async function saveGoal(ml: number) {
    if (!metric.value) return
    const { error: err } = await sb.from('metrics').update({ goal_value: ml }).eq('id', metric.value.id)
    if (err) {
      error.value = err.message
      return
    }
    metric.value = { ...metric.value, goal_value: ml }
  }

  // Портировано из createWaterMetric(): позиция — максимум текущих + 1, как и в оригинале.
  async function createWaterMetric() {
    const { data: metrics } = await sb.from('metrics').select('position').eq('user_id', userId)
    const maxPos = (metrics || []).reduce((mx: number, m: { position: number }) => Math.max(mx, m.position ?? 0), 0)
    const { data, error: err } = await sb
      .from('metrics')
      .insert({ user_id: userId, name: t('dash_water_metric_name'), icon: '💧', unit: 'мл', type: 'number', position: maxPos + 1, active: true })
      .select()
      .single()
    if (err) {
      error.value = t('dash_save_error_generic') + err.message
      return
    }
    metric.value = data as Metric
    todayMl.value = 0
  }

  return { metric, normMl, autoNormMl, weightKg, todayMl, loaded, error, init, addMl, getMlForDate, saveGoal, createWaterMetric }
}
