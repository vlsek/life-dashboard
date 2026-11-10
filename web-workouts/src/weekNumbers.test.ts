import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { delta, hasAnyTraining, periodTotals, weekCompare, weeklyVolumes } from './lib/weekNumbers'
import WeekNumbers from './components/WeekNumbers.vue'
import type { Exercise, WorkoutEntry } from './lib/types'

// BACKLOG 69.14, срез 1: «Неделя в цифрах»
const TODAY = '2026-10-30' // пятница; неделя пн 26.10 – вс 01.11, прошлая 19.10–25.10
const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: 'кг', suggested_scheme: null, created_at: '2026-01-01' })
const exs = [ex('e1', 'Жим лёжа'), ex('e2', 'Приседания')]
const en = (id: string, exercise_id: string, date: string, sets: { reps: number; weight: number; type?: string }[]): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id, date, sets: sets.map((s) => ({ ...s, time: '18:00' })), notes: null, session_id: null }) as WorkoutEntry

describe('periodTotals', () => {
  it('дни, рабочие подходы и объём; разминка и пустые записи не считаются', () => {
    const e = [
      en('1', 'e1', '2026-10-26', [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 10, weight: 20, type: 'warmup' }]),
      en('2', 'e2', '2026-10-28', [{ reps: 5, weight: 100 }]),
      en('3', 'e1', '2026-10-28', []),
    ]
    expect(periodTotals(e, exs, '2026-10-26', '2026-11-01')).toEqual({ days: 2, sets: 3, volume: 60 * 8 * 2 + 500 })
  })
  it('границы включительно; чужие даты и удалённые упражнения не попадают', () => {
    const e = [en('1', 'e1', '2026-10-26', [{ reps: 1, weight: 10 }]), en('2', 'e1', '2026-11-01', [{ reps: 1, weight: 10 }]), en('3', 'e1', '2026-11-02', [{ reps: 1, weight: 10 }]), en('4', 'gone', '2026-10-27', [{ reps: 1, weight: 10 }])]
    expect(periodTotals(e, exs, '2026-10-26', '2026-11-01')).toMatchObject({ days: 2, sets: 2 })
  })
})

describe('weekCompare и delta', () => {
  it('текущая и прошлая недели по календарю пн–вс', () => {
    const e = [en('1', 'e1', '2026-10-27', [{ reps: 8, weight: 50 }]), en('2', 'e1', '2026-10-20', [{ reps: 8, weight: 40 }, { reps: 8, weight: 40 }]), en('3', 'e1', '2026-10-12', [{ reps: 1, weight: 1 }])]
    const c = weekCompare(e, exs, TODAY)
    expect([c.from, c.to]).toEqual(['2026-10-26', '2026-11-01'])
    expect(c.current).toMatchObject({ days: 1, sets: 1, volume: 400 })
    expect(c.previous).toMatchObject({ days: 1, sets: 2, volume: 640 })
  })
  it('delta: больше / меньше / так же / новое; процент считается от прошлого', () => {
    expect(delta(6, 4)).toEqual({ kind: 'up', diff: 2, pct: 50 })
    expect(delta(3, 4)).toEqual({ kind: 'down', diff: -1, pct: -25 })
    expect(delta(4, 4)).toEqual({ kind: 'same', diff: 0, pct: 0 })
    expect(delta(5, 0)).toEqual({ kind: 'new', diff: 5, pct: null })
    expect(delta(0, 0).kind).toBe('same')
  })
})

describe('weeklyVolumes', () => {
  it('8 недель от старой к новой, последняя — текущая; пустые недели — 0', () => {
    const e = [en('1', 'e1', '2026-10-27', [{ reps: 10, weight: 10 }]), en('2', 'e1', '2026-09-10', [{ reps: 10, weight: 20 }])]
    const w = weeklyVolumes(e, exs, TODAY)
    expect(w).toHaveLength(8)
    expect(w[7]).toMatchObject({ monday: '2026-10-26', volume: 100, current: true })
    expect(w.filter((x) => x.current)).toHaveLength(1)
    expect(w[0].monday < w[7].monday).toBe(true)
    expect(w.find((x) => x.monday === '2026-09-07')?.volume).toBe(200)
    expect(w[6].volume).toBe(0)
  })
  it('hasAnyTraining: только в окне восьми недель', () => {
    expect(hasAnyTraining([], exs, TODAY)).toBe(false)
    expect(hasAnyTraining([en('1', 'e1', '2026-10-27', [{ reps: 1, weight: 1 }])], exs, TODAY)).toBe(true)
    expect(hasAnyTraining([en('1', 'e1', '2026-03-01', [{ reps: 1, weight: 1 }])], exs, TODAY)).toBe(false)
  })
})

describe('WeekNumbers', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  const mk = (e: WorkoutEntry[]) => mount(WeekNumbers, { props: { entries: e, exercises: exs, today: TODAY } })
  const e = [
    en('1', 'e1', '2026-10-27', [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }]),
    en('2', 'e2', '2026-10-29', [{ reps: 5, weight: 100 }]),
    en('3', 'e1', '2026-10-20', [{ reps: 8, weight: 60 }]),
  ]
  it('три показателя недели и разница к прошлой', () => {
    const w = mk(e)
    const tile = (k: string) => w.get(`[data-testid="wk-tile-${k}"]`)
    expect(tile('days').get('[data-testid="wk-value"]').text()).toBe('2')
    expect(tile('sets').get('[data-testid="wk-value"]').text()).toBe('3')
    expect(tile('volume').get('[data-testid="wk-value"]').text()).toMatch(/1\s460/)
    expect(tile('days').get('[data-testid="wk-delta"]').text()).toContain('+1')
    expect(tile('sets').get('[data-testid="wk-delta"]').text()).toContain('+2')
    expect(tile('sets').get('[data-testid="wk-delta"]').text()).toContain('200 %')
  })
  it('8 столбиков, текущий выделен, высота по объёму', () => {
    const bars = mk(e).findAll('[data-testid="wk-bar"]')
    expect(bars).toHaveLength(8)
    expect(bars.filter((b) => b.attributes('data-current') === '1')).toHaveLength(1)
    expect(bars[7].attributes('style')).toContain('height: 100%') // текущая неделя — максимум
  })
  it('нет тренировок за 8 недель — блока нет', () => {
    expect(mk([]).find('[data-testid="week-numbers"]').exists()).toBe(false)
  })
})
