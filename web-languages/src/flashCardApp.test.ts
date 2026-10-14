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
