import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, type Counters } from './achievements'
import { HIDDEN_ACHIEVEMENTS, evaluateHidden, isHiddenKey, sectionsUsed } from './hiddenAchievements'
import { gradeOf } from './grade'
import { achievementTitle, achievementCondition } from './achievementText'

const zero = new Proxy({} as Counters, { get: () => 0 })
const withC = (o: Partial<Counters>) => ({ ...(zero as object), ...o }) as Counters

describe('скрытые достижения (49.1)', () => {
  it('их десять и их нет в общем реестре', () => {
    expect(HIDDEN_ACHIEVEMENTS).toHaveLength(10)
    for (const d of HIDDEN_ACHIEVEMENTS) {
      expect(ACHIEVEMENTS.some((a) => a.key === d.key)).toBe(false)
      expect(isHiddenKey(d.key)).toBe(true)
    }
    expect(new Set(HIDDEN_ACHIEVEMENTS.map((d) => d.key)).size).toBe(10)
  })
  it('у каждого есть название, условие и грейд выше обычного', () => {
    for (const d of HIDDEN_ACHIEVEMENTS) {
      expect(achievementTitle(d)).not.toMatch(/^ach_/)
      expect(achievementCondition(d)).toBeTruthy()
      expect(['rare', 'epic', 'legendary']).toContain(gradeOf(d.key))
    }
  })
  it('открывается по порогу, ниже — нет', () => {
    const at = (o: Partial<Counters>, key: string) => evaluateHidden(withC(o)).find((s) => s.def.key === key)!
    expect(at({ streakBest: 364 }, 'secret_year').met).toBe(false)
    expect(at({ streakBest: 365 }, 'secret_year').met).toBe(true)
  })
  it('«Универсал» — по числу разделов, а не по целям', () => {
    const c = withC({ goalsDone: 5, booksDone: 1, workoutDays: 2 })
    expect(sectionsUsed(c)).toBe(3)
    expect(evaluateHidden(c).find((s) => s.def.key === 'secret_all_rounder')!.met).toBe(false)
    const all = withC({ goalsDone: 1, skillsMastered: 1, booksDone: 1, workoutDays: 1, challengesDone: 1, wordsAdded: 1, milestonesDone: 1 })
    expect(evaluateHidden(all).find((s) => s.def.key === 'secret_all_rounder')!.met).toBe(true)
  })
})
