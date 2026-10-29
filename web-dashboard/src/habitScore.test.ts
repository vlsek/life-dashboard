import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MetricStreakBadge from './components/MetricStreakBadge.vue'
import { HABIT_MIN_DAYS, computeHabitScores, habitScoreFor } from './lib/habitScore'
import { metricStreakMap } from './lib/metricStreaks'
import { addDaysIso } from './lib/date'
import type { Metric } from './lib/types'

// «Сила привычки» (BACKLOG 75.1): плавная оценка вместо бинарной серии.
function metric(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Зарядка', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}
const TODAY = new Date(2026, 9, 29) // четверг 2026-10-29
const TODAY_STR = '2026-10-29'
const day = (back: number) => addDaysIso(TODAY_STR, -back)
// byDay: для каждого из `back`-значений дней записано true/false
function history(m: Metric, flags: Record<number, boolean>): Record<string, Record<string, unknown>> {
  const out: Record<string, Record<string, unknown>> = {}
  for (const [back, v] of Object.entries(flags)) out[day(Number(back))] = { [m.id]: v }
  return out
}
const streakOf = (n: number, from = 1) => Object.fromEntries(Array.from({ length: n }, (_, i) => [from + i, true]))

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('habitScoreFor', () => {
  it('на коротком ряду (меньше 7 учтённых дней) оценку не показываем', () => {
    const m = metric()
    expect(HABIT_MIN_DAYS).toBe(7)
    expect(habitScoreFor(m, history(m, streakOf(6)), TODAY)).toBeNull()
    expect(habitScoreFor(m, history(m, streakOf(7)), TODAY)?.days).toBe(7)
  })

  it('нет ни одной записи по метрике — оценки нет (ничего не выдумываем)', () => {
    expect(habitScoreFor(metric(), { [day(1)]: { other: true } }, TODAY)).toBeNull()
    expect(habitScoreFor(metric(), {}, TODAY)).toBeNull()
  })

  it('чем дольше подряд, тем выше; 100 не достигается', () => {
    const m = metric()
    const a = habitScoreFor(m, history(m, streakOf(14)), TODAY)!.score
    const b = habitScoreFor(m, history(m, streakOf(60)), TODAY)!.score
    expect(a).toBeGreaterThan(40)
    expect(b).toBeGreaterThan(a)
    expect(b).toBeLessThan(100)
  })

  it('один пропуск после длинной серии оценку почти не роняет (серия бы обнулилась)', () => {
    const m = metric()
    const straight = habitScoreFor(m, history(m, streakOf(40)), TODAY)!.score // 40 дней подряд, включая вчера
    const missed = habitScoreFor(m, history(m, { ...streakOf(40, 2), 1: false }), TODAY)!.score // то же, но вчера пропуск
    expect(missed).toBeLessThan(straight) // пропуск оценку всё-таки понижает
    expect(missed).toBeGreaterThan(straight * 0.9 - 6) // но не обнуляет
    expect(missed).toBeGreaterThan(60)
  })

  it('возвращение после долгого перерыва поднимает оценку быстро', () => {
    const m = metric()
    const flags = { ...streakOf(20, 25), ...Object.fromEntries(Array.from({ length: 15 }, (_, i) => [10 + i, false])), ...streakOf(7, 1) }
    const r = habitScoreFor(m, history(m, flags), TODAY)!
    expect(r.score).toBeGreaterThan(30)
  })

  it('дни вне расписания не штрафуют: «пн и ср» выполняются — оценка высокая, остальные дни не считаются', () => {
    const m = metric({ schedule: { type: 'days', days: [1, 3] } })
    const flags: Record<number, boolean> = {}
    for (let back = 1; back <= 28; back++) {
      const dow = new Date(day(back) + 'T12:00:00').getDay()
      if (dow === 1 || dow === 3) flags[back] = true
    }
    const r = habitScoreFor(m, history(m, flags), TODAY)!
    expect(r.days).toBe(Object.keys(flags).length) // только ожидаемые дни
    const daily = metric({ id: 'd' })
    expect(r.score).toBe(habitScoreFor(daily, history(daily, streakOf(r.days)), TODAY)!.score) // как столько же дней подряд у ежедневной
  })

  it('сегодня не штрафует, пока не выполнено, но выполненное сегодня засчитывается', () => {
    const m = metric()
    const base = history(m, streakOf(20))
    const notYet = habitScoreFor(m, base, TODAY)!
    const doneToday = habitScoreFor(m, { ...base, [TODAY_STR]: { [m.id]: true } }, TODAY)!
    expect(notYet.days).toBe(20)
    expect(doneToday.days).toBe(21)
    expect(doneToday.score).toBeGreaterThan(notYet.score)
  })

  it('«N раз в неделю», «не больше N», число-лимит и выключенный «считать серию» в оценку не входят', () => {
    const base = streakOf(30)
    for (const m of [
      metric({ schedule: { type: 'weekly', min: 3 } }),
      metric({ schedule: { type: 'at_most', max: 2 } }),
      metric({ type: 'number', goal_value: 5, goal_direction: 'at_most' }),
      metric({ count_streak: false }),
    ]) {
      expect(habitScoreFor(m, history(m, m.type === 'number' ? Object.fromEntries(Object.keys(base).map((k) => [k, 1])) as never : base), TODAY)).toBeNull()
    }
  })

  it('computeHabitScores отдаёт только метрики с оценкой', () => {
    const a = metric({ id: 'a' })
    const b = metric({ id: 'b' })
    const byDay = { ...history(a, streakOf(10)) }
    expect(Object.keys(computeHabitScores([a, b], byDay, TODAY))).toEqual(['a'])
  })
})

describe('metricStreakMap с силой привычки', () => {
  const m = metric({ id: 'a' })
  it('без оценок работает как раньше', () => {
    expect(metricStreakMap([{ kind: 'metric', metric: m, streak: 3, todayCounted: true }])).toEqual({ a: { streak: 3, unit: undefined, todayCounted: true } })
  })
  it('оценка добавляется к серии; у метрики без серии появляется запись со streak 0', () => {
    const map = metricStreakMap([{ kind: 'metric', metric: m, streak: 3, todayCounted: true }], { a: { score: 70, days: 20 }, b: { score: 55, days: 9 } })
    expect(map.a).toMatchObject({ streak: 3, score: 70 })
    expect(map.b).toEqual({ streak: 0, todayCounted: true, score: 55 })
  })
})

describe('MetricStreakBadge: сила привычки', () => {
  it('серия и оценка рядом', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 5, todayCounted: true, score: 72 } } })
    expect(w.find('[data-test="metric-streak"]').exists()).toBe(true)
    expect(w.get('[data-test="habit-score"]').text()).toBe('72%')
  })
  it('без серии огонька нет, остаётся только оценка', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 0, todayCounted: true, score: 64 } } })
    expect(w.find('[data-test="metric-streak"]').exists()).toBe(false)
    expect(w.find('svg').exists()).toBe(false) // огонька нет
    expect(w.get('[data-test="habit-score"]').text()).toBe('64%')
  })
  it('без оценки — прежний значок серии', () => {
    const w = mount(MetricStreakBadge, { props: { info: { streak: 4, todayCounted: true } } })
    expect(w.find('[data-test="habit-score"]').exists()).toBe(false)
    expect(w.get('[data-test="metric-streak"]').text()).toContain('4')
  })
})
