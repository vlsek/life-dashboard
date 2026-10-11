import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { BG_MSG_DONE, BG_MSG_NEW, isBgMode } from './lib/bgMode'

// BACKLOG 52.1 срез 2: фоновая страница «Достижения» сообщает родителю (шапке), что открыто сейчас.
const state = {
  states: ref<unknown[]>([]),
  hiddenStates: ref<unknown[]>([]),
  newlyUnlocked: ref<string[]>([]),
  error: ref<string | null>(null),
  loading: ref(true),
  init: vi.fn(),
}
vi.mock('./lib/useAchievements', () => ({ useAchievements: () => state }))

describe('isBgMode', () => {
  it('нужен и ?bg=1, и iframe', () => {
    expect(isBgMode()).toBe(false) // не iframe
  })
})

describe('BgApp', () => {
  beforeEach(() => {
    state.states.value = [{ def: { key: 'first_goal', group: 'first', icon: 'x', target: 1 } }]
    state.hiddenStates.value = []
    state.newlyUnlocked.value = []
    state.error.value = null
    state.loading.value = true
  })

  it('новое → сообщение с названием, затем «готово»; нового нет → только «готово»', async () => {
    const BgApp = (await import('./BgApp.vue')).default
    const spy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    const w = mount(BgApp)
    state.newlyUnlocked.value = ['first_goal']
    state.loading.value = false
    await flushPromises()
    const types = spy.mock.calls.map((c) => (c[0] as { type: string }).type)
    expect(types).toEqual([BG_MSG_NEW, BG_MSG_DONE])
    const items = (spy.mock.calls[0][0] as { items: { key: string; title: string }[] }).items
    expect(items[0].key).toBe('first_goal')
    expect(items[0].title.length).toBeGreaterThan(2)
    w.unmount()

    spy.mockClear()
    state.loading.value = true
    state.newlyUnlocked.value = []
    const w2 = mount(BgApp)
    state.loading.value = false
    await flushPromises()
    expect(spy.mock.calls.map((c) => (c[0] as { type: string }).type)).toEqual([BG_MSG_DONE])
    w2.unmount()
  })

  it('ошибка загрузки: поздравления нет', async () => {
    const BgApp = (await import('./BgApp.vue')).default
    const spy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    state.loading.value = true
    mount(BgApp)
    state.newlyUnlocked.value = ['first_goal']
    state.error.value = 'x'
    state.loading.value = false
    await flushPromises()
    expect(spy.mock.calls.map((c) => (c[0] as { type: string }).type)).toEqual([BG_MSG_DONE])
  })
})
