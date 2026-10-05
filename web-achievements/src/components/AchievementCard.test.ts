import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AchievementCard from './AchievementCard.vue'
import { ACHIEVEMENTS, evaluate, type Counters } from '../lib/achievements'

const ZERO: Counters = { streakBest: 0, perfectDays: 0, pointsTotal: 0, metricDone: 0, weightEntries: 0, goalsDone: 0, skillsMastered: 0, booksDone: 0, workoutDays: 0, challengesDone: 0, megaWeeks: 0, wordsAdded: 0, wordsLearned: 0, milestonesDone: 0 }
const stateOf = (key: string, counters: Partial<Counters>) => evaluate({ ...ZERO, ...counters }).find((s) => s.def.key === key)!

afterEach(() => localStorage.removeItem('site_lang'))

describe('AchievementCard', () => {
  it('закрытое: тусклое, показывает название, условие и прогресс «N / порог» с полоской', () => {
    localStorage.setItem('site_lang', 'ru')
    const w = mount(AchievementCard, { props: { state: stateOf('streak_10', { streakBest: 7 }), unlocked: false, unlockedAt: null } })
    const root = w.find('[data-testid="achievement-card"]')
    expect(root.attributes('data-state')).toBe('locked')
    expect(root.attributes('data-key')).toBe('streak_10')
    expect(w.text()).toContain('Разгорается')
    expect(w.text()).toContain('Идеальных дней подряд: 10')
    expect(w.find('[data-testid="achievement-progress"]').text()).toBe('7 / 10')
    const bar = w.find('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('7')
    expect(bar.attributes('aria-valuemax')).toBe('10')
    expect(w.find('[data-testid="achievement-when"]').exists()).toBe(false)
  })

  it('прогресс не выходит за порог, если счётчик больше (но достижение ещё не записано как открытое)', () => {
    const w = mount(AchievementCard, { props: { state: stateOf('streak_5', { streakBest: 9 }), unlocked: false, unlockedAt: null } })
    expect(w.find('[data-testid="achievement-progress"]').text()).toBe('5 / 5')
  })

  it('открытое с датой: цветное, показывает «Открыто <дата>», без полоски прогресса', () => {
    localStorage.setItem('site_lang', 'ru')
    const w = mount(AchievementCard, { props: { state: stateOf('first_goal', { goalsDone: 1 }), unlocked: true, unlockedAt: '2026-10-05T10:00:00.000Z' } })
    expect(w.find('[data-testid="achievement-card"]').attributes('data-state')).toBe('unlocked')
    const when = w.find('[data-testid="achievement-when"]').text()
    expect(when).toMatch(/^Открыто /)
    expect(when).toContain('2026')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  })

  it('открытое без даты (выполнено до появления раздела) и открытое, у которого счётчик потом упал, остаются открытыми', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(AchievementCard, { props: { state: stateOf('first_book', {}), unlocked: true, unlockedAt: null } })
    expect(w.find('[data-testid="achievement-card"]').attributes('data-state')).toBe('unlocked')
    expect(w.find('[data-testid="achievement-when"]').text()).toBe('Done before this page appeared')
  })

  it('у каждого достижения реестра карточка рисуется с иконкой-SVG', () => {
    for (const s of evaluate(ZERO)) {
      const w = mount(AchievementCard, { props: { state: s, unlocked: false, unlockedAt: null } })
      expect(w.find('.ach-badge svg').exists(), s.def.key + ' / ' + s.def.icon).toBe(true)
    }
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0)
  })
})
