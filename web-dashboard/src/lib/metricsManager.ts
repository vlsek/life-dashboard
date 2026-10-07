import { todayStr } from './date'
import { findWaterMetric } from './water'
import { currentPlannedSets, plannedSetsLog } from './metrics'
import type { GoalDirection, Metric, MetricOption, MetricType, PlannedSetsEntry, Schedule } from './types'

// Портировано из блока «Настройка метрик» в dashboard.js (openMetricFormModal/addMetric/
// editMetric/parseOptionsRaw/scheduleFields/streakImportFields) — только чистая логика,
// без DOM и без сети (сеть — в useMetricsManager.ts).

export type ScheduleKind = 'daily' | 'days' | 'weekly' | 'at_most'

export interface MetricFormValues {
  name: string
  icon: string
  type: MetricType
  goalDirection: GoalDirection
  goalValue: number
  unit: string
  options: OptionDraft[] // варианты «Выбора» / особенности «Подходов» списком (раньше — строка `ключ:Метка, ключ:Метка`)
  categoryId: string // '' — без категории, '__new__' — создать новую
  newCategory: string // название новой категории (только при categoryId = '__new__'; раньше спрашивалось системным prompt(), BACKLOG 573)
  inputMode: 'set' | 'add'
  scheduleKind: ScheduleKind
  days: number[] // 0 = воскресенье, как Date.getDay()
  weeklyMin: number
  atMostMax: number
  streakImportDays: string // строка, потому что пустое поле ≠ 0
  countStreak: boolean // миграция 031: считать ли серию по метрике
  plannedSets: string // миграция 041: «сколько подходов планируется в день» (только sets); пусто = не задано
  trackOnly: boolean // «просто записывать значение»: без цели, расписания и серии (только number)
}

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

// Вариант в форме. `id` — только для v-for и перетаскивания (в базу не уходит); `key` — ключ, под которым значение хранится в данных: у сохранённого
// варианта он НЕ меняется при правке подписи (иначе перестали бы совпадать записанные значения), у нового пуст и назначается при сохранении.
export interface OptionDraft {
  id: number
  key: string
  label: string
}

let draftSeq = 0
export function newOptionDraft(label = '', key = ''): OptionDraft {
  return { id: ++draftSeq, key, label }
}

export function draftsFromOptions(options: MetricOption[] | null | undefined): OptionDraft[] {
  return (options || []).map((o) => newOptionDraft(o.label || o.key, o.key))
}

// Ключ нового варианта — сама подпись (так же, как у «Подходов»: rememberVariationOptions кладёт { key: текст, label: текст }); при совпадении с уже занятым
// ключом добавляется « 2», « 3»…
export function uniqueOptionKey(label: string, taken: ReadonlySet<string>): string {
  if (!taken.has(label)) return label
  let n = 2
  while (taken.has(`${label} ${n}`)) n++
  return `${label} ${n}`
}

// Список для базы: пустые подписи отбрасываются, подпись чистится от лишних пробелов, у новых вариантов появляется ключ; порядок как в списке.
export function optionsFromDrafts(drafts: OptionDraft[] | null | undefined): MetricOption[] {
  const list = (drafts || []).map((d) => ({ key: d.key, label: d.label.trim().replace(/\s+/g, ' ') })).filter((d) => d.label)
  const taken = new Set(list.map((d) => d.key).filter(Boolean)) // ключи сохранённых вариантов заняты в первую очередь
  return list.map((d) => {
    const key = d.key || uniqueOptionKey(d.label, taken)
    taken.add(key)
    return { key, label: d.label }
  })
}

// Расписание из значений формы. «days» с 0 или 7 выбранными днями = «каждый день» (null).
export function buildSchedule(f: Pick<MetricFormValues, 'scheduleKind' | 'days' | 'weeklyMin' | 'atMostMax'>): Schedule {
  if (f.scheduleKind === 'days' && f.days.length > 0 && f.days.length < 7) {
    return { type: 'days', days: [...f.days].sort((a, b) => a - b) }
  }
  if (f.scheduleKind === 'weekly') return { type: 'weekly', min: Math.min(7, Math.max(1, Math.trunc(f.weeklyMin) || 1)) }
  if (f.scheduleKind === 'at_most') return { type: 'at_most', max: Math.min(7, Math.max(0, Math.trunc(f.atMostMax) || 0)) }
  return null
}

