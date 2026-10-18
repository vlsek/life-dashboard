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
  it('week_valley → valley, week_slope → slope; кэш помнит; лишнее значение — семиугольник (59.4)', () => {
    expect(parseWeekGauge('week_valley')).toBe('valley')
    expect(parseWeekGauge('week_slope')).toBe('slope')
    writeCachedWeekGauge('valley')
    expect(readCachedWeekGauge()).toBe('valley')
    writeCachedWeekGauge('slope')
    expect(readCachedWeekGauge()).toBe('slope')
    expect(parseWeekGauge('week_nope')).toBe('heptagon')
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
  // 59.4: форма столбиков зависит от вида — «Волна» дугой, «Долина» перевёрнутой дугой, «Спуск» лесенкой вниз
  const trackHeights = (variant: 'steps' | 'wave' | 'teeth' | 'valley' | 'slope' | 'peak' | 'saw' | 'towers' | 'weekend') =>
    mount(WeekAlt, { props: { days, size: 104, variant } }).findAll('[data-test="week-step"] rect:first-child').map((e) => Number(e.attributes('height')))
  it('спуск: семь столбиков убывающей высоты (лесенка вниз к воскресенью)', () => {
    const h = trackHeights('slope')
    expect(h).toHaveLength(7)
    for (let i = 1; i < 7; i++) expect(h[i]).toBeLessThan(h[i - 1])
    expect(trackHeights('steps')[6]).toBeCloseTo(h[0], 5) // зеркало «Ступенек»
  })
  it('пик: вершина в четверг, края равны; пила: три подъёма подряд', () => {
    const p = trackHeights('peak')
    expect(p).toHaveLength(7)
    expect(Math.max(...p)).toBe(p[3])
    expect(p[0]).toBeCloseTo(p[6], 5)
    expect(p[1]).toBeGreaterThan(p[0])
    const s = trackHeights('saw')
    expect(s[0]).toBeLessThan(s[1])
    expect(s[1]).toBeLessThan(s[2])
    expect(s[3]).toBeLessThan(s[2])
    expect(s[5]).toBeCloseTo(s[2], 5)
    expect(parseWeekGauge('week_peak')).toBe('peak')
    expect(parseWeekGauge('week_saw')).toBe('saw')
    writeCachedWeekGauge('saw')
    expect(readCachedWeekGauge()).toBe('saw')
    writeCachedWeekGauge('heptagon')
  })
  it('башни: высокие вторник и пятница; выходные: суббота и воскресенье выше будней', () => {
    const t = trackHeights('towers')
    expect(t[1]).toBeGreaterThan(t[0])
    expect(t[4]).toBeCloseTo(t[1], 5)
    expect(t[2]).toBeCloseTo(t[0], 5)
    const w = trackHeights('weekend')
    expect(w[5]).toBeGreaterThan(w[4])
    expect(w[6]).toBeCloseTo(w[5], 5)
    expect(w[0]).toBeCloseTo(w[4], 5)
    expect(parseWeekGauge('week_towers')).toBe('towers')
    expect(parseWeekGauge('week_weekend')).toBe('weekend')
    writeCachedWeekGauge('weekend')
    expect(readCachedWeekGauge()).toBe('weekend')
    writeCachedWeekGauge('heptagon')
  })
  it('долина: выше по краям, ниже всего в середине; волна — наоборот; зубцы через один не изменились', () => {
    const v = trackHeights('valley')
    expect(v).toHaveLength(7)
    expect(v[0]).toBeGreaterThan(v[3])
    expect(v[6]).toBeGreaterThan(v[3])
    expect(Math.min(...v)).toBe(v[3])
    const w = trackHeights('wave')
    expect(w[3]).toBeGreaterThan(w[0])
    expect(Math.max(...w)).toBe(w[3])
    const te = trackHeights('teeth')
    expect(te[0]).toBeGreaterThan(te[1])
    expect(te[2]).toBeGreaterThan(te[1])
  })
  it('на мелком значке (< 44 px) бонус не рисуется', () => {
    expect(mount(WeekAlt, { props: { days, size: 32, variant: 'dots' } }).find('[data-test="week-dot-bonus"]').exists()).toBe(false)
  })
})

describe('бейдж и панель шапки рисуют новые виды', () => {
  for (const shape of ['dots', 'steps', 'wave', 'teeth', 'valley', 'slope', 'peak', 'saw', 'towers', 'weekend'] as const) {
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
