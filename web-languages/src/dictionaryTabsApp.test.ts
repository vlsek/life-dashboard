import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({
  words: [] as { id: string; user_id: string; word: string; translation: string | null; example: string | null; lang: string | null; learned: boolean; created_at: string }[],
}))

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain = {
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

const w1 = (id: string, word: string, lang: string | null, learned = false) => ({
  id, user_id: 'u1', word, translation: null, example: null, lang, learned, created_at: '2026-09-30',
})

async function mountApp() {
  const wrapper = mount(App)
  await flushPromises()
  return wrapper
}

describe('Languages page: dictionary tabs', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'en')
    h.words = [w1('1', 'apple', 'en'), w1('2', 'Haus', 'de'), w1('3', 'Baum', 'de'), w1('4', 'Tür', 'de', true)]
  })
  afterEach(() => localStorage.clear())

  it('shows a tab per language with counts and filters the word list when a tab is opened', async () => {
    const w = await mountApp()
    expect(w.find('[data-test="tab-de"]').text()).toContain('Deutsch · 3')
    expect(w.find('[data-test="tab-en"]').text()).toContain('English · 1')
    expect(w.text()).toContain('apple')
    await w.find('[data-test="tab-de"]').trigger('click')
    expect(w.text()).toContain('Haus')
    expect(w.text()).not.toContain('apple')
    expect(localStorage.getItem('vocab_lang_filter')).toBe('de')
    w.unmount()
  })

  it('remembers the tab order so it does not jump', async () => {
    const w = await mountApp()
    expect(JSON.parse(localStorage.getItem('vocab_tabs') || '[]')).toEqual(['de', 'en'])
    w.unmount()
  })

  it('creates an empty dictionary, opens it, shows the empty hint, and can remove it again', async () => {
    const w = await mountApp()
    await w.find('[data-test="tab-add"]').trigger('click')
    await w.find('[data-test="tab-picker-select"]').setValue('fr')
    await w.find('[data-test="tab-picker"]').trigger('submit.prevent')
    await flushPromises()
    expect(w.find('[data-test="tab-fr"]').attributes('aria-selected')).toBe('true')
    expect(w.find('[data-test="dictionary-empty"]').exists()).toBe(true)
    expect(JSON.parse(localStorage.getItem('vocab_tabs') || '[]')).toContain('fr')
    await w.find('[data-test="tab-remove"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="tab-fr"]').exists()).toBe(false)
    expect(JSON.parse(localStorage.getItem('vocab_tabs') || '[]')).not.toContain('fr')
    w.unmount()
  })

  it('a dictionary with words cannot be removed by accident', async () => {
    const w = await mountApp()
    await w.find('[data-test="tab-de"]').trigger('click')
    expect(w.find('[data-test="tab-remove"]').exists()).toBe(false)
    w.unmount()
  })

  it('a user with only one language sees that single dictionary as the open tab, without an "All" tab', async () => {
    h.words = [w1('1', 'apple', 'en')]
    const w = await mountApp()
    expect(w.find('[data-test="tab-all"]').exists()).toBe(false)
    expect(w.find('[data-test="tab-en"]').attributes('aria-selected')).toBe('true')
    w.unmount()
  })
})
