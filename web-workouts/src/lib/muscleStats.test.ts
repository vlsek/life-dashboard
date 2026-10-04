import { describe, expect, it } from 'vitest'
import { daysAgo, isTrainedRecently, lastTrainedByMuscle, lastTrainedRows, trainingDaysByMuscle, unmappedExercises } from './muscleStats'

const ex = [
  { id: 'bench', name: 'Жим лёжа' },
  { id: 'squat', name: 'Приседания' },
  { id: 'yoga', name: 'Йога' },
]
const set = [{ reps: 10, weight: 50, time: null, duration: null, side: null }]
const en = (exercise_id: string, date: string, sets = set) => ({ exercise_id, date, sets })
const TODAY = '2026-09-30'

describe('isTrainedRecently — окно 4 дня включает сегодня', () => {
  it('граница: сегодня и 3 дня назад — да, 4 дня назад — нет', () => {
    expect(isTrainedRecently('2026-09-30', TODAY)).toBe(true)
    expect(isTrainedRecently('2026-09-27', TODAY)).toBe(true)
    expect(isTrainedRecently('2026-09-26', TODAY)).toBe(false)
  })
  it('нет даты или дата из будущего — нет', () => {
    expect(isTrainedRecently(undefined, TODAY)).toBe(false)
    expect(isTrainedRecently('2026-10-01', TODAY)).toBe(false)
  })
  it('корректно переходит через границу месяца/года', () => {
    expect(isTrainedRecently('2025-12-30', '2026-01-02')).toBe(true)
    expect(isTrainedRecently('2025-12-29', '2026-01-02')).toBe(false)
  })
})

describe('lastTrainedByMuscle', () => {
  it('берёт самую позднюю дату по каждой мышце упражнения', () => {
    const last = lastTrainedByMuscle([en('bench', '2026-09-20'), en('bench', '2026-09-28')], ex, TODAY)
    expect(last.chest).toBe('2026-09-28')
    expect(last.triceps).toBe('2026-09-28')
    expect(last.quads).toBeUndefined()
  })
  it('запись без подходов и запись из будущего не считаются', () => {
    const last = lastTrainedByMuscle([en('squat', '2026-09-29', []), en('squat', '2026-10-05')], ex, TODAY)
    expect(last.quads).toBeUndefined()
  })
  it('запись неизвестного упражнения безопасна', () => {
    expect(lastTrainedByMuscle([en('yoga', '2026-09-29'), en('ghost', '2026-09-29')], ex, TODAY)).toEqual({})
  })
})

describe('trainingDaysByMuscle', () => {
  const entries = [en('bench', '2026-09-28'), en('bench', '2026-09-28'), en('bench', '2026-09-25'), en('squat', '2026-09-29'), en('bench', '2026-08-01')]
  it('считает разные дни, а не записи; сортирует по убыванию; старше окна не берёт', () => {
    const res = trainingDaysByMuscle(entries, ex, TODAY, '2026-09-01')
    const chest = res.find((r) => r.muscle === 'chest')
    expect(chest?.days).toBe(2) // 28 и 25 сентября; 1 августа вне окна
    expect(res[0].days).toBeGreaterThanOrEqual(res[res.length - 1].days)
    expect(res.find((r) => r.muscle === 'quads')?.days).toBe(1)
  })
  it('пустая история — пустой список', () => {
    expect(trainingDaysByMuscle([], ex, TODAY, '2026-09-01')).toEqual([])
  })
})

describe('unmappedExercises', () => {
  it('возвращает упражнения без привязки к мышцам', () => {
    expect(unmappedExercises(ex).map((e) => e.id)).toEqual(['yoga'])
  })
})

import { DEFAULT_STATS_PERIOD, STATS_PERIODS, isStatsPeriod, periodStart, untrainedMuscles } from './muscleStats'
import { MUSCLE_IDS } from './muscles'

