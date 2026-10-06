import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

// BACKLOG 784/819, срез 4: галочка «сохранено» в блоке «Планы» после ПОДТВЕРЖДЁННОЙ записи (план или отметка цели).
const h = vi.hoisted(() => ({ upsertError: null as null | { message: string }, goalError: null as null | { message: string }, goalsData: [] as any[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: table === 'goals' ? h.goalsData : [], error: null }).then(res),
        upsert: () => Promise.resolve({ error: h.upsertError }),
        update: () => ({ eq: () => Promise.resolve({ error: h.goalError }) }),
      }
      return chain
    },
  },
}))
import { usePlanned } from './lib/usePlanned'
import PlannedSection from './components/PlannedSection.vue'

function setup() {
  let api!: ReturnType<typeof usePlanned>
  const wrapper = mount(defineComponent({ setup: () => ((api = usePlanned()), () => null) }))
  return { api, wrapper }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  localStorage.setItem('site_lang', 'ru')
  h.upsertError = null
  h.goalError = null
  h.goalsData = []
})
afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('usePlanned.savedTick', () => {
  it('запись плана подтвердилась — галочка на ~0,9 с, потом гаснет', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-06')
    expect(api.savedTick.value).toBe(false)
    await api.addCustomItem('Позвонить')
    expect(api.savedTick.value).toBe(true)
    vi.advanceTimersByTime(950)
    expect(api.savedTick.value).toBe(false)
    wrapper.unmount()
  })
  it('ошибка записи плана — галочки НЕТ', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-06')
    h.upsertError = { message: 'boom' }
    await api.addCustomItem('Позвонить')
    expect(api.savedTick.value).toBe(false)
    wrapper.unmount()
  })
  it('отметка цели из плана: успех — галочка, ошибка — нет', async () => {
    h.goalsData = [{ id: 'g1', name: 'Бег', stages: null, done: false, current_stage: null, done_date: null }]
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-06')
    const goal = api.goals.value[0]
    h.goalError = { message: 'boom' }
    expect(await api.setGoalDone(goal, true, '2026-10-06')).toBe(false)
    expect(api.savedTick.value).toBe(false)
    h.goalError = null
    expect(await api.setGoalDone(goal, true, '2026-10-06')).toBe(true)
    expect(api.savedTick.value).toBe(true)
    wrapper.unmount()
  })
  it('подряд две записи продлевают одну галочку, а не мигают двумя', async () => {
    const { api, wrapper } = setup()
    await api.load('u1', '2026-10-06')
    await api.addCustomItem('A')
    vi.advanceTimersByTime(600)
    await api.addCustomItem('B')
    vi.advanceTimersByTime(600)
    expect(api.savedTick.value).toBe(true) // таймер перезапущен второй записью
    vi.advanceTimersByTime(400)
    expect(api.savedTick.value).toBe(false)
    wrapper.unmount()
  })
})

describe('PlannedSection: галочка в карточке плана', () => {
  let w: VueWrapper | null = null
  afterEach(() => {
    w?.unmount()
    w = null
  })
  it('нет записи — нет галочки; после добавления пункта она в карточке плана', async () => {
    w = mount(PlannedSection, { props: { userId: 'u1' }, attachTo: document.body })
    await flushPromises()
    expect(document.body.querySelector('[data-test="saved-tick"]')).toBeNull()
    const input = document.body.querySelector<HTMLInputElement>('input[type="text"]')!
    input.value = 'Новый пункт'
    input.dispatchEvent(new Event('input'))
    document.body.querySelector<HTMLElement>('[data-test="add-custom"]')!.click()
    await flushPromises()
    const tick = document.body.querySelector('[data-test="planned"] .card [data-test="saved-tick"]')
    expect(tick).not.toBeNull()
    vi.advanceTimersByTime(950)
    await flushPromises()
    expect(document.body.querySelector('[data-test="saved-tick"]')).toBeNull()
  })
})
