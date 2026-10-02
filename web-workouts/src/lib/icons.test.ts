import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ICON_KEYWORDS, ICON_PATHS, METRIC_ICON_CHOICES } from './icons'
import Icon from '../components/Icon.vue'

// Languages не использует MetricIcon/IconPicker (нет метрик на этой странице) — здесь
// проверяем только сам модуль иконок и Icon.vue, которые реально используются в AppShell
// и в PasswordInput. Полные тесты icon-picker'а — в web-history/src/lib/icons.test.ts.
describe('icons lib', () => {
  // 120 иконок из config.js классики + служебные иконки интерфейса (BACKLOG 1.3: меню, колокольчик… вместо эмодзи)
  const UI_ONLY_ICONS = ['menu', 'upload', 'mail', 'key', 'hash', 'save', 'bell', 'cart', 'bulb', 'hand', 'compass']
  it('has all 120 icon paths from config.js plus the UI-only icons, all non-empty', () => {
    const names = Object.keys(ICON_PATHS)
    expect(names.length).toBe(120 + UI_ONLY_ICONS.length)
    for (const n of UI_ONLY_ICONS) expect(names).toContain(n)
    for (const n of names) expect(ICON_PATHS[n as keyof typeof ICON_PATHS].length).toBeGreaterThan(0)
  })

  it('every METRIC_ICON_CHOICES entry exists in ICON_PATHS', () => {
    for (const name of METRIC_ICON_CHOICES) {
      expect(ICON_PATHS[name]).toBeDefined()
    }
  })

  it('every ICON_KEYWORDS key exists in ICON_PATHS', () => {
    for (const name of Object.keys(ICON_KEYWORDS)) {
      expect(ICON_PATHS[name as keyof typeof ICON_PATHS]).toBeDefined()
    }
  })
})

describe('Icon.vue', () => {
  it('renders an svg for a known icon name', () => {
    const wrapper = mount(Icon, { props: { name: 'eye' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders nothing for an unknown icon name', () => {
    const wrapper = mount(Icon, { props: { name: 'not-a-real-icon' } })
    expect(wrapper.find('svg').exists()).toBe(false)
    wrapper.unmount()
  })
})
