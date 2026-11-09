import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { MIN_REST_DAYS, restingMuscles, todayFocus } from './lib/todayFocus'
import { musclesForExercise } from './lib/muscles'
import StartFocus from './components/StartFocus.vue'
import type { Exercise, WorkoutEntry } from './lib/types'

// BACKLOG 69.17, срез 6: «Отдыхают: … · снова можно завтра» в карточке «Сегодня можно тренировать»
const TODAY = '2026-10-30'
const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: 'кг', suggested_scheme: null, created_at: '2026-01-01' })
const bench = ex('e1', 'Жим лёжа')
const squat = ex('e3', 'Приседания')
const row = ex('e2', 'Тяга штанги')
const en = (id: string, exercise_id: string, date: string, n = 3, warmup = false): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id, date, sets: Array.from({ length: n }, () => ({ reps: 8, weight: 60, time: '18:00', ...(warmup ? { type: 'warmup' } : {}) })), notes: null, session_id: null }) as WorkoutEntry

describe('restingMuscles', () => {
  it('тренировали вчера — готовы завтра; сегодня — послезавтра; два дня назад и раньше — не отдыхают', () => {
    const r = restingMuscles([en('1', 'e1', '2026-10-29'), en('2', 'e3', '2026-10-30'), en('3', 'e2', '2026-10-28')], [bench, squat, row], TODAY)
    const by = new Map(r.map((x) => [x.muscle, x.readyInDays]))
    expect(by.get('chest')).toBe(1)
    expect(by.get('quads')).toBe(2)
    const rowMuscles = musclesForExercise('Тяга штанги')
    expect(rowMuscles.length).toBeGreaterThan(0)
    for (const m of rowMuscles) expect(by.has(m)).toBe(false) // тяга два дня назад: уже отдохнули (граница ровно MIN_REST_DAYS)
    expect(r.map((x) => x.readyInDays)).toEqual([...r.map((x) => x.readyInDays)].sort((a, b) => a - b))
    expect(MIN_REST_DAYS).toBe(2)
  })
  it('то же правило, что в подборе групп: отдыхающая не предлагается, отдохнувшая предлагается', () => {
    const entries = [en('1', 'e1', '2026-10-29'), en('2', 'e3', '2026-10-26')]
    const focus = todayFocus(entries, [bench, squat], TODAY).map((f) => f.muscle)
    const resting = restingMuscles(entries, [bench, squat], TODAY).map((r) => r.muscle)
    expect(resting).toContain('chest')
    expect(focus).not.toContain('chest')
    expect(focus).toContain('quads')
    expect(resting).not.toContain('quads')
    for (const m of resting) expect(focus).not.toContain(m)
  })
  it('разминочные подходы и будущие записи не считаются; без упражнений на группу её нет', () => {
    expect(restingMuscles([en('1', 'e1', '2026-10-29', 3, true)], [bench], TODAY)).toEqual([])
    expect(restingMuscles([en('1', 'e1', '2026-11-05')], [bench], TODAY)).toEqual([])
    expect(restingMuscles([en('1', 'e3', '2026-10-29')], [bench], TODAY).map((r) => r.muscle)).not.toContain('quads')
    expect(restingMuscles([], [bench], TODAY)).toEqual([])
  })
})

describe('StartFocus: подпись об отдыхе', () => {
  const mk = (entries: WorkoutEntry[], exs: Exercise[]) => mount(StartFocus, { props: { entries, exercises: exs, today: TODAY } })
  it('есть, когда часть групп отдыхает: список и срок по самой скорой', () => {
    const w = mk([en('1', 'e1', '2026-10-29'), en('2', 'e3', '2026-10-26')], [bench, squat])
    const text = w.get('[data-testid="start-focus-resting"]').text()
    expect(text).toMatch(/Грудь|Chest/)
    expect(text).toMatch(/завтра|tomorrow/)
    expect(text).not.toMatch(/послезавтра|day after/)
  })
  it('если все отдыхающие ждут два дня — «послезавтра»', () => {
    const w = mk([en('1', 'e1', '2026-10-30'), en('2', 'e3', '2026-10-26')], [bench, squat])
    expect(w.get('[data-testid="start-focus-resting"]').text()).toMatch(/послезавтра|day after/)
  })
  it('нет отдыхающих — подписи нет; не больше четырёх групп в списке', () => {
    expect(mk([en('2', 'e3', '2026-10-26')], [bench, squat]).find('[data-testid="start-focus-resting"]').exists()).toBe(false)
    const many = mk([en('1', 'e1', '2026-10-29'), en('2', 'e2', '2026-10-29'), en('4', 'e4', '2026-10-29'), en('5', 'e5', '2026-10-29'), en('6', 'e3', '2026-10-26')], [bench, row, squat, ex('e4', 'Жим стоя'), ex('e5', 'Подъём на бицепс')])
    const parts = many.get('[data-testid="start-focus-resting"]').text().split('·')[0].split(',')
    expect(parts.length).toBeLessThanOrEqual(4)
  })
})
