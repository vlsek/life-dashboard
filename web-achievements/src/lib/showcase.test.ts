import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, evaluate, groupStates, type Counters } from './achievements'
import { closestLocked, filterGroups, recentUnlocked, remaining } from './showcase'
import { gradeOf } from './grade'

const ZERO: Counters = { streakBest: 0, perfectDays: 0, pointsTotal: 0, metricDone: 0, weightEntries: 0, goalsDone: 0, skillsMastered: 0, booksDone: 0, workoutDays: 0, challengesDone: 0, megaWeeks: 0, wordsAdded: 0, wordsLearned: 0, milestonesDone: 0 }

describe('витрина: последние', () => {
  it('новые сверху, без записей без даты и без не открытых, не больше лимита', () => {
    const states = evaluate(ZERO)
    const k = ACHIEVEMENTS.map((a) => a.key)
    const unlocked = { [k[0]]: '2026-10-01T10:00:00Z', [k[1]]: '2026-10-05T10:00:00Z', [k[2]]: null, [k[3]]: '2026-10-03T10:00:00Z', _baseline: '2026-09-01T00:00:00Z' }
    const r = recentUnlocked(states, unlocked).map((s) => s.def.key)
    expect(r).toEqual([k[1], k[3], k[0]])
    expect(recentUnlocked(states, unlocked, 2)).toHaveLength(2)
  })
})

describe('витрина: ближе всего', () => {
  it('только с движением, закрытые, по убыванию прогресса; осталось считается от цели', () => {
    const w = ACHIEVEMENTS.filter((a) => a.counter === 'wordsAdded').sort((a, b) => a.target - b.target)
    const states = evaluate({ ...ZERO, wordsAdded: Math.floor(w[0].target / 2) })
    const r = closestLocked(states, {})
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((s) => s.progress > 0 && !s.met)).toBe(true)
    for (let i = 1; i < r.length; i++) expect(r[i - 1].progress).toBeGreaterThanOrEqual(r[i].progress)
    expect(remaining(r[0])).toBe(r[0].def.target - r[0].value)
    // открытое в список не попадает
    expect(closestLocked(states, { [r[0].def.key]: '2026-10-01T00:00:00Z' }).map((s) => s.def.key)).not.toContain(r[0].def.key)
  })
  it('без прогресса — пусто', () => {
    expect(closestLocked(evaluate(ZERO), {})).toEqual([])
  })
})

describe('фильтр по грейду', () => {
  const groups = groupStates(evaluate(ZERO), {})
  it('«все» ничего не меняет', () => {
    expect(filterGroups(groups, {}, 'all')).toBe(groups)
  })
  it('для каждого грейда остаются только его достижения, пустые группы убраны', () => {
    for (const g of ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const) {
      const f = filterGroups(groups, {}, g)
      const items = f.flatMap((x) => x.items)
      expect(items.every((s) => gradeOf(s.def.key) === g)).toBe(true)
      expect(f.every((x) => x.items.length > 0)).toBe(true)
      expect(items.length).toBe(ACHIEVEMENTS.filter((a) => gradeOf(a.key) === g).length)
    }
  })
  it('счётчик группы считает открытые среди оставшихся', () => {
    const key = ACHIEVEMENTS[0].key
    const g = gradeOf(key)
    const f = filterGroups(groups, { [key]: '2026-10-01T00:00:00Z' }, g)
    expect(f.reduce((n, x) => n + x.unlockedCount, 0)).toBe(1)
  })
})
