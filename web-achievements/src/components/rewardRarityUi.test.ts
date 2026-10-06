import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AchievementCard from './AchievementCard.vue'
import AchievementUnlockedModal from './AchievementUnlockedModal.vue'
import { evaluate, type Counters } from '../lib/achievements'
import { RARITY_COLOR } from '../lib/rewards'

const ZERO: Counters = { streakBest: 0, perfectDays: 0, pointsTotal: 0, metricDone: 0, weightEntries: 0, goalsDone: 0, skillsMastered: 0, booksDone: 0, workoutDays: 0, challengesDone: 0, megaWeeks: 0, wordsAdded: 0, wordsLearned: 0, milestonesDone: 0 }
const stateOf = (key: string) => evaluate({ ...ZERO }).find((s) => s.def.key === key)!

beforeEach(() => localStorage.setItem('site_lang', 'ru'))
afterEach(() => {
  localStorage.removeItem('site_lang')
  document.body.innerHTML = ''
})

describe('редкость награды на карточке достижения (BACKLOG 39)', () => {
  it('показывает метку редкости отдельно от строки награды (текст строки награды не меняется)', () => {
    const w = mount(AchievementCard, { props: { state: stateOf('learned_10'), unlocked: false, unlockedAt: null } })
    expect(w.find('[data-testid="achievement-reward"]').text()).toBe('Награда (скоро): 20 монет')
    expect(w.find('[data-testid="achievement-rarity"]').text()).toBe('Обычная')
    expect(w.find('[data-testid="achievement-rarity"]').attributes('data-rarity')).toBe('common')
  })

  it('ступени одной лесенки идут по возрастанию: обычная → необычная → редкая → по теме', () => {
    const label = (key: string) => mount(AchievementCard, { props: { state: stateOf(key), unlocked: false, unlockedAt: null } }).find('[data-testid="achievement-rarity"]').text()
    expect(['words_10', 'words_25', 'words_50', 'words_100'].map(label)).toEqual(['Обычная', 'Необычная', 'Редкая', 'Необычная'])
    expect(label('workouts_250')).toBe('Легендарная')
    expect(label('books_25')).toBe('Эпическая')
    expect(label('challenges_25')).toBe('Эпическая')
  })

  it('цветная полоска карточки — цвет редкости; у значка без награды ни метки, ни полоски', () => {
    const w = mount(AchievementCard, { props: { state: stateOf('workouts_250'), unlocked: true, unlockedAt: null } })
    expect(w.find('[data-testid="achievement-card"]').attributes('style')).toContain('inset 0 3px 0')
    expect(RARITY_COLOR.legendary).toMatch(/^#[0-9a-f]{6}$/i)
    const none = mount(AchievementCard, { props: { state: stateOf('streak_5'), unlocked: false, unlockedAt: null } })
    expect(none.find('[data-testid="achievement-rarity"]').exists()).toBe(false)
    expect(none.find('[data-testid="achievement-card"]').attributes('style') ?? '').not.toContain('inset')
  })

  it('английская подпись', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(AchievementCard, { props: { state: stateOf('books_25'), unlocked: false, unlockedAt: null } })
    expect(w.find('[data-testid="achievement-rarity"]').text()).toBe('Epic')
  })
})

describe('редкость награды в окне «Новое достижение»', () => {
  it('метка редкости под строкой награды; у достижения без награды её нет; при «Дальше» меняется', async () => {
    const w = mount(AchievementUnlockedModal, { props: { states: [stateOf('learned_10'), stateOf('workouts_250'), stateOf('streak_30')] }, attachTo: document.body })
    expect(w.find('[data-testid="unlocked-reward"]').text()).toBe('Награда (скоро): 20 монет')
    expect(w.find('[data-testid="unlocked-rarity"]').text()).toBe('Обычная')
    await w.find('[data-testid="unlocked-next"]').trigger('click')
    expect(w.find('[data-testid="unlocked-rarity"]').text()).toBe('Легендарная')
    await w.find('[data-testid="unlocked-next"]').trigger('click')
    expect(w.find('[data-testid="unlocked-reward"]').exists()).toBe(false)
    expect(w.find('[data-testid="unlocked-rarity"]').exists()).toBe(false)
    w.unmount()
  })
})
