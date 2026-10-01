import { computed, ref } from 'vue'
import { sb } from './supabase'
import { notifyDataChanged } from './events'
import { fmtDate } from './date'
import { t } from './i18n'
import { effectiveNormMl, findWaterMetric, findWeightParam, nextWaterValue } from './water'
import { autoNormFromBody, validHeightCm, resetWaterGoalCache } from './waterGoal'
import type { BodyParameter } from './water'
import type { Metric } from './types'

// Отдельный композабл для блока «Вода» (не трогает useDashboard.ts/loadStreaks — минимизирует
// пересечение с другими блоками, которые переносятся параллельно, см. ROADMAP.md). Вызывать
// init(userId) после того, как useDashboard() определил auth.status === 'ready'.
export function useWater() {
  const metric = ref<Metric | null>(null)
  const autoNormMl = ref<number | null>(null)
  const weightKg = ref<number | null>(null)
  // Рост (см) из profiles.height — нужен для авто-нормы по площади поверхности тела (BACKLOG 17); null = неизвестен → норма вес × 30
  const heightCm = ref<number | null>(null)
  const todayMl = ref(0)
  const loaded = ref(false)
  const error = ref<string | null>(null)
  // ошибка записи (добавление воды/смена нормы): показывается в окне, а не прячет весь значок, как error загрузки
  const saveError = ref<string | null>(null)
  let userId = ''

  const normMl = computed(() => effectiveNormMl(metric.value?.goal_value, autoNormMl.value))

  async function loadAutoNorm() {
    const { data: params } = await sb.from('body_parameters').select('id, name, icon').eq('user_id', userId)
    const weightParam = findWeightParam((params || []) as BodyParameter[])
    if (!weightParam) {
      autoNormMl.value = null
      weightKg.value = null
      const { data: p0 } = await sb.from('profiles').select('height').eq('user_id', userId).maybeSingle()
      heightCm.value = validHeightCm((p0 as { height?: number | null } | null)?.height)
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
    const { data: prof } = await sb.from('profiles').select('height').eq('user_id', userId).maybeSingle()
    heightCm.value = validHeightCm((prof as { height?: number | null } | null)?.height)
    autoNormMl.value = weight ? autoNormFromBody(weight, heightCm.value) : null
  }

  // Сохранить рост (см) в профиль — нужен для авто-нормы; false при неправдоподобном значении или ошибке записи.
  async function saveHeight(cm: number): Promise<boolean> {
    const h = validHeightCm(cm)
    if (h == null) return false
    const { error: err } = await sb.from('profiles').upsert({ user_id: userId, height: h })
    if (err) {
      saveError.value = t('dash_save_error_generic') + err.message
      return false
    }
    saveError.value = null
    resetWaterGoalCache()
    await loadAutoNorm()
    return true
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
  // Возвращает новое значение, либо null, если запись в БД не удалась (тогда UI не показывает «сохранилось»).
  async function addMl(deltaMl: number, dateStr: string): Promise<number | null> {
    if (!metric.value) return null
    const current = await getMlForDate(dateStr)
    const next = nextWaterValue(current, deltaMl)
    const { error: upErr } = await sb
      .from('daily_values')
      .upsert({ user_id: userId, metric_id: metric.value.id, date: dateStr, value: next }, { onConflict: 'user_id,date,metric_id' })
    if (upErr) {
      saveError.value = t('dash_save_error_generic') + upErr.message
      return null
    }
    saveError.value = null
    if (dateStr === fmtDate(new Date())) todayMl.value = next
    notifyDataChanged({ source: 'water', metricId: metric.value.id, date: dateStr, value: next })
    return next
  }

  async function saveGoal(ml: number): Promise<boolean> {
    if (!metric.value) return false
    const { error: err } = await sb.from('metrics').update({ goal_value: ml }).eq('id', metric.value.id)
    if (err) {
      saveError.value = t('dash_save_error_generic') + err.message
      return false
    }
    saveError.value = null
    metric.value = { ...metric.value, goal_value: ml }
    return true
  }

  // Вернуть автоматический расчёт нормы по весу: ручная норма (goal_value) снимается. Возвращает false при ошибке записи.
  async function resetGoalToAuto(): Promise<boolean> {
    if (!metric.value) return false
    const { error: err } = await sb.from('metrics').update({ goal_value: null }).eq('id', metric.value.id)
    if (err) {
      saveError.value = t('dash_save_error_generic') + err.message
      return false
    }
    saveError.value = null
    metric.value = { ...metric.value, goal_value: null }
    return true
  }

  return { metric, normMl, autoNormMl, weightKg, heightCm, saveHeight, todayMl, loaded, error, saveError, init, addMl, getMlForDate, saveGoal, resetGoalToAuto }
}
