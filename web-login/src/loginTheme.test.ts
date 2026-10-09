import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: null } }), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarded: true } }) }) }) }),
  },
}))

import App from './App.vue'
import LangThemeBar from './components/LangThemeBar.vue'
import { LOGIN_THEMES } from './lib/theme'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

// BACKLOG 49.8: на входе нет выпадашки из 23 тем — только язык и «Светлая / Тёмная»
describe('вход: выбор темы без лишнего', () => {
  it('нет выпадающего списка тем, только две кнопки темы', () => {
    const w = mount(App)
    expect(w.find('select').exists()).toBe(false)
    expect(w.findAll('[data-theme-btn]').map((b) => b.attributes('data-theme-btn'))).toEqual(['light', 'dark'])
    expect([...LOGIN_THEMES]).toEqual(['light', 'dark'])
  })

  it('клик по теме применяет её: класс на <html> и site_theme', async () => {
    const w = mount(LangThemeBar)
    await w.find('[data-theme-btn="light"]').trigger('click')
    expect(localStorage.getItem('site_theme')).toBe('light')
    expect(document.documentElement.classList.contains('theme-light')).toBe(true)
    await w.find('[data-theme-btn="dark"]').trigger('click')
    expect(localStorage.getItem('site_theme')).toBe('dark')
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true)
    expect(document.documentElement.classList.contains('theme-light')).toBe(false)
  })

  it('подсвечена текущая; при другой сохранённой теме не подсвечена ни одна', async () => {
    localStorage.setItem('site_theme', 'dark')
    const w = mount(LangThemeBar)
    expect(w.find('[data-theme-btn="dark"]').attributes('aria-pressed')).toBe('true')
    expect(w.find('[data-theme-btn="light"]').attributes('aria-pressed')).toBe('false')
    localStorage.setItem('site_theme', 'nord')
    const w2 = mount(LangThemeBar)
    expect(w2.findAll('[data-theme-btn]').every((b) => b.attributes('aria-pressed') === 'false')).toBe(true)
  })

  it('переключатель языка на месте, сохранённая «чужая» тема не сбрасывается просмотром страницы', () => {
    localStorage.setItem('site_theme', 'nord')
    const w = mount(LangThemeBar)
    expect(w.findAll('[data-testid="lang-switch"] button').map((b) => b.text())).toEqual(['EN', 'RU'])
    expect(localStorage.getItem('site_theme')).toBe('nord')
  })
})
