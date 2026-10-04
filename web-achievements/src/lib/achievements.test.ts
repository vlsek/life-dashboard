import { describe, expect, it } from 'vitest'
import {
  ACHIEVEMENTS,
  BASELINE_KEY,
  GROUP_ORDER,
  bestPerfectStreak,
  computeCounters,
  evaluate,
  groupStates,
  isUnlocked,
  reconcile,
  type Counters,
} from './achievements'
import type { Metric } from './types'

function metric(over: Partial<Metric> & { id: string }): Metric {
  return {
    user_id: 'u',
    name: over.id,
    icon: null,
    type: 'boolean',
    unit: null,
    goal_value: null,
    goal_direction: null,
    schedule: null,
    category_id: null,
    position: 0,
    ...over,
  } as Metric
}

const ZERO: Counters = {
  streakBest: 0,
  pointsTotal: 0,
  metricDone: 0,
  weightEntries: 0,
  goalsDone: 0,
  skillsMastered: 0,
  booksDone: 0,
  workoutDays: 0,
  challengesDone: 0,
}

// 2026-10-05 — понедельник
const d = (day: number) => `2026-10-${String(day).padStart(2, '0')}`
const rows = (metricId: string, days: number[], value: unknown = true) => days.map((n) => ({ date: d(n), metric_id: metricId, value: value as never }))

describe('реестр достижений', () => {
  it('около 20 стартовых, ключи уникальны, группы известны, пороги положительные', () => {
    expect(ACHIEVEMENTS.length).toBe(19)
    expect(new Set(ACHIEVEMENTS.map((a) => a.key)).size).toBe(ACHIEVEMENTS.length)
    for (const a of ACHIEVEMENTS) {
      expect(GROUP_ORDER).toContain(a.group)
      expect(a.target).toBeGreaterThan(0)
      expect(a.icon).not.toBe('')
    }
  })

  it('набор владельца: серии 5/10/30/100, баллы 100/500/1000, 10 и 50 тренировок, 1 и 5 челленджей, 10 целей, 5 книг', () => {
    const by = (c: string) => ACHIEVEMENTS.filter((a) => a.counter === c).map((a) => a.target)
    expect(by('streakBest')).toEqual([5, 10, 30, 100])
    expect(by('pointsTotal')).toEqual([100, 500, 1000])
    expect(by('challengesDone')).toEqual([1, 5])
    expect(by('goalsDone')).toEqual([1, 10])
    expect(by('booksDone')).toEqual([1, 5])
    expect(by('workoutDays')).toEqual([1, 10, 50])
  })

  it('ключ не содержит служебного префикса', () => {
    expect(ACHIEVEMENTS.some((a) => a.key === BASELINE_KEY)).toBe(false)
  })
})

describe('evaluate', () => {
  it('прогресс — доля от порога, не больше 1; met только при value >= target', () => {
    const st = evaluate({ ...ZERO, streakBest: 7, pointsTotal: 1500 })
    const get = (k: string) => st.find((s) => s.def.key === k)!
    expect(get('streak_5')).toMatchObject({ value: 7, progress: 1, met: true })
    expect(get('streak_10').progress).toBeCloseTo(0.7)
    expect(get('streak_10').met).toBe(false)
    expect(get('points_1000')).toMatchObject({ progress: 1, met: true })
    expect(get('points_500').met).toBe(true)
    expect(get('workouts_10')).toMatchObject({ value: 0, progress: 0, met: false })
  })

  it('отрицательные и пустые значения не дают отрицательный прогресс', () => {
    const st = evaluate({ ...ZERO, goalsDone: -3 })
    expect(st.every((s) => s.progress >= 0)).toBe(true)
  })
})

