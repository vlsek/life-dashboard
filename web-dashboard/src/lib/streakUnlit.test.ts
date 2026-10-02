import { describe, expect, it } from 'vitest'
import { computeStreakItemsPure } from './streaks'
import type { Metric } from './types'

const m = (id: string, over: Partial<Metric> = {}): Metric =>
  ({ id, name: id, icon: null, type: 'boolean', goal_value: null, goal_direction: 'at_least', unit: '', options: [], position: 0, active: true, schedule: null, ...over }) as Metric

// BACKLOG 22.1 «пунктир огонька пропал»: серия идёт, а сегодня ещё не засчитано — todayCounted ДОЛЖЕН быть false,
// иначе главный огонёк рисуется сплошным вместо пунктирного.
describe('todayCounted stays false while the streak is only alive from yesterday', () => {
  const today = new Date(2026, 9, 2)
  const ymd = (back: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - back)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  it('perfect days: two full days behind, today not done', () => {
    const metrics = [m('a'), m('b')]
    const byDay = { [ymd(1)]: { a: true, b: true }, [ymd(2)]: { a: true, b: true }, [ymd(0)]: { a: true } }
    const items = computeStreakItemsPure(metrics, byDay, new Set(), today)
    const perfect = items.find((i) => i.kind === 'perfect_days')!
    expect(perfect.streak).toBe(2)
    expect(perfect.todayCounted).toBe(false)
  })

  it('per-metric: done yesterday, not today', () => {
    const metrics = [m('a')]
    const byDay = { [ymd(1)]: { a: true }, [ymd(2)]: { a: true } }
    const items = computeStreakItemsPure(metrics, byDay, new Set(), today)
    const one = items.find((i) => i.kind === 'metric')!
    expect(one.streak).toBe(2)
    expect(one.todayCounted).toBe(false)
  })

  it('the top item (what the profile flame shows) is not counted for today either', () => {
    const metrics = [m('a'), m('b', { count_streak: false })]
    const byDay = { [ymd(1)]: { a: true, b: true }, [ymd(2)]: { a: true, b: true } }
    const items = computeStreakItemsPure(metrics, byDay, new Set(), today)
    expect(items[0].todayCounted).toBe(false)
  })

  it('regression: one metric done today must NOT drop the streaks of the metrics not done yet (they stay as dashed/unlit)', () => {
    const metrics = [m('a'), m('b'), m('c')]
    const byDay = {
      [ymd(2)]: { a: true, b: true, c: true },
      [ymd(1)]: { a: true, b: true, c: true },
      [ymd(0)]: { a: true }, // сегодня сделана только одна метрика
    }
    const items = computeStreakItemsPure(metrics, byDay, new Set(), today)
    const byMetric = Object.fromEntries(items.filter((i) => i.kind === 'metric').map((i) => [i.metric!.id, i]))
    expect(byMetric.a).toMatchObject({ streak: 3, todayCounted: true })
    expect(byMetric.b).toMatchObject({ streak: 2, todayCounted: false })
    expect(byMetric.c).toMatchObject({ streak: 2, todayCounted: false })
    expect(items.find((i) => i.kind === 'perfect_days')).toMatchObject({ streak: 2, todayCounted: false })
  })

  it('a fully done today extends the perfect-days streak and counts it', () => {
    const metrics = [m('a'), m('b')]
    const byDay = { [ymd(1)]: { a: true, b: true }, [ymd(0)]: { a: true, b: true } }
    expect(computeStreakItemsPure(metrics, byDay, new Set(), today).find((i) => i.kind === 'perfect_days')).toMatchObject({ streak: 2, todayCounted: true })
  })

  it('a missed yesterday still breaks the streak (the fix does not make streaks immortal)', () => {
    const metrics = [m('a')]
    const byDay = { [ymd(2)]: { a: true }, [ymd(0)]: { a: false } }
    expect(computeStreakItemsPure(metrics, byDay, new Set(), today).find((i) => i.kind === 'metric')).toBeUndefined()
  })
})
