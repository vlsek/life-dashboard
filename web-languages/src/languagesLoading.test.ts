import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 74.3/73.5 (срез 4): в «Языках» «Нечего учить» не мелькает, пока слова грузятся, а ошибка загрузки подписана «Не удалось загрузить»
// (раньше — «Не удалось сохранить») и имеет кнопку «Повторить».
const state = vi.hoisted(() => ({ words: null as unknown as { value: unknown[] }, loaded: null as unknown as { value: boolean }, error: null as unknown as { value: string | null }, reload: null as unknown as ReturnType<typeof vi.fn> }))
vi.mock('./lib/useVocab', () => ({
  useVocab: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }), words: state.words, error: state.error, loaded: state.loaded,
    addWord: vi.fn(), editWord: vi.fn(), deleteWord: vi.fn(), toggleLearned: vi.fn(), reload: state.reload,
  }),
}))
import App from './App.vue'
import { t } from './lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  state.words = ref([])
  state.loaded = ref(false)
  state.error = ref(null)
  state.reload = vi.fn(async () => { state.error.value = null })
})

describe('Языки: загрузка, пустота и ошибка', () => {
  it('пока слова грузятся — «Загрузка…», а не «Нечего учить» / «Пока ничего не выучено»', () => {
    const w = mount(App)
    expect(w.find('[data-testid="loading-activeWords"]').text()).toBe('Загрузка…')
    expect(w.text()).not.toContain(t('eng_nothing_to_learn'))
    w.unmount()
  })

  it('слов правда нет — пустота показывается после загрузки', async () => {
    const w = mount(App)
    state.loaded.value = true
    await w.vm.$nextTick()
    expect(w.find('[data-testid="loading-activeWords"]').exists()).toBe(false)
    expect(w.text()).toContain(t('eng_nothing_to_learn'))
    w.unmount()
  })

  it('ошибка загрузки: понятный заголовок «загрузить» (не «сохранить») и «Повторить», который перезагружает слова', async () => {
    state.error.value = 'Нет связи с сервером.'
    state.loaded.value = true
    const w = mount(App)
    const box = w.find('[data-testid="load-error"]')
    expect(box.exists()).toBe(true)
    expect(box.text()).toContain('Не удалось загрузить: Нет связи с сервером.')
    expect(box.text()).not.toContain('сохранить')
    await w.find('[data-testid="load-retry"]').trigger('click')
    expect(state.reload).toHaveBeenCalledTimes(1)
    await w.vm.$nextTick()
    expect(w.find('[data-testid="load-error"]').exists()).toBe(false)
    w.unmount()
  })
})