describe('reconcile', () => {
  const NOW = '2026-10-05T10:00:00.000Z'

  it('первый заход: всё выполненное открывается задним числом (дата null), ставится служебная запись, поздравлять не с чем', () => {
    const st = evaluate({ ...ZERO, goalsDone: 1, booksDone: 1 })
    const r = reconcile(st, {}, NOW)
    expect(r.added).toEqual({ [BASELINE_KEY]: NOW, first_goal: null, first_book: null })
    expect(r.newlyUnlocked).toEqual([])
    expect(isUnlocked('first_goal', r.unlocked)).toBe(true)
    expect(isUnlocked(BASELINE_KEY, r.unlocked)).toBe(false)
  })

  it('первый заход без выполненного: пишется только служебная запись', () => {
    const r = reconcile(evaluate(ZERO), {}, NOW)
    expect(r.added).toEqual({ [BASELINE_KEY]: NOW })
    expect(Object.keys(r.unlocked).filter((k) => isUnlocked(k, r.unlocked))).toEqual([])
  })

  it('позже: новое достижение получает настоящую дату и попадает в newlyUnlocked', () => {
    const stored = { [BASELINE_KEY]: '2026-10-01T00:00:00.000Z', first_goal: null }
    const r = reconcile(evaluate({ ...ZERO, goalsDone: 1, workoutDays: 1 }), stored, NOW)
    expect(r.added).toEqual({ first_workout: NOW })
    expect(r.newlyUnlocked).toEqual(['first_workout'])
    expect(r.unlocked.first_goal).toBeNull() // прежняя запись не перезаписывается
  })

  it('открытое не пропадает, если счётчик упал, и повторно не пишется', () => {
    const stored = { [BASELINE_KEY]: 'x', first_goal: '2026-10-02T00:00:00.000Z' }
    const r = reconcile(evaluate(ZERO), stored, NOW)
    expect(r.added).toEqual({})
    expect(isUnlocked('first_goal', r.unlocked)).toBe(true)
    const again = reconcile(evaluate({ ...ZERO, goalsDone: 4 }), r.unlocked, NOW)
    expect(again.added).toEqual({})
  })
})

describe('bestPerfectStreak', () => {
  const today = new Date('2026-10-12T12:00:00')

  it('лучшая серия, а не текущая: 3 дня подряд, пропуск, потом 2 дня', () => {
    const m = [metric({ id: 'a' })]
    const byDay: Record<string, Record<string, never>> = {}
    for (const r of rows('a', [1, 2, 3, 5, 6])) (byDay[r.date] ||= {})[r.metric_id] = r.value
    // 4 октября записи нет → день с обязательной метрикой не выполнен → разрыв
    expect(bestPerfectStreak(m, byDay as never, today)).toBe(3)
  })

  it('невыполненная метрика в дне рвёт «идеальный день»', () => {
    const m = [metric({ id: 'a' }), metric({ id: 'b' })]
    const byDay = {
      [d(1)]: { a: true, b: true },
      [d(2)]: { a: true, b: false },
      [d(3)]: { a: true, b: true },
      [d(4)]: { a: true, b: true },
    }
    expect(bestPerfectStreak(m, byDay as never, today)).toBe(2)
  })

  it('день отдыха по расписанию серию не рвёт и не считается', () => {
    // метрика только по пн (1) и ср (3): 2026-10-05 пн, 10-06 вт, 10-07 ср, 10-08 чт, 10-12 пн
    const m = [metric({ id: 'a', schedule: { type: 'days', days: [1, 3] } })]
    const byDay = {
      [d(5)]: { a: true },
      [d(7)]: { a: true },
      [d(12)]: { a: true },
    }
    expect(bestPerfectStreak(m, byDay as never, today)).toBe(3)
  })

  it('сегодняшний ещё не выполненный день не обнуляет серию', () => {
    const m = [metric({ id: 'a' })]
    const byDay = { [d(10)]: { a: true }, [d(11)]: { a: true } }
    expect(bestPerfectStreak(m, byDay as never, new Date('2026-10-12T09:00:00'))).toBe(2)
  })

  it('метрики с count_streak=false не участвуют (вес и т.п.)', () => {
    const m = [metric({ id: 'a' }), metric({ id: 'w', count_streak: false })]
    const byDay = { [d(1)]: { a: true }, [d(2)]: { a: true }, [d(3)]: { a: true } }
    expect(bestPerfectStreak(m, byDay as never, today)).toBe(3)
  })

  it('пустая история или нет метрик — 0', () => {
    expect(bestPerfectStreak([], {}, today)).toBe(0)
    expect(bestPerfectStreak([metric({ id: 'a' })], {}, today)).toBe(0)
  })
})

