import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG 74.3/73.5 срез 3b: «Нет активных навыков» и «Список книг пуст» не мелькают, пока навыки и книги ещё грузятся (у каждого списка свой флаг).
const state = vi.hoisted(() => ({ skills: null as unknown as { value: unknown[] }, books: null as unknown as { value: unknown[] }, skillsLoaded: null as unknown as { value: boolean }, booksLoaded: null as unknown as { value: boolean } }))
vi.mock('./lib/useSkills', () => ({
  useSkills: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }), items: state.skills, error: ref(null), loaded: state.skillsLoaded,
    init: () => {}, reload: async () => {}, addSkill: vi.fn(), updateSkill: vi.fn(), deleteSkill: vi.fn(), bumpProgress: vi.fn(), toggleMastered: vi.fn(),
  }),
}))
vi.mock('./lib/useBooks', () => ({
  useBooks: () => ({ items: state.books, error: ref(null), loaded: state.booksLoaded, load: async () => {}, reload: async () => {}, addBook: vi.fn(), updateBook: vi.fn(), deleteBook: vi.fn(), toggleDone: vi.fn() }),
}))
import App from './App.vue'
import { t } from './lib/i18n'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  state.skills = ref([])
  state.books = ref([])
  state.skillsLoaded = ref(false)
  state.booksLoaded = ref(false)
})

describe('Навыки и книги: загрузка и пустота', () => {
  it('пока всё грузится — «Загрузка…» вместо «нет активных навыков» и «список книг пуст»', () => {
    const w = mount(App)
    expect(w.find('[data-testid="loading-active"]').text()).toBe('Загрузка…')
    expect(w.find('[data-testid="loading-activeBooks"]').text()).toBe('Загрузка…')
    expect(w.text()).not.toContain(t('skills_none_active'))
    expect(w.text()).not.toContain(t('skills_book_list_empty'))
    w.unmount()
  })
  it('у навыков и книг флаги независимы: навыки пришли, книги ещё нет', async () => {
    const w = mount(App)
    state.skillsLoaded.value = true
    await w.vm.$nextTick()
    expect(w.find('[data-testid="loading-active"]').exists()).toBe(false)
    expect(w.text()).toContain(t('skills_none_active'))
    expect(w.find('[data-testid="loading-activeBooks"]').exists()).toBe(true)
    expect(w.text()).not.toContain(t('skills_book_list_empty'))
    state.booksLoaded.value = true
    await w.vm.$nextTick()
    expect(w.text()).toContain(t('skills_book_list_empty'))
    w.unmount()
  })
})
