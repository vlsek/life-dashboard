import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах).
import { readFileSync } from 'node:fs'

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: async () => ({ data: { session: null } }), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarded: true } }) }) }) }),
  },
}))

import App from './App.vue'

beforeEach(() => localStorage.setItem('site_lang', 'ru'))

// BACKLOG 58.5: «при регистрации кнопки и вёрстка плохие, непонятно, что это поле для ввода». Поля должны выглядеть полями (видимая рамка,
// фокус, подсказка), нажимаемое — не ниже 44 px, шрифт 16 px (меньше — iOS приближает страницу при фокусе).
const css: string = readFileSync('src/style.css', 'utf-8')
const block = (/\/\* auth-form:start[\s\S]*?\/\* auth-form:end \*\//.exec(css) ?? [''])[0]

describe('логин / регистрация: поля и кнопки (58.5)', () => {
  it('и email, и пароль — общий класс поля; у email есть подсказка-образец', () => {
    const w = mount(App)
    const email = w.find('[data-test="login-email"]')
    const pass = w.find('[data-test="login-password"]')
    expect(email.classes()).toContain('auth-input')
    expect(pass.classes()).toContain('auth-input')
    expect(email.attributes('placeholder')).toBe('name@example.com')
    expect(email.attributes('type')).toBe('email')
    expect(pass.attributes('type')).toBe('password')
  })
  it('кнопки (вход/регистрация, Google) и вкладки несут классы с минимальной высотой нажатия', () => {
    const w = mount(App)
    expect(w.find('[data-test="login-submit"]').classes()).toContain('auth-btn')
    const google = w.findAll('button').find((b) => b.text().includes('Google'))!
    expect(google.classes()).toContain('auth-btn')
    expect(w.findAll('button').filter((b) => b.classes().includes('auth-tab'))).toHaveLength(2)
    expect(w.find('.auth-eye').exists()).toBe(true)
  })
  it('CSS блока: рамка заметнее фона, фокус виден, высота ≥ 44 px, шрифт 16 px, глаз с областью нажатия 44 px', () => {
    expect(block).not.toBe('')
    expect(block).toMatch(/\.auth-input \{[^}]*min-height: 4[4-9]px/)
    expect(block).toMatch(/\.auth-input \{[^}]*font-size: 16px/)
    expect(block).toMatch(/\.auth-input \{[^}]*border: 1\.5px solid color-mix\(in srgb, var\(--text\)/)
    expect(block).toMatch(/\.auth-input:focus \{[^}]*box-shadow/)
    expect(block).toMatch(/\.auth-btn \{[^}]*min-height: 4[4-9]px/)
    expect(block).toMatch(/\.auth-tab \{[^}]*min-height: 4[4-9]px/)
    expect(block).toMatch(/\.auth-eye \{[^}]*width: 44px; height: 44px/)
  })
  it('поля не возвращены к мелким (py-1.5, text-sm) без класса поля', () => {
    const app: string = readFileSync('src/App.vue', 'utf-8')
    const pw: string = readFileSync('src/components/PasswordInput.vue', 'utf-8')
    expect(app).not.toContain('px-2.5 py-1.5')
    expect(pw).not.toContain('px-2.5 py-1.5')
    expect(pw).not.toContain('text-sm')
  })
})
