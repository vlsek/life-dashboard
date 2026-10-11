import { describe, expect, it } from 'vitest'
import { BUCKET_ORDER, LOAD_WEEKS, bucketOf, groupLastRows, muscleSessions, muscleVolume, trainingStrips, weeklyLoad } from './muscleHistory'
import { lastTrainedRows } from './muscleStats'
import { MUSCLE_IDS } from './muscles'

const bench = { id: 'bench', name: 'Жим лёжа' }
const squat = { id: 'squat', name: 'Приседания' }
const set = (reps: number | null) => ({ reps, weight: 50, time: null, duration: null, side: null })
const entry = (exercise_id: string, date: string, reps: (number | null)[] = [10, 10]) => ({ exercise_id, date, sets: reps.map(set) })
const TODAY = '2026-09-30'

describe('bucketOf', () => {
  it('границы: 0–1 свежие, 2–6 неделя, 7+ давно, null — ещё не тренировали', () => {
    expect([0, 1].map(bucketOf)).toEqual(['fresh', 'fresh'])
    expect([2, 6].map(bucketOf)).toEqual(['recent', 'recent'])
    expect([7, 30].map(bucketOf)).toEqual(['stale', 'stale'])
    expect(bucketOf(null)).toBe('never')
  })
})

describe('groupLastRows', () => {
  const rows = lastTrainedRows([entry('bench', '2026-09-29'), entry('squat', '2026-09-20')], [bench, squat], TODAY, MUSCLE_IDS)
  const g = groupLastRows(rows)
  it('группы идут в порядке «пора тренировать» → … → «ещё не тренировали», пустые не выводятся', () => {
    expect(g.map((x) => x.bucket)).toEqual(BUCKET_ORDER.filter((b) => g.some((x) => x.bucket === b)))
    expect(g.map((x) => x.bucket)).toEqual(['stale', 'fresh', 'never'])
  })
  it('мышцы лежат в своей группе', () => {
    expect(g.find((x) => x.bucket === 'fresh')!.rows.map((r) => r.muscle)).toContain('chest')
    expect(g.find((x) => x.bucket === 'stale')!.rows.map((r) => r.muscle)).toContain('quads')
    expect(g.find((x) => x.bucket === 'never')!.rows.map((r) => r.muscle)).toContain('calves')
  })
  it('ни одна мышца не потеряна и не продублирована', () => {
    expect(g.flatMap((x) => x.rows.map((r) => r.muscle)).sort()).toEqual([...MUSCLE_IDS].sort())
  })
  it('внутри «давно» запущенные сверху, внутри «свежих» самые свежие сверху', () => {
    const rs = groupLastRows(lastTrainedRows([entry('bench', '2026-09-10'), entry('squat', '2026-09-20')], [bench, squat], TODAY, MUSCLE_IDS))
    const stale = rs.find((x) => x.bucket === 'stale')!.rows
    expect(stale.map((r) => r.ago)).toEqual([...stale.map((r) => r.ago)].sort((a, b) => (b as number) - (a as number)))
    const fr = groupLastRows(lastTrainedRows([entry('bench', '2026-09-29'), entry('squat', '2026-09-30')], [bench, squat], TODAY, MUSCLE_IDS)).find((x) => x.bucket === 'fresh')!.rows
    expect(fr[0].ago).toBe(0)
    expect(fr[fr.length - 1].ago).toBe(1)
  })
})

describe('trainingStrips', () => {
  const s = trainingStrips([entry('bench', TODAY), entry('bench', '2026-09-28'), entry('bench', '2026-09-10')], [bench], TODAY, MUSCLE_IDS)
  it('14 дней, от старого к новому: последний элемент — сегодня', () => {
    expect(s.chest).toHaveLength(14)
    expect(s.chest[13]).toBe(true)
    expect(s.chest[11]).toBe(true) // 28.09
    expect(s.chest[12]).toBe(false)
    expect(s.chest.filter(Boolean)).toHaveLength(2) // 10.09 вне окна
  })
  it('нетронутая мышца — все false; пустые записи и будущее не считаются', () => {
    expect(s.calves.every((x) => !x)).toBe(true)
    const t = trainingStrips([{ exercise_id: 'bench', date: TODAY, sets: [] }, entry('bench', '2026-10-05')], [bench], TODAY, MUSCLE_IDS)
    expect(t.chest.every((x) => !x)).toBe(true)
  })
})

