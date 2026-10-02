import { computed, ref } from 'vue'
import { sb } from './supabase'
import { notifyDataChanged } from './events'
import { emitPointsFloat, pointsDelta } from './pointsFloat'
import { fmtDate, todayStr } from './date'
import { t } from './i18n'
import { effectiveNormMl, findWaterMetric, findWeightParam, nextWaterValue } from './water'
import { autoNormFromBody, validHeightCm, resetWaterGoalCache } from './waterGoal'
import type { BodyParameter } from './water'
import { canUndo as stackCanUndo, loadStacks, pushEntry, saveStack, type UndoEntry } from './waterUndo'
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
  // «Отменить последнее добавление»: стеки {prev,next} по дням (localStorage), см. waterUndo.ts. Реактивны — кнопка в окне гаснет/оживает сама.
  const undoStacks = ref<Record<string, UndoEntry[]>>({})
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
    undoStacks.value = loadStacks(uid, todayStr())
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

  function setStack(dateStr: string, stack: UndoEntry[]) {
    undoStacks.value = { ...undoStacks.value, [dateStr]: stack }
    saveStack(userId, dateStr, stack)
  }

  // Единая запись значения дня (добавление, правка суммы, отмена). Возвращает записанное значение или null, если запись в БД не
  // удалась (тогда UI не показывает «сохранилось»). `record` — запоминать ли шаг для «Отменить» (сама отмена себя не запоминает).
  async function writeDay(dateStr: string, current: number, next: number, record = true): Promise<number | null> {
    if (!metric.value) return null
    const { error: upErr } = await sb
      .from('daily_values')
      .upsert({ user_id: userId, metric_id: metric.value.id, date: dateStr, value: next }, { onConflict: 'user_id,date,metric_id' })
    if (upErr) {
      saveError.value = t('dash_save_error_generic') + upErr.message
      return null
    }
    saveError.value = null
    if (dateStr === fmtDate(new Date())) todayMl.value = next
    if (record) setStack(dateStr, pushEntry(undoStacks.value[dateStr] ?? [], current, next, Date.now()))
    notifyDataChanged({ source: 'water', metricId: metric.value.id, date: dateStr, value: next })
    // «+1 / −1 с монетой» (BACKLOG 14, 11:11): балл за воду — когда набрана эффективная норма (ручная → авто по весу → 2000),
    // а не при любом значении: считаем по метрике с подставленной нормой (migrations/033). Только если статус «выполнено» сменился.
    emitPointsFloat(pointsDelta({ ...metric.value, goal_value: normMl.value }, current, next))
    return next
  }

  // Портировано из addWaterMl(): читает текущее значение за дату, прибавляет дельту, upsert-ит.
  async function addMl(deltaMl: number, dateStr: string): Promise<number | null> {
    if (!metric.value) return null
    const current = await getMlForDate(dateStr)
    return writeDay(dateStr, current, nextWaterValue(current, deltaMl))
  }

  // Правка ВСЕЙ суммы за день (карандашик в окне): перезаписывает значение выбранной даты, откатывается кнопкой «Отменить».
  async function setTotal(ml: number, dateStr: string): Promise<number | null> {
    if (!metric.value || !Number.isFinite(ml) || ml < 0) return null
    const current = await getMlForDate(dateStr)
    const next = Math.round(ml)
    if (next === current) return current
    return writeDay(dateStr, current, next)
  }

  // Отмена последней записи дня: только если значение дня всё ещё то, что мы записали (иначе его успели изменить в другом месте —
  // откатывать «вслепую» нельзя, стек в этом случае сбрасываем). Возвращает значение после отмены или null.
  async function undoLast(dateStr: string): Promise<number | null> {
    if (!metric.value) return null
    const stack = undoStacks.value[dateStr] ?? []
    const top = stack[stack.length - 1]
    if (!top) return null
    const current = await getMlForDate(dateStr)
    if (!stackCanUndo(stack, current)) {
      setStack(dateStr, [])
      return null
    }
    const res = await writeDay(dateStr, current, top.prev, false)
    if (res !== null) setStack(dateStr, stack.slice(0, -1))
    return res
  }

  // Журнал добавлений за дату для окна воды (BACKLOG 2.2): только записи этого устройства, со временем.
  function dayLog(dateStr: string): UndoEntry[] {
    return undoStacks.value[dateStr] ?? []
  }

  // Для окна воды: доступна ли отмена для даты при показанной сейчас сумме.
  function canUndo(dateStr: string, currentMl: number): boolean {
    return stackCanUndo(undoStacks.value[dateStr], currentMl)
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

  return { metric, normMl, autoNormMl, weightKg, heightCm, saveHeight, todayMl, loaded, error, saveError, init, addMl, setTotal, undoLast, canUndo, dayLog, getMlForDate, saveGoal, resetGoalToAuto, createWaterMetric }
}
