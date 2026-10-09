import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressionTrees from './ProgressionTrees.vue'
import type { Exercise, WorkoutEntry } from '../lib/types'

const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: false, value_label: null, unit: null, suggested_scheme: null, created_at: '' }) as Exercise
const en = (exercise_id: string, date: string, reps: number[]): WorkoutEntry =>
  ({ id: exercise_id + date, user_id: 'u', exercise_id, date, sets: reps.map((r) => ({ reps: r, weight: null, time: null, duration: null, side: null })), notes: null }) as WorkoutEntry
const TODAY = '2026-09-30'

async function openTrees(entries: WorkoutEntry[], exercises: Exercise[]) {
  const w = mount(ProgressionTrees, { props: { entries, exercises, today: TODAY } })
  // состояние «раскрыт» хранится в localStorage и может пережить прошлый mount в этом же тесте
  if (!w.find('[data-testid="progressions-body"]').exists()) await w.find('[data-testid="progressions-toggle"]').trigger('click')
  return w
}
const step = (w: ReturnType<typeof mount>, id: string) => w.find(`[data-step="${id}"]`)

describe('ProgressionTrees', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('по умолчанию свёрнут; раскрытие запоминается', async () => {
    const w = mount(ProgressionTrees, { props: { entries: [], exercises: [], today: TODAY } })
    expect(w.find('[data-testid="progressions-body"]').exists()).toBe(false)
    await w.find('[data-testid="progressions-toggle"]').trigger('click')
    expect(w.find('[data-testid="progressions-body"]').exists()).toBe(true)
    expect(localStorage.getItem('workouts_progressions_open')).toBe('1')
    const w2 = mount(ProgressionTrees, { props: { entries: [], exercises: [], today: TODAY } })
    expect(w2.find('[data-testid="progressions-body"]').exists()).toBe(true)
  })

  it('без упражнений: первая ступень каждой цепочки текущая, счётчик 0/N, подсказка добавить упражнение', async () => {
    const w = await openTrees([], [])
    expect(w.findAll('[data-chain]').length).toBeGreaterThanOrEqual(5)
    expect(step(w, 'pushup_knees').attributes('data-status')).toBe('current')
    expect(step(w, 'pushup_regular').attributes('data-status')).toBe('locked')
    expect(w.find('[data-chain="pushups"] [data-testid="chain-count"]').text()).toBe('0/5')
    expect(step(w, 'pushup_knees').find('[data-testid="step-no-ex"]').text()).toContain('Отжимания с колен')
  })

  it('пройденная ступень отмечена, следующая становится текущей, счётчик растёт', async () => {
    const w = await openTrees([en('k', '2026-09-20', [16]), en('r', '2026-09-21', [12])], [ex('k', 'Отжимания с колен'), ex('r', 'Отжимания')])
    expect(step(w, 'pushup_knees').attributes('data-status')).toBe('done')
    expect(step(w, 'pushup_regular').attributes('data-status')).toBe('current')
    expect(step(w, 'pushup_regular').text()).toContain('12 / 30')
    expect(w.find('[data-chain="pushups"] [data-testid="chain-count"]').text()).toBe('1/5')
  })

  it('полоска прогресса пропорциональна лучшему подходу и не превышает 100%', async () => {
    const w = await openTrees([en('r', '2026-09-21', [15])], [ex('r', 'Отжимания')])
    // ступень с колен ещё не пройдена и остаётся текущей, а «Обычные» — progress с 15/30 = 50%
    const bar = step(w, 'pushup_regular').find('[data-testid="step-bar"]')
    expect((bar.element as HTMLElement).style.width).toBe('50%')
  })

  it('кнопка «Добавить запись» есть только у текущей ступени и отдаёт подходящее упражнение', async () => {
    const pushups = ex('r', 'Отжимания')
    const w = await openTrees([], [pushups])
    // текущая — «с колен» (упражнения под неё нет), «Обычные» закрыты: кнопки нет нигде
    expect(step(w, 'pushup_regular').find('[data-testid="step-add-entry"]').exists()).toBe(false)
    const w2 = await openTrees([en('k', '2026-09-20', [20])], [ex('k', 'Отжимания с колен'), pushups])
    expect(step(w2, 'pushup_regular').attributes('data-status')).toBe('current')
    await step(w2, 'pushup_regular').find('[data-testid="step-add-entry"]').trigger('click')
    expect(w2.emitted('add-entry')?.[0]).toEqual([pushups])
  })

  it('английский язык: названия ступеней и подписи на английском', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = await openTrees([], [])
    expect(step(w, 'pushup_diamond').text()).toContain('Diamond push-ups')
    expect(step(w, 'pushup_diamond').text()).toContain('goal 15 reps')
  })
})

describe('ProgressionTrees: ступени на время', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('планка: цель и лучший подход подписаны «сек», у отжиманий остаётся «повт.»', async () => {
    localStorage.setItem('site_lang', 'ru')
    const w = await openTrees([en('e1', '2026-09-20', [20])], [ex('e1', 'Планка на коленях'), ex('e2', 'Отжимания с колен')])
    const knee = step(w, 'plank_knees')
    expect(knee.attributes('data-status')).toBe('current')
    expect(knee.text()).toContain('цель 30 сек')
    expect(knee.text()).toContain('20 / 30 сек')
    expect(step(w, 'pushup_knees').text()).toContain('цель 15 повт.')
    expect(w.find('[data-chain="plank"] [data-testid="chain-count"]').text()).toBe('0/4')
  })

  it('пройденная ступень планки: счётчик цепочки растёт до 1/4', async () => {
    localStorage.setItem('site_lang', 'ru')
    const w = await openTrees([en('e1', '2026-09-20', [45])], [ex('e1', 'Планка на коленях')])
    expect(step(w, 'plank_knees').attributes('data-status')).toBe('done')
    expect(w.find('[data-chain="plank"] [data-testid="chain-count"]').text()).toBe('1/4')
  })

  it('EN: подпись «sec»', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = await openTrees([], [])
    expect(step(w, 'plank_regular').text()).toContain('goal 60 sec')
  })
})

describe('ProgressionTrees: визуальное дерево', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('у каждой ступени есть узел, линий на одну меньше, чем ступеней', async () => {
    const w = await openTrees([], [])
    const chain = w.find('[data-chain="pushups"]')
    expect(chain.findAll('[data-testid="step-node"]').length).toBe(5)
    expect(chain.findAll('[data-testid="step-link"]').length).toBe(4)
  })

  it('узел и линия отражают статус: пройдено → линия к текущей «next», дальше «closed»', async () => {
    const w = await openTrees([en('k', '2026-09-20', [16])], [ex('k', 'Отжимания с колен')])
    const links = w.findAll('[data-chain="pushups"] [data-testid="step-link"]').map((l) => l.attributes('data-link'))
    expect(links).toEqual(['next', 'closed', 'closed', 'closed'])
    expect(step(w, 'pushup_knees').find('[data-testid="step-node"]').attributes('data-status')).toBe('done')
    expect(step(w, 'pushup_regular').find('[data-testid="step-node"]').attributes('data-status')).toBe('current')
  })

  it('две пройденные подряд ступени соединены линией «open»', async () => {
    const w = await openTrees([en('k', '2026-09-20', [16]), en('r', '2026-09-21', [30])], [ex('k', 'Отжимания с колен'), ex('r', 'Отжимания')])
    expect(w.findAll('[data-chain="pushups"] [data-testid="step-link"]')[0].attributes('data-link')).toBe('open')
  })
})
