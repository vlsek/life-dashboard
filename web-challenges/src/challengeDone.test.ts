import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import { doneSummary, ladderStep } from './lib/challengeDone'
import ChallengeDoneModal from './components/ChallengeDoneModal.vue'
import type { Challenge, ChallengeEntry } from './lib/types'

// BACKLOG 642: поздравление с завершением челленджа. Награды идут через лесенку достижений «Челленджи» (1/5/10/25).
const ch = (over: Partial<Challenge> = {}): Challenge => ({
  id: 'c1', user_id: 'u', template_id: null, title: 'Отжимания', icon: '💪', type: 'daily_fixed', unit: 'раз', start_date: '2026-09-01',
  duration_days: 3, daily_target: 10, start_value: null, daily_increment: null, target_count: null, item_label: null,
  active: true, completed: false, completed_at: null, created_at: '2026-09-01T00:00:00Z', ...over,
})
const entry = (date: string, value: number): ChallengeEntry => ({ id: date, user_id: 'u', challenge_id: 'c1', date, value, note: null, created_at: '' })

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

describe('ladderStep / шаги лесенки совпадают с достижениями', () => {
  it('шаги 1/5/10/25 — достижение открылось, остальные числа — нет', () => {
    expect([1, 5, 10, 25].map(ladderStep)).toEqual([1, 5, 10, 25])
    for (const n of [0, 2, 3, 4, 6, 9, 11, 24, 26]) expect(ladderStep(n)).toBeNull()
  })
  it('страж: шаги лесенки челленджей в web-achievements те же', () => {
    const src: string = readFileSync('../web-achievements/src/lib/achievements.ts', 'utf-8')
    expect(src).toContain("key: 'challenges_1'")
    expect(src).toContain("key: 'challenges_5'")
    expect(src).toContain("'challengesDone', 'challenges', [10, 25]")
  })
})

describe('doneSummary', () => {
  it('дневной: сколько дней выполнено из скольких', () => {
    const s = doneSummary(ch(), [entry('2026-09-01', 10), entry('2026-09-02', 4), entry('2026-09-03', 12)], '2026-09-04')
    expect(s).toEqual({ kind: 'days', done: 2, total: 3 })
  })
  it('накопительный: собрано из цели с подписью предмета', () => {
    const c = ch({ type: 'cumulative_count', duration_days: null, daily_target: null, target_count: 12, item_label: 'книг' })
    expect(doneSummary(c, [entry('2026-09-02', 5), entry('2026-09-03', 7)], '2026-09-10')).toEqual({ kind: 'count', count: 12, target: 12, itemWord: 'книг' })
  })
})

describe('ChallengeDoneModal', () => {
  const summary = { kind: 'days', done: 2, total: 3 } as const
  it('обычное завершение: итог и номер по счёту, без сообщения о достижении', () => {
    const w = mount(ChallengeDoneModal, { props: { challenge: ch(), summary, doneCount: 3 } })
    expect(w.find('[data-test="done-title"]').text()).toContain('Отжимания')
    expect(w.find('[data-test="done-summary"]').text()).toBe('Выполнено дней: 2 из 3')
    expect(w.find('[data-test="done-nth"]').text()).toBe('Это ваш завершённый челлендж номер 3.')
    expect(w.find('[data-test="done-achievement"]').exists()).toBe(false)
  })
  it('шаг лесенки (1-й, 5-й, 10-й, 25-й): сообщение об открытом достижении и ссылка на «Достижения»', () => {
    const titles: Record<number, string> = { 1: 'Челлендж пройден', 5: 'Коллекционер челленджей', 10: 'Десять вызовов', 25: 'Неудержимый' }
    for (const n of [1, 5, 10, 25]) {
      const w = mount(ChallengeDoneModal, { props: { challenge: ch(), summary, doneCount: n } })
      const a = w.find('[data-test="done-achievement"]')
      expect(a.exists()).toBe(true)
      expect(a.text()).toContain(titles[n])
      expect(w.find('[data-test="done-achievements-link"]').attributes('href')).toBe('/achievements/')
    }
  })
  it('накопительный итог и английский язык', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ChallengeDoneModal, { props: { challenge: ch(), summary: { kind: 'count', count: 12, target: 12, itemWord: 'books' }, doneCount: 1 } })
    expect(w.find('[data-test="done-summary"]').text()).toBe('Collected: 12 of 12 books')
    expect(w.find('[data-test="done-achievement"]').text()).toContain('Challenge complete')
  })
  it('кнопка и клик по фону закрывают окно', async () => {
    const w = mount(ChallengeDoneModal, { props: { challenge: ch(), summary, doneCount: 2 } })
    await w.find('[data-test="done-close"]').trigger('click')
    await w.find('.modal-backdrop').trigger('click')
    expect(w.emitted('close')).toHaveLength(2)
  })
  it('анимация гасится: reduced-motion и data-motion=off', () => {
    const css: string = readFileSync('src/style.css', 'utf-8')
    expect(css).toContain('.cd-trophy, .cd-ring { animation: none; }')
    expect(css).toContain("html[data-motion='off'] .cd-trophy")
  })
})

// --- страница: окно после подтверждённой записи, при ошибке — сообщение без окна
const h = vi.hoisted(() => ({ fail: false, done: 1, items: null as any, confirm: vi.fn() }))
vi.mock('./lib/confirmDialog', () => ({ confirmDialog: (...a: unknown[]) => h.confirm(...a), confirmState: { value: null } }))
vi.mock('./lib/useChallenges', () => ({
  useChallenges: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    instances: h.items,
    entriesByChallenge: ref({}),
    metrics: ref([]),
    exercises: ref([]),
    error: ref(null),
    effectiveEntries: () => [],
    sourceMetricName: () => null,
    sourceExerciseName: () => null,
    init: () => {},
    startFromTemplate: vi.fn(), startCustom: vi.fn(), updateChallenge: vi.fn(), upsertDailyEntry: vi.fn(), addCumulativeEntry: vi.fn(), deleteEntry: vi.fn(), abandonChallenge: vi.fn(),
    markCompleted: vi.fn(async () => {
      if (h.fail) throw new Error('boom')
      return h.done
    }),
  }),
}))
import App from './App.vue'

describe('страница челленджей: завершение', () => {
  beforeEach(() => {
    h.fail = false
    h.done = 1
    h.confirm.mockReset()
    h.items = ref([ch({ start_date: '2026-01-01', duration_days: 3 })]) // давно закончился — кнопка «Отметить завершённым» есть
  })
  it('успех — открывается поздравление с номером по счёту', async () => {
    h.done = 5
    const w = mount(App)
    await flushPromises()
    const btn = w.findAll('button').find((b) => /Отметить завершённым/.test(b.text()))!
    await btn.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="challenge-done"]').exists()).toBe(true)
    expect(w.find('[data-test="done-nth"]').text()).toContain('5')
    expect(w.find('[data-test="done-achievement"]').exists()).toBe(true)
  })
  it('ошибка записи — окна нет, человеку сообщают об ошибке', async () => {
    h.fail = true
    const w = mount(App)
    await flushPromises()
    await w.findAll('button').find((b) => /Отметить завершённым/.test(b.text()))!.trigger('click')
    await flushPromises()
    expect(w.find('[data-test="challenge-done"]').exists()).toBe(false)
    expect(h.confirm).toHaveBeenCalledWith('Не удалось отметить челлендж завершённым. Попробуйте ещё раз.', { infoOnly: true })
  })
})
