// Итоги тренировки (BACKLOG 69.10, срез 1): чистый расчёт для окна после «Завершить». Считается ДО записи в базу, по черновику и истории.
import { countedSets, type ActiveDraft } from './activeWorkout'
import { setRecords, topKind, type PRKind } from './records'
import { isWorking, setsVolume } from './sessionContract'
import type { Exercise, WorkoutEntry } from './types'

export interface SummaryRecord { exerciseId: string; kind: PRKind; reps: number | null; weight: number | null; duration: number | null }
export interface WorkoutSummaryData {
  minutes: number; exerciseCount: number; workingSets: number; volume: number
  records: SummaryRecord[]; muscles: string[] // id мышц из упражнений, без повторов, в порядке появления
}

export function summarize(d: ActiveDraft, exercises: readonly Exercise[], entries: readonly WorkoutEntry[], nowMs: number): WorkoutSummaryData {
  const exById = new Map(exercises.map((e) => [e.id, e]))
  const records: SummaryRecord[] = []
  const muscles: string[] = []
  let workingSets = 0, volume = 0, exerciseCount = 0
  for (const e of d.exercises) {
    const done = countedSets(e)
    if (!done.length) continue
    exerciseCount++
    workingSets += done.filter(isWorking).length
    volume += setsVolume(done)
    const hist = entries.filter((x) => x.exercise_id === e.exercise_id && x.date < d.date)
    setRecords(hist, e.sets).forEach((kinds, i) => {
      const k = topKind(kinds)
      if (k) records.push({ exerciseId: e.exercise_id, kind: k, reps: e.sets[i].reps ?? null, weight: e.sets[i].weight ?? null, duration: e.sets[i].duration ?? null })
    })
    for (const m of exById.get(e.exercise_id)?.muscle_groups ?? []) if (!muscles.includes(m)) muscles.push(m)
  }
  const start = Date.parse(d.started_at)
  return { minutes: Number.isFinite(start) && nowMs > start ? Math.round((nowMs - start) / 60000) : 0, exerciseCount, workingSets, volume: Math.round(volume * 10) / 10, records, muscles }
}
// 1250 → «1 250»; дробные — с запятой
export const fmtVolume = (v: number): string => String(v).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