describe('период статистики', () => {
  it('периоды 7/30/90, по умолчанию 30; isStatsPeriod принимает только их', () => {
    expect([...STATS_PERIODS]).toEqual([7, 30, 90])
    expect(DEFAULT_STATS_PERIOD).toBe(30)
    expect(isStatsPeriod(7)).toBe(true)
    expect(isStatsPeriod(45)).toBe(false)
    expect(isStatsPeriod('30')).toBe(false)
    expect(isStatsPeriod(NaN)).toBe(false)
  })
  it('periodStart: окно из N дней включает сегодня', () => {
    expect(periodStart('2026-09-30', 7)).toBe('2026-09-24')
    expect(periodStart('2026-09-30', 1)).toBe('2026-09-30')
    expect(periodStart('2026-03-01', 30)).toBe('2026-01-31')
  })
})

describe('untrainedMuscles', () => {
  it('возвращает группы, которых нет в статистике, в порядке справочника', () => {
    const rest = untrainedMuscles([{ muscle: 'chest' }, { muscle: 'abs' }], MUSCLE_IDS)
    expect(rest).not.toContain('chest')
    expect(rest).not.toContain('abs')
    expect(rest).toHaveLength(MUSCLE_IDS.length - 2)
    expect(rest[0]).toBe(MUSCLE_IDS.find((m) => m !== 'chest' && m !== 'abs'))
  })
  it('пустая статистика — все группы; всё потренировано — пусто', () => {
    expect(untrainedMuscles([], MUSCLE_IDS)).toEqual([...MUSCLE_IDS])
    expect(untrainedMuscles(MUSCLE_IDS.map((muscle) => ({ muscle })), MUSCLE_IDS)).toEqual([])
  })
})

describe('daysAgo — сколько дней назад тренировали (раздел 30)', () => {
  it('сегодня — 0, вчера — 1, неделю назад — 7', () => {
    expect(daysAgo('2026-09-30', TODAY)).toBe(0)
    expect(daysAgo('2026-09-29', TODAY)).toBe(1)
    expect(daysAgo('2026-09-23', TODAY)).toBe(7)
  })
  it('через границу месяца и года', () => {
    expect(daysAgo('2026-08-31', TODAY)).toBe(30)
    expect(daysAgo('2025-12-31', '2026-01-02')).toBe(2)
  })
  it('нет даты, дата из будущего или мусор — null', () => {
    expect(daysAgo(undefined, TODAY)).toBeNull()
    expect(daysAgo('2026-10-05', TODAY)).toBeNull()
    expect(daysAgo('не дата', TODAY)).toBeNull()
  })
})

describe('lastTrainedRows — строка по каждой мышце', () => {
  const rows = lastTrainedRows([en('bench', '2026-09-29'), en('squat', '2026-09-20'), en('bench', '2026-09-10')], ex, TODAY, MUSCLE_IDS)
  const row = (m: string) => rows.find((r) => r.muscle === m)!
  it('есть строка для КАЖДОЙ мышцы, без повторов', () => {
    expect(rows.map((r) => r.muscle).sort()).toEqual([...MUSCLE_IDS].sort())
  })
  it('у тренированных — последняя дата и «дней назад» (берётся самая свежая запись)', () => {
    expect(row('chest')).toMatchObject({ last: '2026-09-29', ago: 1 })
    expect(row('quads')).toMatchObject({ last: '2026-09-20', ago: 10 })
  })
  it('у нетренированных — null', () => {
    expect(row('calves')).toMatchObject({ last: null, ago: null })
  })
  it('порядок: сначала «ещё не тренировали», затем давно не тренированные, свежие внизу', () => {
    const idx = (m: string) => rows.findIndex((r) => r.muscle === m)
    expect(idx('calves')).toBeLessThan(idx('quads'))
    expect(idx('quads')).toBeLessThan(idx('chest'))
    expect(rows[rows.length - 1].ago).toBe(1)
  })
  it('без записей все мышцы «ещё не тренировали», порядок как в справочнике', () => {
    const empty = lastTrainedRows([], ex, TODAY, MUSCLE_IDS)
    expect(empty.every((r) => r.last === null && r.ago === null)).toBe(true)
    expect(empty.map((r) => r.muscle)).toEqual([...MUSCLE_IDS])
  })
  it('пустая запись (без подходов) и запись из будущего не считаются', () => {
    const r = lastTrainedRows([en('bench', '2026-09-29', []), en('bench', '2026-10-05')], ex, TODAY, MUSCLE_IDS)
    expect(r.find((x) => x.muscle === 'chest')).toMatchObject({ last: null, ago: null })
  })
})
