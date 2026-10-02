import { computed, ref } from 'vue'
import { sb } from './supabase'
import { notifyDataChanged } from './events'
import { fmtDate, todayStr } from './date'
import { t } from './i18n'
import { effectiveNormMl, findWaterMetric, findWeightParam, nextWaterValue } from './water'
import { autoNormFromBody, validHeightCm, resetWaterGoalCache } from './waterGoal'
import { canUndo as stackCanUndo, loadStacks, pushEntry, saveStack, type UndoEntry } from './waterUndo'
import {
  LOG_VIEW_LIMIT,
  buildLogInsert,
  defaultDrankAt,
  isMissingTable,
  localRows,
  rowFromDb,
  sortNewestFirst,
  type DayLogView,
  type WaterLogKind,
  type WaterLogRow,
} from './waterLog'
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
  // «Отменить последнее добавление»: стеки {prev,next} по дням (localStorage), см. waterUndo.ts. Реактивны — кнопка в окне гаснет/оживает сама.
  const undoStacks = ref<Record<string, UndoEntry[]>>({})
  // Журнал воды в БД (water_log, миграция 036): строки по дням + «таблица есть?» (null — ещё не знаем; false — миграция не применена,
  // тогда журнал берём из записей этого устройства). Запись в журнал идёт ОЧЕРЕДЬЮ в фоне (best-effort): её сбой не ломает основную запись.
  const serverLogs = ref<Record<string, WaterLogRow[]>>({})
  const logAvailable = ref<boolean | null>(null)
  let logTail: Promise<unknown> = Promise.resolve()
  function enqueueLog(job: () => Promise<void>) {
    logTail = logTail.then(job).catch(() => {})
    return logTail
  }
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
  // Копия логики из web-dashboard/src/lib/useWater.ts (BACKLOG 12), без анимации баллов: слоя PointsFloat в шапке нет.
  async function writeDay(dateStr: string, current: number, next: number, record = true, drankAt?: number, kind: WaterLogKind = 'add'): Promise<number | null> {
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
    if (record) {
      // Когда выпито: выбранное в окне время; иначе сейчас (сегодня) / 12:00 (прошлый день, вода задним числом).
      const at = drankAt ?? defaultDrankAt(dateStr, fmtDate(new Date()), Date.now())
      setStack(dateStr, pushEntry(undoStacks.value[dateStr] ?? [], current, next, at))
      void enqueueLog(() => insertLog(dateStr, current, next, kind, at))
    }
    notifyDataChanged({ source: 'water', metricId: metric.value.id, date: dateStr, value: next })
    return next
  }

  // Запись в журнал (water_log): вставка строки, привязка её id к записи стека «Отменить», показ в журнале дня. Всё в try/catch снаружи
  // (enqueueLog глотает ошибки); нет таблицы — запоминаем это и дальше не пытаемся.
  async function insertLog(dateStr: string, current: number, next: number, kind: WaterLogKind, at: number): Promise<void> {
    if (logAvailable.value === false || next === current) return
    const { data, error: err } = await sb
      .from('water_log')
      .insert(buildLogInsert(userId, dateStr, next - current, next, kind, at))
      .select('id, drank_at, delta_ml, total_after_ml, kind')
      .single()
    if (err) {
      if (isMissingTable(err)) logAvailable.value = false
      return
    }
    logAvailable.value = true
    const row = rowFromDb(data as never)
    if (!row) return
    const stack = undoStacks.value[dateStr] ?? []
    const idx = stack.findIndex((e) => e.at === at && e.next === next && !e.logId)
    if (idx >= 0) setStack(dateStr, stack.map((e, i) => (i === idx ? { ...e, logId: row.id } : e)))
    serverLogs.value = { ...serverLogs.value, [dateStr]: sortNewestFirst([row, ...(serverLogs.value[dateStr] ?? [])]).slice(0, LOG_VIEW_LIMIT) }
  }

  async function deleteLog(dateStr: string, logId: string): Promise<void> {
    const { error: err } = await sb.from('water_log').delete().eq('id', logId).eq('user_id', userId)
    if (err) return
    serverLogs.value = { ...serverLogs.value, [dateStr]: (serverLogs.value[dateStr] ?? []).filter((r) => r.id !== logId) }
  }

  // Журнал дня для окна воды: из БД (виден на всех устройствах), пока таблицы нет или за день там пусто — записи этого устройства.
  async function loadDayLog(dateStr: string): Promise<void> {
    if (!metric.value || logAvailable.value === false) return
    await logTail // не перетирать только что добавленные строки, которые ещё пишутся
    const { data, error: err } = await sb
      .from('water_log')
      .select('id, drank_at, delta_ml, total_after_ml, kind')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .order('drank_at', { ascending: false })
      .limit(LOG_VIEW_LIMIT)
    if (err) {
      if (isMissingTable(err)) logAvailable.value = false
      return
    }
    logAvailable.value = true
    const rows = ((data ?? []) as never[]).map(rowFromDb).filter((r): r is WaterLogRow => r !== null)
    serverLogs.value = { ...serverLogs.value, [dateStr]: rows }
  }

  function dayLog(dateStr: string): DayLogView {
    const server = serverLogs.value[dateStr]
    if (logAvailable.value !== false && server && server.length) return { rows: sortNewestFirst(server).slice(0, LOG_VIEW_LIMIT), source: 'server' }
    return { rows: localRows(undoStacks.value[dateStr]).slice(0, LOG_VIEW_LIMIT), source: 'local' }
  }

  // Портировано из addWaterMl(): читает текущее значение за дату, прибавляет дельту, upsert-ит.
  async function addMl(deltaMl: number, dateStr: string, drankAt?: number): Promise<number | null> {
    if (!metric.value) return null
    const current = await getMlForDate(dateStr)
    return writeDay(dateStr, current, nextWaterValue(current, deltaMl), true, drankAt, 'add')
  }

  // Правка ВСЕЙ суммы за день (карандашик в окне): перезаписывает значение выбранной даты, откатывается кнопкой «Отменить».
  async function setTotal(ml: number, dateStr: string, drankAt?: number): Promise<number | null> {
    if (!metric.value || !Number.isFinite(ml) || ml < 0) return null
    const current = await getMlForDate(dateStr)
    const next = Math.round(ml)
    if (next === current) return current
    return writeDay(dateStr, current, next, true, drankAt, 'edit')
  }

  // Отмена последней записи дня: только если значение дня всё ещё то, что мы записали (иначе его успели изменить в другом месте —
  // откатывать «вслепую» нельзя, стек в этом случае сбрасываем). Возвращает значение после отмены или null.
  async function undoLast(dateStr: string): Promise<number | null> {
    if (!metric.value) return null
    await logTail // запись журнала могла ещё не закончиться: нужен её id, чтобы удалить строку
    const stack = undoStacks.value[dateStr] ?? []
    const top = stack[stack.length - 1]
    if (!top) return null
    const current = await getMlForDate(dateStr)
    if (!stackCanUndo(stack, current)) {
      setStack(dateStr, [])
      return null
    }
    const res = await writeDay(dateStr, current, top.prev, false)
    if (res !== null) {
      setStack(dateStr, stack.slice(0, -1))
      const id = top.logId
      if (id) void enqueueLog(() => deleteLog(dateStr, id))
    }
    return res
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

  return { metric, normMl, autoNormMl, weightKg, heightCm, saveHeight, todayMl, loaded, error, saveError, init, addMl, setTotal, undoLast, canUndo, dayLog, loadDayLog, flushLog: () => logTail, getMlForDate, saveGoal, resetGoalToAuto }
}
