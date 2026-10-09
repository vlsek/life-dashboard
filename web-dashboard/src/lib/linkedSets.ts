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

// Значение метрики-подходов за день из записей упражнения этого дня: подходы по времени (без времени — в порядке записи, после тех, что со временем).
export function mirrorSets(entries: { sets?: unknown }[]): SetRow[] {
  const flat: { s: Partial<EntrySet>; i: number }[] = []
  let i = 0
  for (const e of entries) {
    if (!Array.isArray(e?.sets)) continue
    for (const s of e.sets as Partial<EntrySet>[]) flat.push({ s: s || {}, i: i++ })
  }
  flat.sort((a, b) => {
    const ta = a.s.time ?? '\uffff'
    const tb = b.s.time ?? '\uffff'
    return ta === tb ? a.i - b.i : ta < tb ? -1 : 1
  })
  return normalizeSets(flat.map((x) => ({ reps: x.s.reps ?? null, variation: null, time: x.s.time ?? null })))
}
