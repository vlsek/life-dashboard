import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DayWeekBadge from './components/DayWeekBadge.vue'
import ProgressGauge from './components/ProgressGauge.vue'
import WeekAlt from './components/WeekAlt.vue'
import { WEEK_GAUGE_CACHE_KEY, parseWeekGauge, readCachedWeekGauge, writeCachedWeekGauge } from './lib/weekGauge'
import type { WeekDaySegment } from './lib/progress'

// BACKLOG 59.3: ещё два вида спидометра недели — «Семь точек» (week_dots) и «Ступеньки» (week_steps).
const days: WeekDaySegment[] = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-0${i + 1}`, state: i < 4 ? 'past' : i === 4 ? 'today' : 'future', done: 1, total: 2, fill: [1, 0.7, 0.9, 0.5, 0.25, 0, 0][i], bonus: i === 0 ? 0.3 : 0 }) as WeekDaySegment)
const props = { kind: 'week' as const, basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'w' }
beforeEach(() => localStorage.clear())

describe('разбор и кэш', () => {
  it('week_wave → wave; кэш помнит', () => {
    expect(parseWeekGauge('week_wave')).toBe('wave')
    writeCachedWeekGauge('wave')
    expect(readCachedWeekGauge()).toBe('wave')
  })
  it('week_teeth → teeth; кэш помнит', () => {
    expect(parseWeekGauge('week_teeth')).toBe('teeth')
    writeCachedWeekGauge('teeth')
    expect(readCachedWeekGauge()).toBe('teeth')
  })
  it('week_dots → dots, week_steps → steps; кэш помнит оба', () => {
    expect(parseWeekGauge('week_dots')).toBe('dots')
    expect(parseWeekGauge('week_steps')).toBe('steps')
    writeCachedWeekGauge('dots')
    expect(localStorage.getItem(WEEK_GAUGE_CACHE_KEY)).toBe('dots')
    expect(readCachedWeekGauge()).toBe('dots')
    writeCachedWeekGauge('steps')
    expect(readCachedWeekGauge()).toBe('steps')
  })
})

describe('WeekAlt', () => {
  it('точки: семь, заливка по дню, сегодняшняя обведена, у пустых дней заливки нет', () => {
    const w = mount(WeekAlt, { props: { days, size: 104, variant: 'dots' } })
    expect(w.findAll('[data-test="week-dot"]')).toHaveLength(7)
    expect(w.findAll('[data-test="week-dot-fill"]')).toHaveLength(5)
    expect(w.findAll('[data-test="week-dot-today"]')).toHaveLength(1)
    expect(w.findAll('[data-test="week-dot-bonus"]')).toHaveLength(1)
    // радиусы заливки разные: прогресс дня 1 крупнее, чем 0.25 (асимметричные данные)
    const r = w.findAll('[data-test="week-dot-fill"]').map((e) => Number(e.attributes('r')))
    expect(r[0]).toBeGreaterThan(r[4])
  })
  it('ступеньки: семь столбиков растущей высоты, заливка по дню', () => {
    const w = mount(WeekAlt, { props: { days, size: 104, variant: 'steps' } })
    const tracks = w.findAll('[data-test="week-step"] rect:first-child').map((e) => Number(e.attributes('height')))
    expect(tracks).toHaveLength(7)
    for (let i = 1; i < 7; i++) expect(tracks[i]).toBeGreaterThan(tracks[i - 1])
    const fills = w.findAll('[data-test="week-step-fill"]').map((e) => Number(e.attributes('height')))
    expect(fills).toHaveLength(5)
    expect(w.findAll('[data-test="week-step-today"]')).toHaveLength(1)
  })
  it('зубцы: высокий и низкий через один, заливка по дню', () => {
    const w = mount(WeekAlt, { props: { days, size: 104, variant: 'teeth' } })
    const tracks = w.findAll('[data-test="week-step"] rect:first-child').map((e) => Number(e.attributes('height')))
    expect(tracks).toHaveLength(7)
    for (let i = 0; i < 7; i += 2) expect(tracks[i]).toBeGreaterThan(tracks[i + 1] ?? 0)
    expect(tracks[1]).toBeLessThan(tracks[0])
    expect(tracks[2]).toBeCloseTo(tracks[0], 5)
    expect(w.findAll('[data-test="week-step-fill"]')).toHaveLength(5)
  })
  it('на мелком значке (< 44 px) бонус не рисуется', () => {
    expect(mount(WeekAlt, { props: { days, size: 32, variant: 'dots' } }).find('[data-test="week-dot-bonus"]').exists()).toBe(false)
  })
})

describe('бейдж и панель шапки рисуют новые виды', () => {
  for (const shape of ['dots', 'steps', 'wave', 'teeth'] as const) {
    it(`DayWeekBadge: ${shape}`, () => {
      const w = mount(DayWeekBadge, { props: { ...props, shape, days } })
      expect(w.find(`[data-test="week-${shape}"]`).exists()).toBe(true)
      expect(w.find('[data-shape="heptagon"]').exists()).toBe(false)
    })
    it(`ProgressGauge: ${shape}`, () => {
      const w = mount(ProgressGauge, { props: { ...props, shape, days, label: 'Неделя', detail: 'x' } })
      expect(w.find(`[data-test="week-${shape}"]`).exists()).toBe(true)
    })
  }
})
