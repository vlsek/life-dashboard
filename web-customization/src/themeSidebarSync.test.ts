import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import AppShell from './components/AppShell.vue'
import { THEME_KEYS, setTheme, type ThemeKey } from './lib/theme'
import { THEME_APPLIED_EVENT, notifyThemeApplied } from './lib/themeEvents'
import { useFavoriteThemes } from './lib/useFavoriteThemes'

// Баг владельца (2026-10-11): после смены темы в «Кастомизации» в выборе тем левого меню оставалась старая запись.
const selectOf = (w: ReturnType<typeof mount>) => w.find('[data-test="sidebar-theme-select"]')
const optionKeys = (w: ReturnType<typeof mount>) => selectOf(w).findAll('option').map((o) => o.attributes('value'))

describe('боковое меню: выбор тем после смены темы карточками «Кастомизации»', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('до смены: активная не-любимая тема стоит в списке и выбрана', () => {
    localStorage.setItem('site_theme', 'lavender')
    const w = mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
    expect((selectOf(w).element as HTMLSelectElement).value).toBe('lavender')
    expect(optionKeys(w)).toContain('lavender')
    w.unmount()
  })

  it('применили другую тему на странице — меню показывает её, старой записи в списке не остаётся', async () => {
    localStorage.setItem('site_theme', 'lavender')
    const w = mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
    expect(optionKeys(w)).toContain('lavender')
    setTheme('dark') // так карточки тем применяют тему
    notifyThemeApplied()
    await nextTick()
    expect((selectOf(w).element as HTMLSelectElement).value).toBe('dark')
    expect(optionKeys(w)).not.toContain('lavender') // старая запись ушла
    expect(optionKeys(w)).toContain('dark')
    w.unmount()
  })

  it('смена самим меню по-прежнему работает', async () => {
    const w = mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
    await selectOf(w).setValue('monet')
    expect(localStorage.getItem('site_theme')).toBe('monet')
    expect((selectOf(w).element as HTMLSelectElement).value).toBe('monet')
    w.unmount()
  })

  it('после размонтирования меню подписка снята', async () => {
    const spy = vi.spyOn(window, 'removeEventListener')
    const w = mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
    w.unmount()
    expect(spy.mock.calls.some((c) => c[0] === THEME_APPLIED_EVENT)).toBe(true)
    spy.mockRestore()
  })
})

describe('useFavoriteThemes.apply сообщает о смене темы', () => {
  beforeEach(() => localStorage.clear())
  const host = () => {
    let api!: ReturnType<typeof useFavoriteThemes>
    mount(defineComponent({ setup() { api = useFavoriteThemes(); return () => h('div') } }))
    return api
  }

  it('применяет тему и шлёт событие; закрытую тему не применяет и молчит', () => {
    const got: number[] = []
    const on = () => got.push(1)
    window.addEventListener(THEME_APPLIED_EVENT, on)
    const api = host()
    api.apply('dark' as ThemeKey)
    expect(localStorage.getItem('site_theme')).toBe('dark')
    expect(got).toHaveLength(1)
    const locked = (Object.keys(THEME_KEYS) as ThemeKey[]).find((k) => api.isLocked(k))
    if (locked) {
      api.apply(locked)
      expect(got).toHaveLength(1)
      expect(localStorage.getItem('site_theme')).toBe('dark')
    }
    window.removeEventListener(THEME_APPLIED_EVENT, on)
  })
})