export function scheduleKindOf(s: Schedule | undefined): ScheduleKind {
  return s?.type ?? 'daily'
}

// Краткая подпись расписания для списка метрик (портировано из openMetricsManagerModal()).
export function scheduleSummary(
  s: Schedule | undefined,
  weekdayNames: string[],
  weeklyShort: string,
  atMostShort: string,
): string | null {
  if (!s) return null
  if (s.type === 'days') {
    return WEEK_ORDER.filter((d) => s.days.includes(d))
      .map((d) => weekdayNames[WEEK_ORDER.indexOf(d)])
      .join(' ')
  }
  if (s.type === 'weekly') return `${s.min}${weeklyShort}`
  return `${atMostShort} ${s.max}${weeklyShort}`
}

// Какие поля формы активны для типа — портировано из applyTypeState().
export function fieldsEnabledForType(type: MetricType) {
  const goalApplies = type === 'number' || type === 'sets'
  return {
    goal: goalApplies, // направление цели, значение цели, единица
    inputMode: type === 'number',
    options: type === 'multiselect' || type === 'sets',
  }
}

// При смене типа на boolean цель/единица/варианты очищаются (как в оригинале).
export function clearedForBoolean(f: MetricFormValues): MetricFormValues {
  return { ...f, goalValue: 0, unit: '', options: [] }
}

// «Просто записывать значение» (BACKLOG 14, 11:15): числовая метрика без цели, расписания и серии — вес, замеры.
// Отдельной колонки нет: режим определяется по сохранённым полям — серия выключена (миграция 031), цель нейтральная
// (0, «не менее»), расписания нет. Метрика с такими полями по смыслу и есть «только значение».
export function isTrackOnlyMetric(m: Pick<Metric, 'type' | 'count_streak' | 'goal_value' | 'schedule'>): boolean {
  return m.type === 'number' && m.count_streak === false && (m.goal_value ?? 0) === 0 && !m.schedule
}

// Значения формы, которые реально сохраняются: в режиме «просто записывать значение» всё остальное нейтрализуется
// (цель 0 «не менее», каждый день, без импорта серии, серия выключена); вне числового типа режим не действует.
export function effectiveForm(f: MetricFormValues): MetricFormValues {
  if (!(f.trackOnly && f.type === 'number')) return f.trackOnly ? { ...f, trackOnly: false } : f
  return { ...f, goalValue: 0, goalDirection: 'at_least', scheduleKind: 'daily', streakImportDays: '', countStreak: false }
}

// Какие поля формы активны — по типу (fieldsEnabledForType) и по режиму «просто записывать значение»:
// при «да» цель, расписание, серия и импорт серии отключаются; единица измерения остаётся (вес — «кг»).
export function fieldsEnabledForForm(f: Pick<MetricFormValues, 'type' | 'trackOnly'> & Partial<Pick<MetricFormValues, 'goalDirection'>>) {
  const byType = fieldsEnabledForType(f.type)
  const track = f.trackOnly && f.type === 'number'
  return {
    trackOnlyAvailable: f.type === 'number',
    goal: byType.goal && !track, // направление и значение цели
    unit: byType.goal, // единица нужна и «просто значению»
    inputMode: byType.inputMode,
    options: byType.options,
    schedule: !track,
    countStreak: !track,
    streakImport: !track,
    plannedSets: f.type === 'sets' && f.goalDirection !== 'at_most', // «не более» — другой смысл, плана подходов нет
  }
}

// Сколько полей в блоке «Дополнительно» отличаются от значений по умолчанию (BACKLOG «Форма метрики: слишком много всего»). Считаются только поля, которые
// для текущего типа действуют (у «просто значения» серия и расписание выключены — это не «нестандартное»). Нужно, чтобы блок раскрывался сам при правке
// метрики с настройками и чтобы у свёрнутого блока было видно, что внутри что-то изменено.
export function countAdvancedChanges(f: MetricFormValues): number {
  const en = fieldsEnabledForForm(f)
  let n = 0
  if (en.goal && f.goalDirection !== 'at_least') n++
  if (en.inputMode && f.inputMode !== 'set') n++
  if (en.schedule && f.scheduleKind !== 'daily') n++
  if (f.categoryId !== '') n++
  if (en.countStreak && !f.countStreak) n++
  if (en.streakImport && f.countStreak && f.streakImportDays.trim() !== '') n++
  if (en.plannedSets && f.plannedSets.trim() !== '') n++
  if (f.type === 'sets' && f.options.length > 0) n++ // особенности «Подходов» лежат в «Дополнительно»
  return n
}

