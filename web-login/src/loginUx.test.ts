import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// BACKLOG 58.5 («при регистрации кнопки и вёрстка отстой … не понятно, что поле для ввода»): видимое поле пароля, переключатель-«кнопки»,
// сообщение над кнопкой отправки, подсказка при регистрации, правильный autocomplete.
const signInWithPassword = vi.fn()
const signUp = vi.fn()
const getSession = vi.fn()
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: (...a: unknown[]) => getSession(...a), signInWithPassword: (...a: unknown[]) => signInWithPassword(...a), signUp: (...a: unknown[]) => signUp(...a), signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarded: true } }) }) }) }),
  },
}))

import App from './App.vue'

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ data: { session: null } })
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

const mountApp = async () => {
  const w = mount(App)
  await flushPromises()
  return w
}
const goRegister = async (w: Awaited<ReturnType<typeof mountApp>>) => {
  await w.find('[data-test="tab-register"]').trigger('click')
}

describe('вход: переключатель Вход / Регистрация', () => {
  it('это tablist из двух tab с aria-selected, переключается кликом', async () => {
    const w = await mountApp()
    expect(w.find('[role="tablist"]').exists()).toBe(true)
    const tabs = w.findAll('[role="tab"]')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    expect(tabs[1].attributes('aria-selected')).toBe('false')
    await goRegister(w)
    expect(tabs[0].attributes('aria-selected')).toBe('false')
    expect(tabs[1].attributes('aria-selected')).toBe('true')
    expect(tabs[1].classes()).toContain('auth-tab-on')
    expect(tabs[0].classes()).not.toContain('auth-tab-on')
  })
})

describe('вход: поле пароля и подсказка', () => {
  it('в пустом поле пароля видны точки-подсказка (понятно, что это поле ввода)', async () => {
    const w = await mountApp()
    expect(w.find('[data-test="login-password"]').attributes('placeholder')).toBe('••••••••')
    expect(w.find('[data-test="login-email"]').attributes('placeholder')).toBe('name@example.com')
  })
  it('подсказка про длину пароля — только при регистрации', async () => {
    const w = await mountApp()
    expect(w.find('[data-test="password-hint"]').exists()).toBe(false)
    await goRegister(w)
    expect(w.find('[data-test="password-hint"]').text()).toBe('Минимум 6 символов')
    await w.find('[data-test="tab-login"]').trigger('click')
    expect(w.find('[data-test="password-hint"]').exists()).toBe(false)
  })
  it('менеджеры паролей: при входе current-password, при регистрации new-password', async () => {
    const w = await mountApp()
    const pass = () => w.find('[data-test="login-password"]')
    expect(pass().attributes('autocomplete')).toBe('current-password')
    await goRegister(w)
    expect(pass().attributes('autocomplete')).toBe('new-password')
  })
})

describe('вход: сообщение над кнопкой', () => {
  it('пока сообщения нет — блока нет (нет пустой полосы)', async () => {
    const w = await mountApp()
    expect(w.find('[data-test="login-msg"]').exists()).toBe(false)
  })
  it('ошибка (пустые поля): красный блок role=alert и он ВЫШЕ кнопки отправки', async () => {
    const w = await mountApp()
    await w.find('form').trigger('submit')
    const msg = w.find('[data-test="login-msg"]')
    expect(msg.text()).toBe('Заполни email и пароль.')
    expect(msg.classes()).toContain('auth-msg-error')
    expect(msg.attributes('role')).toBe('alert')
    const submit = w.find('[data-test="login-submit"]').element
    expect(msg.element.compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('сообщение только одно: внизу карточки (под Google) старой копии нет', async () => {
    const w = await mountApp()
    await w.find('form').trigger('submit')
    expect(w.findAll('[data-test="login-msg"]')).toHaveLength(1)
    expect(w.findAll('p').filter((p) => p.text() === 'Заполни email и пароль.')).toHaveLength(1)
  })
  it('ошибка входа с сервера — тоже ошибка (красный), с префиксом', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    const w = await mountApp()
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('x')
    await w.find('form').trigger('submit')
    await flushPromises()
    const msg = w.find('[data-test="login-msg"]')
    expect(msg.classes()).toContain('auth-msg-error')
    expect(msg.text()).toMatch(/^Ошибка: /)
  })
  it('«проверь почту» после регистрации — спокойный «ok»-блок role=status, не ошибка', async () => {
    signUp.mockResolvedValue({ data: { session: null }, error: null })
    const w = await mountApp()
    await goRegister(w)
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('secret1')
    await w.find('form').trigger('submit')
    await flushPromises()
    const msg = w.find('[data-test="login-msg"]')
    expect(msg.classes()).toContain('auth-msg-ok')
    expect(msg.classes()).not.toContain('auth-msg-error')
    expect(msg.attributes('role')).toBe('status')
  })
  it('смена вкладки убирает прежнее сообщение', async () => {
    const w = await mountApp()
    await w.find('form').trigger('submit')
    expect(w.find('[data-test="login-msg"]').exists()).toBe(true)
    await goRegister(w)
    expect(w.find('[data-test="login-msg"]').exists()).toBe(false)
  })
})

describe('вход: кнопки', () => {
  it('кнопки языка и темы — с увеличенной целью для пальца (bar-btn), кнопка входа получает aria-busy во время запроса', async () => {
    const w = await mountApp()
    const bar = w.findAll('[data-testid="lang-theme-bar"] button')
    expect(bar.length).toBe(4)
    for (const b of bar) expect(b.classes()).toContain('bar-btn')
    let release: (v: unknown) => void = () => {}
    signInWithPassword.mockReturnValue(new Promise((r) => (release = r)))
    await w.find('input[type=email]').setValue('a@b.c')
    await w.find('input[type=password]').setValue('x')
    await w.find('form').trigger('submit')
    await flushPromises()
    expect(w.find('[data-test="login-submit"]').attributes('aria-busy')).toBe('true')
    expect(w.find('[data-test="login-submit"]').attributes('disabled')).toBeDefined()
    release({ error: { message: 'Invalid login credentials' } })
    await flushPromises()
    expect(w.find('[data-test="login-submit"]').attributes('aria-busy')).toBe('false')
  })
})
