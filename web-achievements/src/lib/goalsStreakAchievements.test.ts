import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, computeCounters, evaluate } from './achievements'
import { GRADE, ICON_BY_KEY } from './grade'

// BACKLOG 60.1: лесенка «серия по целям» 3/7/14/30; счётчик приходит из RPC get_my_goals_streak (миграция 079).
describe('достижения за серию по целям', () => {
  const keys = ['goals_streak_3', 'goals_streak_7', 'goals_streak_14', 'goals_streak_30']
  const base = { metrics: [], values: [], doneGoals: [], masteredSkills: [], doneBooks: [], weightEntries: 0, workoutDates: [], challengesDone: 0, today: new Date(2026, 9, 12) }

  it('четыре ступени с порогами 3/7/14/30, у каждой есть редкость и иконка', () => {
    const defs = ACHIEVEMENTS.filter((a) => a.group === 'goals_streak')
    expect(defs.map((d) => d.key)).toEqual(keys)
    expect(defs.map((d) => d.target)).toEqual([3, 7, 14, 30])
    for (const k of keys) {
      expect(GRADE[k], k).toBeTruthy()
      expect(ICON_BY_KEY[k], k).toBeTruthy()
    }
  })

  it('счётчик берётся из goalsStreakBest; не передан — 0, ничего не открыто', () => {
    expect(computeCounters(base).goalsStreakBest).toBe(0)
    const met = (n: number) => evaluate(computeCounters({ ...base, goalsStreakBest: n })).filter((s) => s.def.group === 'goals_streak' && s.met).map((s) => s.def.key)
    expect(met(0)).toEqual([])
    expect(met(7)).toEqual(['goals_streak_3', 'goals_streak_7'])
    expect(met(30)).toEqual(keys)
  })
})
