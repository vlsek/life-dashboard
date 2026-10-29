import { beforeEach, describe, expect, it } from 'vitest'
import { goalIsDone, goalProgress, goalRewardErrorText, rewardState, selectableGoals } from './lib/goalReward'

// BACKLOG 68.2 срез 1: статус награды за цель — те же правила, что в базе (миграция 111).
describe('goalIsDone — как goal_is_done в SQL и на клиентах', () => {
  it('одноэтапная — по флагу done; многоэтапная — по current_stage ≥ stages', () => {
    expect(goalIsDone({ id: 'a', name: 'x', stages: 1, done: true })).toBe(true)
    expect(goalIsDone({ id: 'a', name: 'x', stages: 1, done: false })).toBe(false)
    expect(goalIsDone({ id: 'a', name: 'x', done: null })).toBe(false)
    expect(goalIsDone({ id: 'a', name: 'x', stages: 3, current_stage: 2, done: false })).toBe(false)
    expect(goalIsDone({ id: 'a', name: 'x', stages: 3, current_stage: 3, done: false })).toBe(true)
    // у многоэтапной флаг done сам по себе не решает (как в базе)
    expect(goalIsDone({ id: 'a', name: 'x', stages: 3, current_stage: 1, done: true })).toBe(false)
  })
})

describe('goalProgress — «3 из 5»', () => {
  it('этапы, одноэтапная, выполненная и мусорные значения', () => {
    expect(goalProgress({ id: 'a', name: 'x', stages: 5, current_stage: 3 })).toEqual({ done: 3, total: 5 })
    expect(goalProgress({ id: 'a', name: 'x', stages: 1, done: false })).toEqual({ done: 0, total: 1 })
    expect(goalProgress({ id: 'a', name: 'x', stages: 1, done: true })).toEqual({ done: 1, total: 1 })
    expect(goalProgress({ id: 'a', name: 'x', stages: 5, current_stage: 9 })).toEqual({ done: 5, total: 5 })
    expect(goalProgress({ id: 'a', name: 'x', stages: 0 })).toEqual({ done: 0, total: 1 })
    expect(goalProgress({ id: 'a', name: 'x', stages: 4, current_stage: -2 })).toEqual({ done: 0, total: 4 })
  })
})

describe('selectableGoals — только невыполненные', () => {
  it('выполненные не предлагаются, остальные по алфавиту', () => {
    const g = [
      { id: '1', name: 'Яхта', stages: 1, done: false },
      { id: '2', name: 'Готовая', stages: 1, done: true },
      { id: '3', name: 'Арфа', stages: 3, current_stage: 3 },
      { id: '4', name: 'Бег', stages: 3, current_stage: 1 },
    ]
    expect(selectableGoals(g).map((x) => x.id)).toEqual(['4', '1'])
  })
})

describe('rewardState', () => {
  const goals = [
    { id: 'g1', name: 'Марафон', stages: 5, current_stage: 3, done: false },
    { id: 'g2', name: 'Книга', stages: 1, done: true },
  ]
  it('обычная хотелка и полученная награда', () => {
    expect(rewardState({ goal_id: null, redeemed: false }, goals).status).toBe('no_goal')
    expect(rewardState({ goal_id: 'g1', redeemed: true }, goals).status).toBe('claimed')
    expect(rewardState({ goal_id: null, redeemed: true }, goals).status).toBe('claimed')
  })
  it('цель в процессе: прогресс «3 из 5»', () => {
    const s = rewardState({ goal_id: 'g1' }, goals)
    expect(s.status).toBe('in_progress')
    expect(s.progress).toEqual({ done: 3, total: 5 })
    expect(s.goal?.name).toBe('Марафон')
  })
  it('цель выполнена → можно забрать', () => {
    expect(rewardState({ goal_id: 'g2' }, goals).status).toBe('ready')
  })
  it('цель удалена (нет в списке) → goal_missing', () => {
    expect(rewardState({ goal_id: 'gone' }, goals).status).toBe('goal_missing')
  })
})

describe('goalRewardErrorText — коды миграции 111', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  it('каждый код GR001–GR006 даёт свой понятный текст', () => {
    const texts = ['GR001', 'GR002', 'GR003', 'GR004', 'GR005', 'GR006'].map((code) => goalRewardErrorText({ code, message: 'технический текст' }))
    for (const x of texts) expect(x && x.length > 5 && !x.includes('технический')).toBe(true)
    expect(goalRewardErrorText({ code: 'GR003' })).toContain('Сначала выполни цель')
    expect(goalRewardErrorText({ code: 'GR002' })).toContain('уже выполнена')
    expect(goalRewardErrorText({ code: 'GR004' })).toBe(goalRewardErrorText({ code: 'GR006' }))
  })
  it('чужие ошибки — null (покажет общий friendlyError)', () => {
    expect(goalRewardErrorText({ code: '42501' })).toBeNull()
    expect(goalRewardErrorText(new Error('Failed to fetch'))).toBeNull()
    expect(goalRewardErrorText(null)).toBeNull()
  })
  it('английские тексты на месте', () => {
    localStorage.setItem('site_lang', 'en')
    expect(goalRewardErrorText({ code: 'GR003' })).toContain('Finish the goal first')
  })
})
