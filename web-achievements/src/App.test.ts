import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { ACHIEVEMENTS, BASELINE_KEY, evaluate, type Counters } from './lib/achievements'

vi.mock('./lib/supabase', () => ({ logout: vi.fn(), sb: {} }))

const ZERO: Counters = { streakBest: 0, pointsTotal: 0, metricDone: 0, weightEntries: 0, goalsDone: 0, skillsMastered: 0, booksDone: 0, workoutDays: 0, challengesDone: 0, megaWeeks: 0, wordsAdded: 0, wordsLearned: 0 }

const hold = {
  auth: ref<unknown>({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
  states: ref(evaluate(ZERO)),
  unlocked: ref<Record<string, string | null>>({}),
  newlyUnlocked: ref<string[]>([]),
  mode: ref<'db' | 'local'>('db'),
  error: ref<string | null>(null),
  loading: ref(false),
}
vi.mock('./lib/useAchievements', () => ({ useAchievements: () => ({ ...hold, init: vi.fn(), reload: vi.fn(), counters: ref(null) }) }))

beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  hold.auth.value = { status: 'ready', userId: 'u', userEmail: 'a@b.c' }
  hold.states.value = evaluate(ZERO)
  hold.unlocked.value = {}
  hold.newlyUnlocked.value = []
  hold.mode.value = 'db'
  hold.error.value = null
  hold.loading.value = false
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})

async function mountApp() {
  const { default: App } = await import('./App.vue')
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  return w
}

describe('страница «Достижения»', () => {
  it('рисует все достижения реестра сгруппированно, счётчик «0 / 20», без записи про устройство при работе с таблицей', async () => {
    const w = await mountApp()
    expect(w.findAll('[data-testid="achievement-card"]').length).toBe(ACHIEVEMENTS.length)
    expect(w.find('[data-testid="achievements-count"]').text()).toBe(`0 / ${ACHIEVEMENTS.length}`)
    expect(w.findAll('section[data-group]').length).toBe(10)
    expect(w.find('[data-testid="achievements-local-note"]').exists()).toBe(false)
    w.unmount()
  })

  it('открытые считаются по хранилищу и отмечены цветными; служебная запись _baseline не считается', async () => {
    hold.states.value = evaluate({ ...ZERO, goalsDone: 1, booksDone: 1 })
    hold.unlocked.value = { [BASELINE_KEY]: '2026-10-05T10:00:00.000Z', first_goal: null, first_book: '2026-10-05T10:00:00.000Z' }
    const w = await mountApp()
    expect(w.find('[data-testid="achievements-count"]').text()).toBe(`2 / ${ACHIEVEMENTS.length}`)
    expect(w.findAll('[data-state="unlocked"]').map((c) => c.attributes('data-key')).sort()).toEqual(['first_book', 'first_goal'])
    w.unmount()
  })

  it('без миграции (режим устройства) показывается подсказка про миграцию 039', async () => {
    hold.mode.value = 'local'
    const w = await mountApp()
    expect(w.find('[data-testid="achievements-local-note"]').text()).toContain('039')
    w.unmount()
  })

  it('ошибка загрузки показывается вместо списка', async () => {
    hold.error.value = 'boom'
    const w = await mountApp()
    expect(w.text()).toContain('boom')
    expect(w.findAll('[data-testid="achievement-card"]').length).toBe(0)
    w.unmount()
  })

  it('пока идёт вход, показывается только «…»', async () => {
    hold.auth.value = { status: 'loading' }
    const w = await mountApp()
    expect(w.findAll('[data-testid="achievement-card"]').length).toBe(0)
    w.unmount()
  })

  it('поздравление не показывается, если нового нет (в том числе при первом заходе, когда всё открывается задним числом)', async () => {
    hold.states.value = evaluate({ ...ZERO, goalsDone: 1 })
    hold.unlocked.value = { [BASELINE_KEY]: 'x', first_goal: null }
    const w = await mountApp()
    expect(w.find('[data-testid="achievement-unlocked"]').exists()).toBe(false)
    w.unmount()
  })

  it('новое открытое достижение показывается окном-поздравлением; после закрытия окно пропадает', async () => {
    hold.states.value = evaluate({ ...ZERO, goalsDone: 1, workoutDays: 1 })
    hold.unlocked.value = { [BASELINE_KEY]: 'x', first_goal: null, first_workout: '2026-10-05T10:00:00.000Z' }
    hold.newlyUnlocked.value = ['first_workout']
    const w = await mountApp()
    expect(w.find('[data-testid="achievement-unlocked"]').exists()).toBe(true)
    expect(w.find('[data-testid="unlocked-name"]').text()).toBe('Первая тренировка')
    expect(w.find('[data-testid="unlocked-counter"]').exists()).toBe(false)
    await w.find('[data-testid="unlocked-next"]').trigger('click')
    expect(w.find('[data-testid="achievement-unlocked"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="achievement-card"]').length).toBe(ACHIEVEMENTS.length) // страница на месте
    w.unmount()
  })

  it('при ошибке загрузки поздравления нет', async () => {
    hold.states.value = evaluate({ ...ZERO, goalsDone: 1 })
    hold.newlyUnlocked.value = ['first_goal']
    hold.error.value = 'boom'
    const w = await mountApp()
    expect(w.find('[data-testid="achievement-unlocked"]').exists()).toBe(false)
    w.unmount()
  })
})
