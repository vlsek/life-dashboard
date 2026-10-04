import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: null } }), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarded: true } }) }) }) }),
  },
}))

import App from './App.vue'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

// «На странице логина с ПК «Войти» — не кнопка, а просто надпись» (BACKLOG раздел 27, апд26): у кнопки не было ни фона, ни цвета,
// а Tailwind сбрасывает кнопки до прозрачных. Кнопка входа должна выглядеть кнопкой: фон акцента, цвет текста на акценте, pointer, hover.
describe('логин: кнопка «Войти» выглядит как кнопка', () => {
  it('у submit есть фон и цвет акцента, курсор-рука и состояние hover', () => {
    const w = mount(App)
    const btn = w.find('[data-test="login-submit"]')
    expect(btn.text()).toBe('Войти')
    expect(btn.attributes('style')).toContain('background: var(--accent)')
    expect(btn.attributes('style')).toContain('color: var(--accent-text)')
    expect(btn.classes()).toContain('cursor-pointer')
    expect(btn.classes()).toContain('hover:opacity-90')
  })

  it('на вкладке регистрации та же кнопка с другой подписью, стиль сохраняется', async () => {
    const w = mount(App)
    await w.findAll('button').find((b) => b.text() === 'Регистрация')!.trigger('click')
    const btn = w.find('[data-test="login-submit"]')
    expect(btn.text()).not.toBe('Войти')
    expect(btn.attributes('style')).toContain('background: var(--accent)')
  })

  it('вкладки и кнопка Google показывают курсор-руку', () => {
    const w = mount(App)
    for (const b of w.findAll('button')) expect(b.classes(), b.text()).toContain('cursor-pointer')
  })
})
