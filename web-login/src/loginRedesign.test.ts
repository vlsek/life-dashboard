// @ts-ignore — в проекте нет типов node; vitest выполняется в node
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 68.1: вход выглядел устаревшим. Вариант А одобрен владельцем: компактная панель «язык + тема», название с подзаголовком,
// карточка формы с иконками в полях, выбор темы на входе СОХРАНЁН (две кнопки с явным состоянием).
const getSession = vi.fn()
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: (...a: unknown[]) => getSession(...a), signInWithPassword: vi.fn(), signUp: vi.fn(), signInWithOAuth: vi.fn() },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { onboarded: true } }) }) }) }),
  },
}))
import App from './App.vue'

const app = readFileSync('src/App.vue', 'utf-8')
const css = readFileSync('src/style.css', 'utf-8')
const mountApp = async (lang: 'ru' | 'en' = 'ru') => {
  localStorage.setItem('site_lang', lang)
  const w = mount(App)
  await flushPromises()
  return w
}

beforeEach(() => {
  vi.clearAllMocks()
  getSession.mockResolvedValue({ data: { session: null } })
  localStorage.clear()
})

describe('вход (68.1): структура страницы', () => {
  it('порядок сверху вниз: панель языка и темы → пламя → заголовок h1 → подзаголовок → карточка формы → «О проекте»', async () => {
    const w = await mountApp()
    const html = w.html()
    const order = ['data-testid="lang-theme-bar"', 'data-test="login-flame"', '<h1', 'data-test="login-subtitle"', 'data-test="login-card"', 'data-test="login-about"']
    const idx = order.map((s) => html.indexOf(s))
    expect(idx.every((i) => i >= 0), JSON.stringify(idx)).toBe(true)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })
  it('подзаголовок объясняет, что это за приложение (RU и EN), в заголовке нет эмодзи-замка', async () => {
    const ru = await mountApp('ru')
    expect(ru.find('[data-test="login-subtitle"]').text()).toBe('Привычки, цели и прогресс — в одном месте')
    expect(ru.find('h1').text()).toBe('Личный дашборд')
    const en = await mountApp('en')
    expect(en.find('[data-test="login-subtitle"]').text()).toBe('Habits, goals and progress — in one place')
    expect(en.find('h1').text()).toBe('Personal Dashboard')
  })
  it('поля почты и пароля — с иконками слева, форма внутри карточки', async () => {
    const w = await mountApp()
    const card = w.find('[data-test="login-card"]')
    expect(card.find('form').exists()).toBe(true)
    expect(card.findAll('.auth-field-icon')).toHaveLength(2)
    expect(card.find('[data-test="login-email"]').classes()).toContain('has-icon')
    expect(card.find('[data-test="login-password"]').classes()).toContain('has-icon')
  })
})

describe('вход (68.1): панель языка и темы', () => {
  it('две группы: язык (EN, RU) и тема (светлая, тёмная); тема выбирается явно, состояние в aria-pressed', async () => {
    const w = await mountApp()
    expect(w.findAll('[data-testid="lang-switch"] button').map((b) => b.text())).toEqual(['EN', 'RU'])
    const themes = w.findAll('[data-theme-btn]')
    expect(themes.map((b) => b.attributes('data-theme-btn'))).toEqual(['light', 'dark'])
    expect(themes[0].attributes('aria-pressed')).toBe('true')
    await themes[1].trigger('click')
    expect(w.findAll('[data-theme-btn]')[1].attributes('aria-pressed')).toBe('true')
    expect(w.findAll('[data-theme-btn]')[0].attributes('aria-pressed')).toBe('false')
    expect(localStorage.getItem('site_theme')).toBe('dark')
  })
  it('кнопки темы — иконки: у каждой есть имя для скринридера без эмодзи и svg внутри; текста-эмодзи на кнопке нет', async () => {
    const w = await mountApp()
    const labels = w.findAll('[data-theme-btn]').map((b) => b.attributes('aria-label'))
    expect(labels).toEqual(['Светлая', 'Тёмная'])
    for (const b of w.findAll('[data-theme-btn]')) {
      expect(b.find('svg').exists()).toBe(true)
      expect(b.text()).toBe('')
    }
    expect(readFileSync('src/lib/i18n.ts', 'utf-8')).not.toMatch(/theme_(light|dark):\s*'[^']*[☀🌑]/u)
  })
  it('кнопки панели — класс secondary, чтобы темы («Чернильная бумага») не сбрасывали фон выбранной пилюли и не рисовали рамку; то же у глаза пароля', () => {
    const bar = readFileSync('src/components/LangThemeBar.vue', 'utf-8')
    expect(bar.match(/seg-btn secondary/g) ?? []).toHaveLength(1)
    expect(bar.match(/seg-icon secondary/g) ?? []).toHaveLength(1)
    expect(readFileSync('src/components/PasswordInput.vue', 'utf-8')).toContain('auth-eye secondary')
  })
})

describe('вход (68.1): стили', () => {
  it('движение отключаемо: prefers-reduced-motion и настройка «без анимаций» (data-motion=off) гасят появление карточки', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.login-card \{ animation: none; \}/)
    expect(css).toContain("html[data-motion='off'] .login-card { animation: none; }")
  })
  it('свечение и тени — на токенах темы и без «светлой полосы» под карточкой в тёмной теме', () => {
    expect(css).toMatch(/\.login-glow \{[^}]*var\(--accent\)/)
    expect(css).toMatch(/\.login-card \{[^}]*rgba\(0, 0, 0, 0\.35\)/)
    expect(css).not.toMatch(/\.login-card \{[^}]*var\(--text\)[^}]*box-shadow/)
  })
  it('пока идёт запрос, на главной кнопке крутилка (aria-busy), кнопка заблокирована', async () => {
    expect(css).toContain(".auth-btn[aria-busy='true']::after")
    const w = await mountApp()
    expect(w.find('[data-test="login-submit"]').attributes('aria-busy')).toBe('false')
  })
  it('app содержит подзаголовок и карточку без возврата к старому узкому блоку max-w-[360px]', () => {
    expect(app).toContain('login-subtitle')
    expect(app).not.toContain('max-w-[360px]')
  })
})
