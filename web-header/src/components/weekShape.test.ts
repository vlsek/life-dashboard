import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DayWeekBadge from './DayWeekBadge.vue'
import ProgressGauge from './ProgressGauge.vue'
import type { WeekDaySegment } from '../lib/progress'

const seg = (date: string, state: WeekDaySegment['state'], fill: number, pct: number): WeekDaySegment => ({ date, state, done: 0, total: 0, fill, bonus: 0, pct })
const days: WeekDaySegment[] = [
  seg('2026-10-05', 'past', 1, 100), seg('2026-10-06', 'past', 0.6, 60), seg('2026-10-07', 'today', 0.2, 20),
  seg('2026-10-08', 'future', 0, 0), seg('2026-10-09', 'future', 0, 0), seg('2026-10-10', 'future', 0, 0), seg('2026-10-11', 'future', 0, 0),
]
const base = { basePct: 0.5, bonusPct: 0, totalPct: 50, title: 'Неделя: 50%' }

describe('вид недели', () => {
  it('бейдж: семиугольник по умолчанию — 7 сторон, залиты только дни с прогрессом, aria с днями', () => {
    const w = mount(DayWeekBadge, { props: { kind: 'week', ...base, days } })
    expect(w.find('[data-test="week-heptagon"]').exists()).toBe(true)
    expect(w.find('[data-test="week-track"]').element.tagName.toLowerCase()).toBe('polygon') // цельный контур, не отрезки (45.3)
    expect(w.findAll('g[data-day]')).toHaveLength(7)
    expect(w.findAll('[data-test="week-seg-fill"]')).toHaveLength(3)
    expect(w.findAll('[data-test="week-seg-today"]')).toHaveLength(1) // сегодняшняя грань светлее
    expect(w.findAll('[data-state="future"]')).toHaveLength(4)
    expect(w.find('button').attributes('aria-label')).toMatch(/100 %, \w+ 60 %, \w+ 20 %, \w+, \w+, \w+, \w+$/)
  })
  it('бейдж: «прежний» вид, день и нет данных по дням — как раньше (квадрат/круг)', () => {
    expect(mount(DayWeekBadge, { props: { kind: 'week', ...base, days, shape: 'classic' } }).find('rect').exists()).toBe(true)
    expect(mount(DayWeekBadge, { props: { kind: 'week', ...base, days: null } }).find('rect').exists()).toBe(true)
    expect(mount(DayWeekBadge, { props: { kind: 'day', ...base, days } }).find('circle').exists()).toBe(true)
  })
  it('спидометр: семиугольник вместо дуги, у дня и у «прежнего» вида дуга', () => {
    const p = { ...base, label: 'Неделя', detail: '1/2' }
    expect(mount(ProgressGauge, { props: { kind: 'week', ...p, days } }).find('[data-test="week-heptagon"]').exists()).toBe(true)
    expect(mount(ProgressGauge, { props: { kind: 'week', ...p, days, shape: 'classic' } }).find('circle').exists()).toBe(true)
    expect(mount(ProgressGauge, { props: { kind: 'day', ...p, days } }).find('[data-test="week-heptagon"]').exists()).toBe(false)
  })
})