describe('muscleSessions / muscleVolume', () => {
  const entries = [entry('bench', '2026-09-29', [10, 8]), entry('bench', '2026-09-29', [5]), entry('bench', '2026-09-20', [12, null]), entry('squat', '2026-09-30', [10]), entry('bench', '2026-08-01', [6])]
  const ses = muscleSessions(entries, [bench, squat], TODAY, 'chest')
  it('дни новые сверху; подходы и повторы суммируются по дню, null-повторы пропускаются', () => {
    expect(ses.map((x) => x.date)).toEqual(['2026-09-29', '2026-09-20', '2026-08-01'])
    expect(ses[0]).toEqual({ date: '2026-09-29', exercises: ['Жим лёжа'], sets: 3, reps: 23 })
    expect(ses[1].reps).toBe(12)
    expect(ses[1].sets).toBe(2)
  })
  it('другая мышца в историю не попадает; нет записей — пусто', () => {
    expect(ses.every((x) => !x.exercises.includes('Приседания'))).toBe(true)
    expect(muscleSessions(entries, [bench, squat], TODAY, 'calves')).toEqual([])
  })
  it('объём за 7 и 30 дней: окно включает сегодня и не включает дальше', () => {
    expect(muscleVolume(ses, TODAY, 7)).toEqual({ days: 1, sets: 3, reps: 23 })
    expect(muscleVolume(ses, TODAY, 30)).toEqual({ days: 2, sets: 5, reps: 35 })
    expect(muscleVolume(ses, TODAY, 1)).toEqual({ days: 0, sets: 0, reps: 0 })
  })
})

describe('weeklyLoad', () => {
  const ses = (date: string, sets: number, reps = 0) => ({ date, exercises: ['Жим лёжа'], sets, reps })
  it('8 окон по 7 дней от старого к новому; последнее заканчивается сегодня', () => {
    const w = weeklyLoad([], TODAY)
    expect(w).toHaveLength(LOAD_WEEKS)
    expect(w[LOAD_WEEKS - 1].to).toBe(TODAY)
    expect(w[LOAD_WEEKS - 1].from).toBe('2026-09-24')
    expect(w[LOAD_WEEKS - 2].to).toBe('2026-09-23')
    // окна идут встык, без дыр и перекрытий
    for (let i = 1; i < w.length; i++) {
      const prevTo = new Date(w[i - 1].to + 'T00:00:00Z').getTime()
      const from = new Date(w[i].from + 'T00:00:00Z').getTime()
      expect(from - prevTo).toBe(86400000)
    }
    expect(w.every((x) => x.sets === 0 && x.days === 0)).toBe(true)
  })
  it('подходы, повторы и дни попадают в своё окно; границы включительные', () => {
    const w = weeklyLoad([ses(TODAY, 3, 24), ses('2026-09-24', 2, 10), ses('2026-09-23', 4, 32), ses('2026-09-10', 5, 40)], TODAY)
    expect(w[7]).toMatchObject({ days: 2, sets: 5, reps: 34 }) // 24.09 … 30.09
    expect(w[6]).toMatchObject({ days: 1, sets: 4, reps: 32 }) // 17.09 … 23.09
    expect(w[5]).toMatchObject({ from: '2026-09-10', to: '2026-09-16', days: 1, sets: 5, reps: 40 }) // граница окна включительна: 10.09 — первый день
    expect(w[4].sets).toBe(0)
  })
  it('запись старше восьми недель и из будущего в график не попадает', () => {
    const w = weeklyLoad([ses('2026-07-01', 9), ses('2026-10-05', 9)], TODAY)
    expect(w.reduce((n, x) => n + x.sets, 0)).toBe(0)
  })
})