describe('computeCounters', () => {
  const base = {
    metrics: [metric({ id: 'a' }), metric({ id: 'n', type: 'number', goal_value: 2000 })],
    values: [...rows('a', [1, 2, 3]), ...rows('n', [1, 2], 2500), ...rows('n', [3], 100)],
    doneGoals: [{ points: 5 }, { points: null }, { points: 20 }],
    masteredSkills: [{ points: null }],
    doneBooks: [{ points: 15 }, { points: null }],
    weightEntries: 4,
    workoutDates: [d(1), d(1), d(2)],
    challengesDone: 2,
    today: new Date('2026-10-12T12:00:00'),
  }

  it('баллы = выполненные метрики-дни + баллы целей (по умолчанию 5) + навыков (10) + книг (10)', () => {
    const c = computeCounters(base)
    // метрики: a — 3 дня, n — 2 дня из 3 (100 < 2000) → 5
    expect(c.metricDone).toBe(5)
    // 5 + (5 + 5 + 20) + 10 + (15 + 10) = 70
    expect(c.pointsTotal).toBe(70)
  })

  it('счётчики по таблицам: цели, навыки, книги, вес, челленджи; тренировочные дни — различные даты', () => {
    const c = computeCounters(base)
    expect(c).toMatchObject({ goalsDone: 3, skillsMastered: 1, booksDone: 2, weightEntries: 4, challengesDone: 2, workoutDays: 2 })
  })

  it('лучшая серия считается по «идеальным дням» (a и n вместе): 1 и 2 октября идеальны, 3-е нет', () => {
    expect(computeCounters(base).streakBest).toBe(2)
  })

  it('у «подходов» учитывается дата: правило «N подходов» действует только с даты записи в журнале', () => {
    const m = [
      metric({
        id: 's',
        type: 'sets',
        goal_value: 10,
        planned_sets_log: [{ from: d(2), n: 3 }],
      }),
    ]
    const sets = (reps: number[]) => reps.map((r) => ({ reps: r }))
    const values = [
      { date: d(1), metric_id: 's', value: sets([10]) as never }, // до даты правила: хватает объёма 10
      { date: d(2), metric_id: 's', value: sets([10]) as never }, // с даты: нужно >= 3 подходов — один подход не считается
      { date: d(3), metric_id: 's', value: sets([4, 3, 3]) as never }, // 3 подхода, объём 10 — считается
    ]
    const c = computeCounters({ ...base, metrics: m, values, doneGoals: [], masteredSkills: [], doneBooks: [] })
    expect(c.metricDone).toBe(2)
  })
})

describe('groupStates', () => {
  it('группы идут в заданном порядке, в каждой — её достижения; открытые считаются по хранилищу, а не по счётчику', () => {
    const st = evaluate({ ...ZERO, streakBest: 12 })
    const g = groupStates(st, { [BASELINE_KEY]: 'x', streak_5: null, first_goal: null })
    expect(g.map((x) => x.group)).toEqual([...GROUP_ORDER])
    expect(g.reduce((n, x) => n + x.items.length, 0)).toBe(ACHIEVEMENTS.length)
    expect(g.find((x) => x.group === 'streak')!.unlockedCount).toBe(1) // streak_10 выполнено по счётчику, но в хранилище ещё нет
    expect(g.find((x) => x.group === 'first')!.unlockedCount).toBe(1)
    expect(g.find((x) => x.group === 'books')!.unlockedCount).toBe(0)
  })
})

