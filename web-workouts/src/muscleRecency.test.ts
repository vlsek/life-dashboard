import { describe, expect, it } from 'vitest'
import { MUSCLE_IDS, musclesForExercise } from './lib/muscles'
import { RECENT_DAYS, isTrainedRecently, lastTrainedByMuscle, recentMuscles } from '../../shared/body-picker/muscleRecency'
import * as stats from './lib/muscleStats'

// BACKLOG 762 срез 2, вариант Б: «зелёные» мышцы для подбора по схеме тела живут в общем модуле shared/body-picker
const EX = [{ id: 'e1', name: 'Жим лёжа' }]
const TODAY = '2026-10-14'
const entry = (date: string, sets: unknown[] = [{}]) => ({ exercise_id: 'e1', date, sets })
const BENCH = MUSCLE_IDS.filter((m) => musclesForExercise('Жим лёжа').includes(m))

describe('muscleRecency (shared/body-picker)', () => {
  it('у «Жима лёжа» есть мышцы — иначе тест ниже ничего не проверяет', () => {
    expect(BENCH.length).toBeGreaterThan(0)
  })
  it('сегодня и три дня назад — недавно, четыре дня назад — уже нет (окно включает сегодня)', () => {
    expect(RECENT_DAYS).toBe(4)
    expect(recentMuscles([entry(TODAY)], EX, TODAY)).toEqual(BENCH)
    expect(recentMuscles([entry('2026-10-11')], EX, TODAY)).toEqual(BENCH)
    expect(recentMuscles([entry('2026-10-10')], EX, TODAY)).toEqual([])
  })
  it('пустая запись без подходов и дата из будущего тренировкой не считаются', () => {
    expect(recentMuscles([entry(TODAY, [])], EX, TODAY)).toEqual([])
    expect(recentMuscles([entry('2026-10-15')], EX, TODAY)).toEqual([])
  })
  it('берётся самая свежая дата, неизвестное упражнение игнорируется, порядок как в MUSCLE_IDS', () => {
    const last = lastTrainedByMuscle([entry('2026-10-01'), entry('2026-10-12'), { exercise_id: 'нет', date: TODAY, sets: [{}] }], EX, TODAY)
    for (const m of BENCH) expect(last[m]).toBe('2026-10-12')
    expect(recentMuscles([entry(TODAY)], EX, TODAY)).toEqual(MUSCLE_IDS.filter((m) => BENCH.includes(m)))
  })
  it('isTrainedRecently: без даты — false; граница окна на стыке месяцев', () => {
    expect(isTrainedRecently(undefined, TODAY)).toBe(false)
    expect(isTrainedRecently('2026-09-30', '2026-10-03')).toBe(true)
    expect(isTrainedRecently('2026-09-29', '2026-10-03')).toBe(false)
  })
  it('muscleStats по-прежнему отдаёт те же функции (реэкспорт из общего модуля)', () => {
    expect(stats.lastTrainedByMuscle).toBe(lastTrainedByMuscle)
    expect(stats.isTrainedRecently).toBe(isTrainedRecently)
    expect(stats.RECENT_DAYS).toBe(RECENT_DAYS)
  })
})
