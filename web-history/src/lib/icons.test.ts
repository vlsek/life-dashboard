import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { ICON_KEYWORDS, ICON_PATHS, METRIC_ICON_CHOICES, iconSearchMatches, metricIconKey } from './icons'
import Icon from '../components/Icon.vue'
import MetricIcon from '../components/MetricIcon.vue'
import IconPicker from '../components/IconPicker.vue'

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

  it('metricIconKey resolves known emoji, svg: refs, and rejects unknowns', () => {
    expect(metricIconKey('💧')).toBe('droplet')
    expect(metricIconKey('svg:dumbbell')).toBe('dumbbell')
    expect(metricIconKey('svg:not-a-real-icon')).toBeNull()
    expect(metricIconKey('🎉')).toBeNull() // не в EMOJI_TO_SVG
    expect(metricIconKey('')).toBeNull()
    expect(metricIconKey(null)).toBeNull()
  })

  it('iconSearchMatches matches by name and by RU/EN keywords', () => {
    expect(iconSearchMatches('run', '')).toBe(true)
    expect(iconSearchMatches('run', 'run')).toBe(true)
    expect(iconSearchMatches('run', 'бег')).toBe(true)
    expect(iconSearchMatches('run', 'zzz')).toBe(false)
  })
})

describe('Icon.vue', () => {
  it('renders an svg for a known icon name', () => {
    const wrapper = mount(Icon, { props: { name: 'home' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders nothing for an unknown icon name', () => {
    const wrapper = mount(Icon, { props: { name: 'not-a-real-icon' } })
    expect(wrapper.find('svg').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('MetricIcon.vue', () => {
  it('renders svg for a known emoji', () => {
    const wrapper = mount(MetricIcon, { props: { icon: '💧' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders svg for an explicit svg: ref (fixes the old literal-text display bug)', () => {
    const wrapper = mount(MetricIcon, { props: { icon: 'svg:dumbbell' } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('svg:dumbbell')
    wrapper.unmount()
  })

  it('falls back to raw emoji text when there is no svg match', () => {
    const wrapper = mount(MetricIcon, { props: { icon: '🎉' } })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.text()).toBe('🎉')
    wrapper.unmount()
  })
})

describe('IconPicker.vue', () => {
  it('filters the grid by search query', async () => {
    const wrapper = mount(IconPicker, { props: { modelValue: '' } })
    expect(wrapper.findAll('button[title]').length).toBe(METRIC_ICON_CHOICES.length)
    await wrapper.find('input[type="text"]').setValue('бег')
    const titles = wrapper.findAll('button[title]').map((b) => b.attributes('title'))
    expect(titles).toContain('run')
    expect(titles.length).toBeLessThan(METRIC_ICON_CHOICES.length)
    wrapper.unmount()
  })

  it('emits svg:<name> on icon click', async () => {
    const wrapper = mount(IconPicker, { props: { modelValue: '' } })
    await wrapper.find('button[title="run"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['svg:run'])
    wrapper.unmount()
  })
})