export function emptyForm(): MetricFormValues {
  return {
    name: '',
    icon: 'svg:pin',
    type: 'number',
    goalDirection: 'at_least',
    goalValue: 0,
    unit: '',
    options: [],
    categoryId: '',
    newCategory: '',
    inputMode: 'set',
    scheduleKind: 'daily',
    days: [1, 2, 3, 4, 5],
    weeklyMin: 3,
    atMostMax: 2,
    streakImportDays: '',
    countStreak: true,
    plannedSets: '',
    trackOnly: false,
  }
}

export function formFromMetric(m: Metric): MetricFormValues {
  const s = m.schedule
  return {
    name: m.name,
    icon: m.icon ?? 'svg:pin',
    type: m.type,
    goalDirection: m.goal_direction ?? 'at_least',
    goalValue: m.goal_value ?? 0,
    unit: m.unit ?? '',
    options: draftsFromOptions(m.options),
    categoryId: m.category_id ?? '',
    newCategory: '',
    inputMode: m.input_mode ?? 'set',
    scheduleKind: scheduleKindOf(s),
    days: s?.type === 'days' ? [...s.days] : [1, 2, 3, 4, 5],
    weeklyMin: s?.type === 'weekly' ? s.min : 3,
    atMostMax: s?.type === 'at_most' ? s.max : 2,
    streakImportDays: m.streak_import_days != null ? String(m.streak_import_days) : '',
    countStreak: m.count_streak !== false,
    plannedSets: currentPlannedSets(m) != null ? String(currentPlannedSets(m)) : '',
    trackOnly: isTrackOnlyMetric(m),
  }
}

function parsedImportDays(f: MetricFormValues): number | null {
  return f.streakImportDays === '' ? null : Math.max(0, parseInt(f.streakImportDays, 10) || 0)
}

// Расписание пишем только если оно задано (или колонка уже есть у метрики) — так правка
// метрик работает и до применения миграции 021 (портировано из scheduleFields()).
export function scheduleFields(f: MetricFormValues, existing: Metric | null): { schedule?: Schedule } {
  const schedule = buildSchedule(f)
  if (schedule || (existing && 'schedule' in existing)) return { schedule }
  return {}
}

// Миграция 031: серию пишем, если она выключена (иначе без колонки получим понятную ошибку с подсказкой) или колонка
// у метрики уже есть — так правка метрик работает и до применения миграции (по образцу scheduleFields()).
export function countStreakFields(f: MetricFormValues, existing: Metric | null): { count_streak?: boolean } {
  const value = effectiveForm(f).countStreak
  if (!value || (existing && 'count_streak' in existing)) return { count_streak: value }
  return {}
}

// Миграция 041: плановое число подходов в день (1..50) из поля формы; пусто/мусор → null.
export function parsePlannedSets(raw: string | number | null | undefined): number | null {
  if (raw == null || String(raw).trim() === '') return null
  const n = Math.floor(Number(raw))
  return Number.isFinite(n) && n >= 1 ? Math.min(50, n) : null
}

// Журнал планового числа подходов (миграция 041). Пишем ТОЛЬКО при изменении значения: к журналу добавляется запись «с сегодняшнего
// дня», старые записи и все прошлые дни остаются как были — баланс не «прыгает» ни при включении, ни при смене числа (решение
// владельца 2026-10-03). Без колонки (у существующей метрики нет ключа planned_sets_log) — ничего не пишем: поле в форме скрыто.
// Новые записи получают frac: true — с этого дня за подходы идут ДРОБНЫЕ баллы (миграция 045, v2.69). Запись прежнего формата (без
// frac), если метрику сохранили с тем же числом, «обновляется» новой записью с сегодняшнего дня; прошлые дни остаются по-старому.
export function plannedSetsFields(
  f: MetricFormValues,
  existing: Metric | null,
  today: string = todayStr(),
): { planned_sets_log?: PlannedSetsEntry[] } {
  if (existing && !('planned_sets_log' in existing)) return {}
  const ef = effectiveForm(f)
  const n = ef.type === 'sets' && ef.goalDirection !== 'at_most' ? parsePlannedSets(ef.plannedSets) : null
  const log = existing ? plannedSetsLog(existing) : []
  const last = log.length ? log[log.length - 1] : null
  const current = last && last.n != null && last.n >= 1 ? last.n : null
  if (n === current && (n === null || last?.frac === true)) return {}
  const next = log.filter((e) => e.from !== today) // правка в тот же день заменяет запись, а не плодит новую
  next.push(n == null ? { from: today, n: null } : { from: today, n, frac: true })
  return { planned_sets_log: next.slice(-100) }
}

