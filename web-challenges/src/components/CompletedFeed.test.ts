import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CompletedFeed from './CompletedFeed.vue'
import { nextLadderStep } from '../lib/challengeDone'
import type { Challenge, ChallengeEntry } from '../lib/types'

const ch = (id: string, over: Partial<Challenge> = {}): Challenge => ({
  id, user_id: 'u', template_id: null, title: 'Отжимания ' + id, icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 3, daily_target: 10, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: false, completed: true, completed_at: '2026-09-20T12:00:00Z', created_at: '2026-09-01T00:00:00Z', ...over,
})
const entry = (challenge_id: string, date: string, value: number): ChallengeEntry => ({ id: challenge_id + date, user_id: 'u', challenge_id, date, value, note: null, created_at: '' })
const done = (id: string) => ['2026-09-01', '2026-09-02', '2026-09-03'].map((d) => entry(id, d, 10))

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('nextLadderStep', () => {
  it('до следующей ступени 1/5/10/25; после 25 — null', () => {
    expect(nextLadderStep(0)).toEqual({ step: 1, left: 1 })
    expect(nextLadderStep(1)).toEqual({ step: 5, left: 4 })
    expect(nextLadderStep(5)).toEqual({ step: 10, left: 5 })
    expect(nextLadderStep(24)).toEqual({ step: 25, left: 1 })
    expect(nextLadderStep(25)).toBeNull()
  })
})

describe('CompletedFeed (лента завершённых)', () => {
  it('карточка на челлендж: итог «выполнено дней X из N», дата; новые сверху', () => {
    const items = [ch('a', { completed_at: '2026-09-10T12:00:00Z' }), ch('b', { completed_at: '2026-09-25T12:00:00Z' })]
    const w = mount(CompletedFeed, { props: { items, entriesFor: (c: Challenge) => done(c.id) } })
    const cards = w.findAll('[data-testid="feed-card"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('Отжимания b')
    expect(cards[0].find('[data-testid="feed-date"]').text()).toBe('25.09.2026')
    expect(cards[1].text()).toContain('Отжимания a')
    expect(cards[0].find('[data-testid="feed-summary"]').text()).toBe('Выполнено дней: 3 из 3')
  })
  it('накопительный челлендж: «Собрано: X из N»', () => {
    const c = ch('k', { type: 'cumulative_count', target_count: 5, item_label: 'книг', duration_days: null, daily_target: null })
    const w = mount(CompletedFeed, { props: { items: [c], entriesFor: () => [entry('k', '2026-09-05', 5)] } })
    expect(w.find('[data-testid="feed-summary"]').text()).toContain('Собрано: 5 из 5')
  })
  it('счётчик: «Завершено: N» и сколько до следующей ступени достижений', () => {
    const w = mount(CompletedFeed, { props: { items: [ch('a'), ch('b')], entriesFor: () => [] } })
    expect(w.find('[data-testid="feed-count"]').text()).toBe('Завершено: 2 · ещё 3 до следующего достижения (на 5)')
  })
  it('после 25 завершённых — «все ступени пройдены»', () => {
    const items = Array.from({ length: 25 }, (_, i) => ch('c' + i))
    const w = mount(CompletedFeed, { props: { items, entriesFor: () => [] } })
    expect(w.find('[data-testid="feed-count"]').text()).toContain('все ступени достижений пройдены')
  })
  it('без completed_at берётся дата старта', () => {
    const w = mount(CompletedFeed, { props: { items: [ch('a', { completed_at: null, start_date: '2026-08-03' })], entriesFor: () => [] } })
    expect(w.find('[data-testid="feed-date"]').text()).toBe('03.08.2026')
  })
})
