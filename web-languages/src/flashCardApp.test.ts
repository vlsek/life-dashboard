import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({ words: [] as Record<string, unknown>[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: async () => ({ data: h.words, error: null }),
        maybeSingle: async () => ({ data: table === 'profiles' ? { onboarded: true } : null }),
        insert: async () => ({ error: null }),
        update: () => chain,
        delete: () => chain,
      }
      return chain
    },
  },
}))
import App from './App.vue'

const word = (id: string, w: string, learned = false) => ({ id, user_id: 'u1', word: w, translation: 'перевод ' + w, example: null, lang: 'en', learned, created_at: '2026-09-30' })
beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('Языки: карточка «Повторение» на странице', () => {
  it('показывает только невыученные слова', async () => {
    h.words = [word('1', 'known', true), word('2', 'unknown')]
    const w = mount(App)
    await flushPromises()
    expect(w.get('[data-test="fc-word"]').text()).toBe('unknown')
    expect(w.get('[data-test="fc-position"]').text()).toBe('1/1')
  })
  it('нет невыученных слов — карточки нет', async () => {
    h.words = [word('1', 'known', true)]
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="flashcard"]').exists()).toBe(false)
  })
})

describe('Языки: режимы тренировки (77.7)', () => {
  it('переключатель режимов: по умолчанию карточки, «Выбор» и «Ввод» показывают тренировку вместо карточки, «Карточки» возвращает', async () => {
    h.words = [word('1', 'one'), word('2', 'two'), word('3', 'three')]
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="flashcard"]').exists()).toBe(true)
    expect(w.find('[data-test="quiz"]').exists()).toBe(false)
    await w.get('[data-test="practice-mode-choice"]').trigger('click')
    expect(w.find('[data-test="flashcard"]').exists()).toBe(false)
    expect(w.findAll('[data-test="quiz-option"]').length).toBeGreaterThan(1)
    await w.get('[data-test="practice-mode-type"]').trigger('click')
    expect(w.find('[data-test="quiz-input"]').exists()).toBe(true)
    await w.get('[data-test="practice-mode-cards"]').trigger('click')
    expect(w.find('[data-test="flashcard"]').exists()).toBe(true)
  })
  it('нет невыученных слов — переключателя нет', async () => {
    h.words = [word('1', 'known', true)]
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="practice-modes"]').exists()).toBe(false)
  })
})