// Портировано из streakImportFields(): импорт стрика (миграция 026) — «уже было N дней».
export function streakImportFields(
  f: MetricFormValues,
  existing: Metric,
  today: string = todayStr(),
): { streak_import_days?: number | null; streak_import_date?: string | null } {
  const days = parsedImportDays(f)
  if (!(days != null && days > 0)) {
    return 'streak_import_days' in existing ? { streak_import_days: null, streak_import_date: null } : {}
  }
  if (!('streak_import_days' in existing)) return {} // миграция 026 ещё не применена
  const changed = days !== (existing.streak_import_days ?? null) // дата сбрасывается, только если число поменяли
  return { streak_import_days: days, streak_import_date: changed ? today : (existing.streak_import_date ?? today) }
}

// Общие поля insert/update. category_id — уже разрешённый (не '__new__').
function commonFields(f: MetricFormValues, categoryId: string | null) {
  return {
    name: f.name.trim(),
    icon: f.icon || 'svg:pin',
    type: f.type,
    goal_direction: f.goalDirection,
    goal_value: Number.isFinite(f.goalValue) ? f.goalValue : 0,
    unit: f.unit,
    options: optionsFromDrafts(f.options),
    category_id: categoryId,
    input_mode: f.inputMode,
  }
}

export function buildInsertRow(form: MetricFormValues, userId: string, position: number, categoryId: string | null) {
  const f = effectiveForm(form)
  return { user_id: userId, ...commonFields(f, categoryId), position, active: true, ...scheduleFields(f, null), ...countStreakFields(f, null), ...plannedSetsFields(f, null) }
}

export function buildUpdateRow(form: MetricFormValues, existing: Metric, categoryId: string | null) {
  const f = effectiveForm(form)
  return { ...commonFields(f, categoryId), ...scheduleFields(f, existing), ...countStreakFields(f, existing), ...streakImportFields(f, existing), ...plannedSetsFields(f, existing) }
}

// Позиция новой метрики — максимум существующих + 1 (пусто → 0).
export function nextPosition(existing: { position: number }[]): number {
  return existing.reduce((mx, m) => Math.max(mx, m.position), -1) + 1
}

// Ключ для новой категории — портировано из resolveCategoryId().
export function categoryKeyFor(label: string, nowMs: number = Date.now()): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9а-яё]+/gi, '_').slice(0, 30) + '_' + nowMs.toString(36)
}

// Подпись цели в списке метрик (портировано из openMetricsManagerModal()).
export function goalSummary(
  m: Pick<Metric, 'type' | 'goal_direction' | 'goal_value' | 'unit'> & Partial<Pick<Metric, 'count_streak' | 'schedule'>>,
  boolLabel: string,
  multiLabel: string,
  trackOnlyLabel?: string,
): string {
  // «просто значение» (вес и т.п.) — не «≥ 0 кг», а своя подпись
  if (trackOnlyLabel && isTrackOnlyMetric({ type: m.type, count_streak: m.count_streak, goal_value: m.goal_value, schedule: m.schedule ?? null })) {
    return m.unit ? `${trackOnlyLabel}, ${m.unit}` : trackOnlyLabel
  }
  if (m.type === 'number') return `${m.goal_direction === 'at_most' ? '<' : '≥'} ${m.goal_value ?? 0} ${m.unit || ''}`
  return m.type === 'boolean' ? boolLabel : multiLabel
}

// «Вода» живёт своим блоком (правый верхний угол Дашборда) и в списке настроек метрик дня быть не должна
// (BACKLOG 7.1, решение владельца): отключается только из будущих «Глобальных настроек». Скрываем ровно ту
// метрику, которую Дашборд считает водой (findWaterMetric — первая по иконке-капле/названию), остальные — как есть.
export function withoutWater(metrics: Metric[]): Metric[] {
  const water = findWaterMetric(metrics)
  return water ? metrics.filter((m) => m !== water) : metrics
}
