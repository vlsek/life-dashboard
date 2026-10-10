import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defaultLayout, withWidgetConfig, type LayoutItem } from './layout'
import { isWidgetOn, pageWidgetKind, widgetToggleLayout } from './pageWidget'
import PageWidgetButton from '../components/PageWidgetButton.vue'

// BACKLOG 54.3: «Добавить виджет этой страницы на главную».
const widgets = (l: LayoutItem[]) => l.find((i) => i.key === 'widgets')!

describe('pageWidgetKind', () => {
  it('календарь, языки (ключ english) и навыки имеют виджет; остальные страницы и главная — нет', () => {
    expect(pageWidgetKind('calendar')).toBe('calendar')
    expect(pageWidgetKind('english')).toBe('languages')
    expect(pageWidgetKind('skills')).toBe('skills')
    for (const k of ['goals', 'shop', 'workouts', 'community', 'achievements', null]) expect(pageWidgetKind(k)).toBeNull()
  })
})

describe('widgetToggleLayout / isWidgetOn', () => {
  it('добавление календаря и языков включает виджет и показывает блок «Виджеты»', () => {
    const base = defaultLayout().map((i) => (i.key === 'widgets' ? { ...i, visible: false } : i))
    const cal = widgetToggleLayout(base, 'calendar', true)!
    expect(widgets(cal).config).toEqual({ calendar: true })
    expect(widgets(cal).visible).toBe(true)
    expect(isWidgetOn(cal, 'calendar')).toBe(true)
    const both = widgetToggleLayout(cal, 'languages', true)!
    expect(widgets(both).config).toEqual({ calendar: true, languages: 'all' })
    expect(isWidgetOn(both, 'languages')).toBe(true)
    expect(isWidgetOn(defaultLayout(), 'calendar')).toBe(false)
  })
  it('навыки: берутся переданные id, не больше 12; нет навыков — добавлять нечего (null)', () => {
    const ids = Array.from({ length: 15 }, (_, i) => `s${i}`)
    const on = widgetToggleLayout(defaultLayout(), 'skills', true, ids)!
    expect(widgets(on).config!.skills).toEqual(ids.slice(0, 12))
    expect(isWidgetOn(on, 'skills')).toBe(true)
    expect(widgetToggleLayout(defaultLayout(), 'skills', true, [])).toBeNull()
  })
  it('удаление выключает только свой вид, остальные виджеты остаются; последний убран — блока без выбора нет', () => {
    const l = withWidgetConfig(defaultLayout(), { calendar: true, languages: 'de', skills: ['a'] })
    const off = widgetToggleLayout(l, 'calendar', false)!
    expect(widgets(off).config).toEqual({ languages: 'de', skills: ['a'] })
    expect(isWidgetOn(off, 'calendar')).toBe(false)
    expect(isWidgetOn(off, 'languages')).toBe(true) // любой выбранный язык — «виджет на главной»
    const none = widgetToggleLayout(widgetToggleLayout(widgetToggleLayout(l, 'calendar', false)!, 'languages', false)!, 'skills', false)!
    expect(widgets(none).config).toBeUndefined()
    expect(isWidgetOn(none, 'skills')).toBe(false)
  })
  it('скрытый блок «Виджеты» — виджета «нет на главной», даже если config остался', () => {
    const l = withWidgetConfig(defaultLayout(), { calendar: true }).map((i) => (i.key === 'widgets' ? { ...i, visible: false } : i))
    expect(isWidgetOn(l, 'calendar')).toBe(false)
  })
  it('другие блоки раскладки и порядок не меняются', () => {
    const before = defaultLayout()
    const after = widgetToggleLayout(before, 'calendar', true)!
    expect(after.map((i) => i.key)).toEqual(before.map((i) => i.key))
    expect(after.filter((i) => i.key !== 'widgets')).toEqual(before.filter((i) => i.key !== 'widgets'))
  })
})

describe('PageWidgetButton', () => {
  it('показывает состояние и шлёт toggle; занята — не нажимается', async () => {
    const off = mount(PageWidgetButton, { props: { on: false } })
    expect(off.find('svg').attributes('data-state')).toBe('off')
    expect(off.find('button').attributes('aria-pressed')).toBe('false')
    await off.find('button').trigger('click')
    expect(off.emitted('toggle')).toHaveLength(1)
    const on = mount(PageWidgetButton, { props: { on: true } })
    expect(on.find('svg').attributes('data-state')).toBe('on')
    expect(on.find('button').attributes('title')).not.toBe(off.find('button').attributes('title')) // подсказка «добавить» ≠ «убрать»
    expect(mount(PageWidgetButton, { props: { on: false, busy: true } }).find('button').attributes('disabled')).toBeDefined()
  })
})
