import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const h = vi.hoisted(() => ({
  words: [] as { id: string; user_id: string; word: string; translation: string | null; example: string | null; lang: string | null; learned: boolean; created_at: string }[],
  inserted: [] as Record<string, unknown>[],
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
        insert: async (row: Record<string, unknown>) => {
          h.inserted.push(row)
          return { error: null }
        },
        update: () => chain,
        delete: () => chain,
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { IDIOMS, dayNumber } from './lib/idioms'

const w1 = (id: string, word: string, lang: string) => ({ id, user_id: 'u1', word, translation: null, example: null, lang, learned: false, created_at: '2026-09-30' })

async function mountApp() {
  const wrapper = mount(App)
  await flushPromises()
  return wrapper
}

describe('Языки: идиома дня', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    h.words = [w1('1', 'Haus', 'de')]
    h.inserted = []
  })
  afterEach(() => localStorage.clear())

  it('на вкладке немецкого показывает немецкую идиому; «Другая» меняет; «В мои слова» добавляет слово с языком и переводом', async () => {
    const w = await mountApp()
    const first = w.get('[data-test="idiom-text"]').text()
    expect(IDIOMS.de.some((i) => first.includes(i.text))).toBe(true)
    await w.get('[data-test="idiom-next"]').trigger('click')
    expect(w.get('[data-test="idiom-text"]').text()).not.toBe(first)
    await w.get('[data-test="idiom-add"]').trigger('click')
    await flushPromises()
    expect(h.inserted).toHaveLength(1)
    const row = h.inserted[0]
    expect(row.lang).toBe('de')
    expect(IDIOMS.de.some((i) => i.text === row.word && i.ru === row.translation)).toBe(true)
    w.unmount()
  })

  it('если идиома уже в словаре, вместо кнопки — пометка', async () => {
    const today = dayNumber(new Date())
    const t0 = IDIOMS.de[((today % IDIOMS.de.length) + IDIOMS.de.length) % IDIOMS.de.length].text
    h.words = [w1('1', t0, 'de')]
    const w = await mountApp()
    expect(w.find('[data-test="idiom-add"]').exists()).toBe(false)
    expect(w.find('[data-test="idiom-have"]').exists()).toBe(true)
    w.unmount()
  })

  it('итальянский и португальский тоже есть в подборке', async () => {
    for (const lang of ['it', 'pt']) {
      h.words = [w1('1', 'x', lang)]
      const w = await mountApp()
      expect(w.find('[data-test="idiom-card"]').exists(), lang).toBe(true)
      w.unmount()
      localStorage.clear()
      localStorage.setItem('site_lang', 'ru')
    }
  })

  it('на вкладке языка без подборки (японский) карточки нет', async () => {
    h.words = [w1('1', '猫', 'ja')]
    const w = await mountApp()
    expect(w.find('[data-test="idiom-card"]').exists()).toBe(false)
    w.unmount()
  })
})

describe('Языки: кольцо «выучено»', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
    h.inserted = []
  })
  it('процент выученных от всех слов выбранного словаря', async () => {
    h.words = [w1('1', 'a', 'de'), { ...w1('2', 'b', 'de'), learned: true }, w1('3', 'c', 'de'), w1('4', 'd', 'de')]
    const w = await mountApp()
    expect(w.get('[data-test="learn-stats"] [data-testid="progress-ring"]').attributes('data-percent')).toBe('25')
    w.unmount()
  })
  it('нет слов — 0%, без деления на ноль', async () => {
    h.words = []
    const w = await mountApp()
    expect(w.get('[data-testid="progress-ring"]').attributes('data-percent')).toBe('0')
    w.unmount()
  })
})
