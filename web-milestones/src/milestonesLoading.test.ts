import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 74.3/73.5 срез 3b: «Нет активных вех» нельзя показывать, пока вехи ещё грузятся.
const state = vi.hoisted(() => ({ items: null as unknown as { value: unknown[] }, loaded: null as unknown as { value: boolean } }))
vi.mock('./lib/useMilestones', () => ({
  useMilestones: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }), items: state.items, error: ref(null), loaded: state.loaded,
    init: () => {}, reload: async () => {}, addMilestone: vi.fn(), updateMilestone: vi.fn(), markDone: vi.fn(), deleteMilestone: vi.fn(),
  }),
}))
import App from './App.vue'
import { t } from './lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  state.items = ref([])
  state.loaded = ref(false)
})

describe('Вехи: загрузка и пустота', () => {
  it('пока грузятся — «Загрузка…», а не «Нет активных вех»', () => {
    const w = mount(App)
    expect(w.find('[data-testid="loading-active"]').text()).toBe('Загрузка…')
    expect(w.text()).not.toContain(t('ms_no_active'))
    w.unmount()
  })
  it('загрузились и вех нет — пустота показывается', async () => {
    const w = mount(App)
    state.loaded.value = true
    await w.vm.$nextTick()
    expect(w.find('[data-testid="loading-active"]').exists()).toBe(false)
    expect(w.text()).toContain(t('ms_no_active'))
    w.unmount()
  })
})
