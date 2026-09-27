import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ICON_KEYWORDS, ICON_PATHS, METRIC_ICON_CHOICES } from './icons'
import Icon from '../components/Icon.vue'

// Account не использует MetricIcon/IconPicker (нет метрик на этой странице) — здесь
// проверяем только сам модуль иконок и Icon.vue, которые реально используются в AppShell
// и в PasswordInput. Полные тесты icon-picker'а — в web-history/src/lib/icons.test.ts.
describe('icons lib', () => {
  it('has all 120 icon paths from config.js, all non-empty', () => {
    const names = Object.keys(ICON_PATHS)
    expect(names.length).toBe(120)
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
