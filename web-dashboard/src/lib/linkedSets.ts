import { normalizeSets, nowHHMM } from './setsBlock'
import type { SetRow } from './setsBlock'

// Быстрый ввод подхода на Дашборде для метрики, связанной с упражнением «Тренировок» (миграция 054, BACKLOG 44.5а «насквозь»).
// «Тренировки» — источник правды: подход пишется в workout_entries, а значение метрики за день пересчитывается из ВСЕХ записей упражнения
// за дату (КОПИЯ правил web-workouts/src/lib/metricLink.ts: setsOfDay + metricValueFor — по принятому правилу пилотов копируем, не импортируем).

export interface EntrySet {
  reps: number | null
  weight: number | null
  time: string | null
  duration: number | null
  side: 'L' | 'R' | null
  variation?: string | null // «особенность» подхода (BACKLOG 63.2); в «Тренировках» то же поле
}

// Повторы из поля: только положительное конечное число (0, пусто и мусор — нет).
export function parseQuickReps(raw: string): number | null {
  const n = parseFloat(String(raw).replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

// Подход записи тренировки из быстрого ввода: вес/длительность не знаем — пусто (их при желании дописывают в «Тренировках»).
export function newEntrySet(reps: number, now: Date = new Date()): EntrySet {
  return { reps, weight: null, time: nowHHMM(now), duration: null, side: null }
}

// Подходы сегодняшней записи + новый (запись могла быть пустой/битой — тогда только новый).
export function appendEntrySet(existing: unknown, set: EntrySet): EntrySet[] {
  return [...(Array.isArray(existing) ? (existing as EntrySet[]) : []), set]
}

// Подходы дня в порядке показа: по времени, без времени — после, в порядке записи. Вместе с адресом подхода (запись, номер в ней) — по адресу правим «Тренировки».
interface SetRef {
  e: number
  s: number
  set: Partial<EntrySet>
}
function orderedRefs(entries: { sets?: unknown }[]): SetRef[] {
  const flat: (SetRef & { i: number })[] = []
  let i = 0
  entries.forEach((e, ei) => {
    if (!Array.isArray(e?.sets)) return
    ;(e.sets as Partial<EntrySet>[]).forEach((s, si) => flat.push({ e: ei, s: si, set: s || {}, i: i++ }))
  })
  flat.sort((a, b) => {
    const ta = a.set.time ?? '\uffff'
    const tb = b.set.time ?? '\uffff'
    return ta === tb ? a.i - b.i : ta < tb ? -1 : 1
  })
  return flat
}

// Значение метрики-подходов за день из записей упражнения этого дня.
export function mirrorSets(entries: { sets?: unknown }[]): SetRow[] {
  return normalizeSets(orderedRefs(entries).map((x) => ({ reps: x.set.reps ?? null, variation: x.set.variation?.trim() || null, time: x.set.time ?? null })))
}

// Правка подходов дня «столбиком» (BACKLOG 63.2): те же строки, что у обычной метрики-подходов, но пишем в записи «Тренировок».
// Каждая функция возвращает план записи: что обновить, что удалить, что вставить, и записи дня ПОСЛЕ правки (из них считается значение метрики).
export interface DayEntry {
  id: string
  sets: unknown
}
export interface DayEdit {
  update: { id: string; sets: Partial<EntrySet>[] }[]
  remove: string[]
  insert: Partial<EntrySet>[] | null
  rows: { sets: unknown }[]
}
const setsOf = (e: DayEntry): Partial<EntrySet>[] => (Array.isArray(e?.sets) ? [...(e.sets as Partial<EntrySet>[])] : [])

export function editDayRow(entries: DayEntry[], rowIndex: number, patch: Partial<SetRow>): DayEdit | null {
  const r = orderedRefs(entries)[rowIndex]
  if (!r) return null
  const sets = setsOf(entries[r.e])
  const next: Partial<EntrySet> = { ...sets[r.s] }
  if ('reps' in patch) next.reps = patch.reps ?? null
  if ('time' in patch) next.time = patch.time ?? null
  if ('variation' in patch) {
    if (patch.variation && patch.variation.trim()) next.variation = patch.variation.trim()
    else delete next.variation
  }
  sets[r.s] = next
  const id = entries[r.e].id
  return { update: [{ id, sets }], remove: [], insert: null, rows: entries.map((e, i) => (i === r.e ? { sets } : { sets: e.sets })) }
}

export function removeDayRow(entries: DayEntry[], rowIndex: number): DayEdit | null {
  const r = orderedRefs(entries)[rowIndex]
  if (!r) return null
  const sets = setsOf(entries[r.e])
  sets.splice(r.s, 1)
  const id = entries[r.e].id
  if (sets.length === 0) return { update: [], remove: [id], insert: null, rows: entries.filter((_, i) => i !== r.e).map((e) => ({ sets: e.sets })) }
  return { update: [{ id, sets }], remove: [], insert: null, rows: entries.map((e, i) => (i === r.e ? { sets } : { sets: e.sets })) }
}

// «+ подход»: копия последнего подхода дня (повторы, вес, сторона, особенность) с новым временем; дня ещё нет — пустой подход (повторы вносят в строке).
export function addDayRow(entries: DayEntry[], now: Date = new Date()): DayEdit {
  const last = orderedRefs(entries).slice(-1)[0]?.set
  const set: Partial<EntrySet> = last
    ? { reps: last.reps ?? null, weight: last.weight ?? null, time: nowHHMM(now), duration: last.duration ?? null, side: last.side ?? null, ...(last.variation ? { variation: last.variation } : {}) }
    : { reps: null, weight: null, time: nowHHMM(now), duration: null, side: null }
  const target = entries[entries.length - 1]
  if (!target) return { update: [], remove: [], insert: [set], rows: [{ sets: [set] }] }
  const sets = [...setsOf(target), set]
  return { update: [{ id: target.id, sets }], remove: [], insert: null, rows: entries.map((e, i) => (i === entries.length - 1 ? { sets } : { sets: e.sets })) }
}

// Значение метрики-числа за день из записей упражнения: сумма повторов всех подходов (КОПИЯ metricValueFor('number') из web-workouts).
export function sumReps(entries: { sets?: unknown }[]): number {
  let sum = 0
  for (const e of entries) {
    if (!Array.isArray(e?.sets)) continue
    for (const s of e.sets as Partial<EntrySet>[]) sum += s?.reps || 0
  }
  return sum
}
