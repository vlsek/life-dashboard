import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, evaluate, type Counters } from './achievements'
import { COLLECTIONS, collectionStates } from './collections'
import { t } from './i18n'

const ZERO: Counters = { streakBest: 0, perfectDays: 0, pointsTotal: 0, metricDone: 0, weightEntries: 0, goalsDone: 0, skillsMastered: 0, booksDone: 0, workoutDays: 0, challengesDone: 0, megaWeeks: 0, wordsAdded: 0, wordsLearned: 0, milestonesDone: 0, goalsStreakBest: 0 }

describe('коллекции достижений (78.6)', () => {
  it('все ключи наборов есть в реестре, наборы по 3–5 достижений из РАЗНЫХ разделов, без повторов между наборами', () => {
    const known = new Set(ACHIEVEMENTS.map((a) => a.key))
    const seen = new Set<string>()
    for (const c of COLLECTIONS) {
      expect(c.keys.length).toBeGreaterThanOrEqual(3)
      expect(c.keys.length).toBeLessThanOrEqual(5)
      const groups = new Set(c.keys.map((k) => ACHIEVEMENTS.find((a) => a.key === k)?.group))
      expect(groups.size).toBe(c.keys.length) // каждый из своего раздела — не дублирует лесенки
      for (const k of c.keys) {
        expect(known.has(k), k).toBe(true)
        expect(seen.has(k), 'повтор ' + k).toBe(false)
        seen.add(k)
      }
    }
  })
  it('у каждого набора есть название в обоих языках', () => {
    for (const lang of ['ru', 'en']) {
      localStorage.setItem('site_lang', lang)
      for (const c of COLLECTIONS) expect(t(('ach_col_' + c.id) as never)).not.toBe('ach_col_' + c.id)
    }
    localStorage.setItem('site_lang', 'ru')
  })
  it('считает «N из M» по открытым; полный набор — complete', () => {
    const st = evaluate(ZERO)
    const first = COLLECTIONS[0]
    const some = collectionStates(st, { [first.keys[0]]: '2026-10-01T00:00:00Z', [first.keys[1]]: null }, [first])[0]
    expect(some.done).toBe(2)
    expect(some.total).toBe(first.keys.length)
    expect(some.complete).toBe(false)
    const all = collectionStates(st, Object.fromEntries(first.keys.map((k) => [k, null])), [first])[0]
    expect(all.complete).toBe(true)
  })
  it('служебная запись _baseline не считается открытым; неизвестный ключ пропускается', () => {
    const st = evaluate(ZERO)
    const r = collectionStates(st, { _baseline: 'x' }, [{ id: 'x', keys: ['first_metric', 'no_such_key'] }])[0]
    expect(r.total).toBe(1)
    expect(r.done).toBe(0)
  })
})