describe('баллы с дробными долями за подходы (миграция 045, как в web-shop/web-dashboard)', () => {
  const sets = (n: number, reps = 5) => Array.from({ length: n }, () => ({ reps }))
  const withPlan = (frac: boolean) =>
    metric({ id: 's', type: 'sets', goal_value: 1, planned_sets_log: [{ from: d(1), n: 4, ...(frac ? { frac: true } : {}) }] as never })
  const base = (m: Metric, values: ReturnType<typeof rows>) => ({
    metrics: [m],
    values,
    doneGoals: [],
    masteredSkills: [],
    doneBooks: [],
    weightEntries: 0,
    workoutDates: [],
    challengesDone: 0,
    today: new Date('2026-10-12T12:00:00'),
  })

  it('план 4 подхода, с флагом frac: 4 подхода = 1 балл, 3 подхода = 0,8 (round(10·3/4)=8 десятых), 2 = 0,5, 1 = 0,3', () => {
    const v = [{ date: d(1), metric_id: 's', value: sets(4) as never }, { date: d(2), metric_id: 's', value: sets(3) as never }, { date: d(3), metric_id: 's', value: sets(2) as never }, { date: d(4), metric_id: 's', value: sets(1) as never }]
    const c = computeCounters(base(withPlan(true), v))
    // 10 + 8 + 5 + 3 = 26 десятых; «половина вверх»: 10·1/4 = 2,5 → 3
    expect(c.pointsTotal).toBe(2.6)
    expect(c.metricDone).toBe(1) // выполненным считается только полностью сделанный день
  })

  it('без флага frac недобор ничего не даёт (как раньше): только полностью выполненный день = 1 балл', () => {
    const v = [{ date: d(1), metric_id: 's', value: sets(4) as never }, { date: d(2), metric_id: 's', value: sets(3) as never }]
    expect(computeCounters(base(withPlan(false), v)).pointsTotal).toBe(1)
  })

  it('потолок недобора — 0,9: 7 подходов из 8 дают round(8,75)=9 десятых, а не 1 балл', () => {
    const m = metric({ id: 's', type: 'sets', goal_value: 1, planned_sets_log: [{ from: d(1), n: 8, frac: true }] as never })
    const c = computeCounters(base(m, [{ date: d(1), metric_id: 's', value: sets(7) as never }]))
    expect(c.pointsTotal).toBe(0.9)
  })

  it('дни до даты записи журнала не получают долей; пустые заготовки подходов (без повторов и времени) не считаются', () => {
    // цель по объёму 100 повторений: ни один из этих дней не «выполнен» обычным способом, баллы дают только доли
    const m = metric({ id: 's', type: 'sets', goal_value: 100, planned_sets_log: [{ from: d(5), n: 4, frac: true }] as never })
    const v = [
      { date: d(3), metric_id: 's', value: sets(2) as never }, // до даты правила долей нет — 0
      { date: d(5), metric_id: 's', value: [{ reps: 5 }, { reps: 0 }, { reps: 0 }] as never }, // один настоящий подход из 4 → 3 десятых
    ]
    expect(computeCounters(base(m, v)).pointsTotal).toBe(0.3)
  })

  it('доли складываются без хвоста плавающей точки и с баллами целей: 0,3 + 0,3 + 0,3 + цель 5 = 5,9', () => {
    const m = withPlan(true)
    const v = [d(1), d(2), d(3)].map((date) => ({ date, metric_id: 's', value: sets(1) as never }))
    const c = computeCounters({ ...base(m, v), doneGoals: [{ points: null }] })
    expect(c.pointsTotal).toBe(5.9)
  })

  it('99,9 балла — это ещё НЕ «Первая сотня»: порог 100 достигается только целыми 100', () => {
    const near = evaluate({ ...ZERO, pointsTotal: 99.9 }).find((x) => x.def.key === 'points_100')!
    expect(near.met).toBe(false)
    expect(near.progress).toBeCloseTo(0.999)
    expect(evaluate({ ...ZERO, pointsTotal: 100 }).find((x) => x.def.key === 'points_100')!.met).toBe(true)
  })
})

