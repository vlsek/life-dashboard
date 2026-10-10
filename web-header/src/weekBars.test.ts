import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const db = { customization: {} as Record<string, unknown> | null, error: null as null | { message: string } }
vi.mock('./lib/supabase', () => ({
  sb: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.error ? null : { customization: db.customization }, error: db.error }) }) }) }) },
}))

import DayWeekBadge from './components/DayWeekBadge.vue'
import ProgressGauge from './components/ProgressGauge.vue'
import WeekBars from './components/WeekBars.vue'
import { syncWeekGauge, weekGaugeStyle } from './lib/useWeekGauge'
import { WEEK_GAUGE_CACHE_KEY, parseWeekGauge } from './lib/weekGauge'
import type { WeekDaySegment } from './lib/progress'

// BACKLOG 53.2: вид спидометра недели выбирается в «Кастомизации»: семиугольник (по умолчанию), классическое кольцо, семь столбиков.
const days: WeekDaySegment[] = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-0${i + 1}`, state: i < 4 ? 'past' : i === 4 ? 'today' : 'future', done: 1, total: 2, fill: i < 4 ? 0.5 : 0, bonus: i === 1 ? 0.3 : 0, pct: 50 }))
const props = { kind: 'week' as const, basePct: 0.4, bonusPct: 0, totalPct: 40, title: 'w' }

beforeEach(() => {
  localStorage.clear()
  db.customization = {}
  db.error = null
  weekGaugeStyle.value = 'heptagon'
})

describe('разбор выбора', () => {
  it('ключи предметов → виды; всё прочее — семиугольник', () => {
    expect(parseWeekGauge('week_classic')).toBe('classic')
    expect(parseWeekGauge('week_bars')).toBe('bars')
    expect(parseWeekGauge(undefined)).toBe('heptagon')
    expect(parseWeekGauge('мусор')).toBe('heptagon')
  })
})

describe('вид недели в значках шапки', () => {
  it('heptagon (по умолчанию) — семиугольник, bars — столбики, classic — прежний квадрат', () => {
    expect(mount(DayWeekBadge, { props: { ...props, shape: 'heptagon', days } }).find('[data-test="week-heptagon"]').exists()).toBe(true)
    expect(mount(DayWeekBadge, { props: { ...props, days } }).find('[data-test="week-heptagon"]').exists()).toBe(true)
    const bars = mount(DayWeekBadge, { props: { ...props, shape: 'bars', days } })
    expect(bars.find('[data-test="week-bars"]').exists()).toBe(true)
    expect(bars.find('[data-test="week-heptagon"]').exists()).toBe(false)
    const classic = mount(DayWeekBadge, { props: { ...props, shape: 'classic', days } })
    expect(classic.find('rect').exists()).toBe(true)
    expect(classic.find('[data-test="week-bars"]').exists()).toBe(false)
  })
  it('в большом спидометре правой панели то же самое', () => {
    const g = { ...props, label: 'Неделя', detail: '' }
    expect(mount(ProgressGauge, { props: { ...g, shape: 'bars', days } }).find('[data-test="week-bars"]').exists()).toBe(true)
    expect(mount(ProgressGauge, { props: { ...g, shape: 'classic', days } }).find('[data-test="week-bars"]').exists()).toBe(false)
    expect(mount(ProgressGauge, { props: { ...g, shape: 'bars', days: null } }).find('[data-test="week-bars"]').exists()).toBe(false) // нет данных по дням — кольцо
  })
  it('столбики: семь, заливка по дню, сегодняшний обведён, бонус — только на крупном размере', () => {
    const w = mount(WeekBars, { props: { days, size: 104, stroke: 10 } })
    expect(w.findAll('[data-test="week-bar"]')).toHaveLength(7)
    expect(w.findAll('[data-test="week-bar-fill"]')).toHaveLength(4)
    expect(w.findAll('[data-test="week-bar-today"]')).toHaveLength(1)
    expect(w.findAll('[data-test="week-bar-bonus"]')).toHaveLength(1)
    expect(mount(WeekBars, { props: { days, size: 32, stroke: 3 } }).findAll('[data-test="week-bar-bonus"]')).toHaveLength(0)
  })
})

describe('syncWeekGauge', () => {
  it('берёт выбор из профиля, пишет кэш и меняет реактивный вид', async () => {
    db.customization = { week_gauge: 'week_bars' }
    await syncWeekGauge('u')
    expect(weekGaugeStyle.value).toBe('bars')
    expect(localStorage.getItem(WEEK_GAUGE_CACHE_KEY)).toBe('bars')
    db.customization = {}
    await syncWeekGauge('u')
    expect(weekGaugeStyle.value).toBe('heptagon')
    expect(localStorage.getItem(WEEK_GAUGE_CACHE_KEY)).toBeNull()
  })
  it('ошибка чтения (нет колонки/сети) — остаётся прежнее', async () => {
    weekGaugeStyle.value = 'bars'
    db.error = { message: 'x' }
    await syncWeekGauge('u')
    expect(weekGaugeStyle.value).toBe('bars')
  })
})
