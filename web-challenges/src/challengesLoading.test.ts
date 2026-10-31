import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 74.3/73.5 срез 3b: «Нет активных челленджей» нельзя показывать, пока челленджи ещё грузятся.
const state = vi.hoisted(() => ({ loaded: null as unknown as { value: boolean } }))
vi.mock('./lib/useChallenges', () => ({
  useChallenges: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }), instances: ref([]), entriesByChallenge: ref({}), metrics: ref([]), effectiveEntries: () => [],
    sourceMetricName: () => '', exercises: ref([]), sourceExerciseName: () => '', error: ref(null), loaded: state.loaded,
    init: () => {}, reload: async () => {}, startFromTemplate: vi.fn(), startCustom: vi.fn(), updateChallenge: vi.fn(), upsertDailyEntry: vi.fn(),
    addCumulativeEntry: vi.fn(), deleteEntry: vi.fn(), markCompleted: vi.fn(), abandonChallenge: vi.fn(),
  }),
}))
import App from './App.vue'
import { t } from './lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  state.loaded = ref(false)
})

describe('Челленджи: загрузка и пустота', () => {
  it('пока грузятся — «Загрузка…», а не «Нет активных челленджей»', () => {
    const w = mount(App)
    expect(w.find('[data-testid="loading-active"]').text()).toBe('Загрузка…')
    expect(w.text()).not.toContain(t('ch_no_active'))
    w.unmount()
  })
  it('загрузились и челленджей нет — пустота показывается', async () => {
    const w = mount(App)
    state.loaded.value = true
    await w.vm.$nextTick()
    expect(w.find('[data-testid="loading-active"]').exists()).toBe(false)
    expect(w.text()).toContain(t('ch_no_active'))
    w.unmount()
  })
})
