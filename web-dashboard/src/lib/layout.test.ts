import { describe, expect, it } from 'vitest'
import { defaultLayout, hasWidgets, isBlockShown, moveBlock, normalizeLayout, toggleBlock, visibleKeys, widgetsConfig, withSavingsWidget } from './layout'

describe('normalizeLayout (порт normalizeDashboardLayout из dashboard.js)', () => {
  it('пусто/мусор → раскладка по умолчанию, всё видно', () => {
    for (const v of [null, undefined, 42, 'x', {}]) expect(normalizeLayout(v)).toEqual(defaultLayout())
    expect(defaultLayout().map((i) => i.key)).toEqual(['profile', 'charts', 'daily', 'widgets'])
  })

  it('сохраняет порядок и visible, visible !== false считается видимым', () => {
    const out = normalizeLayout([
      { key: 'daily', visible: false },
      { key: 'profile' },
      { key: 'charts', visible: true },
    ])
    expect(out).toEqual([
      { key: 'daily', visible: false },
      { key: 'profile', visible: true },
      { key: 'charts', visible: true },
      { key: 'widgets', visible: true },
    ])
  })

  it('выкидывает неизвестные ключи и дубли, недостающие блоки добавляет в конец видимыми', () => {
    const out = normalizeLayout([
      { key: 'streaks', visible: true },
      { key: 'charts', visible: false },
      { key: 'charts', visible: true },
      null,
    ])
    expect(out).toEqual([
      { key: 'charts', visible: false },
      { key: 'profile', visible: true },
      { key: 'daily', visible: true },
      { key: 'widgets', visible: true },
    ])
  })
})

describe('moveBlock / toggleBlock / visibleKeys', () => {
  const base = defaultLayout()

  it('moveBlock меняет соседей и не мутирует исходник', () => {
    const out = moveBlock(base, 0, 1)
    expect(out.map((i) => i.key)).toEqual(['charts', 'profile', 'daily', 'widgets'])
    expect(base.map((i) => i.key)).toEqual(['profile', 'charts', 'daily', 'widgets'])
  })

  it('moveBlock за границы списка ничего не меняет', () => {
    expect(moveBlock(base, 0, -1).map((i) => i.key)).toEqual(['profile', 'charts', 'daily', 'widgets'])
    expect(moveBlock(base, 3, 1).map((i) => i.key)).toEqual(['profile', 'charts', 'daily', 'widgets'])
  })

  it('toggleBlock переключает один блок, visibleKeys отдаёт видимые в порядке раскладки', () => {
    const out = toggleBlock(moveBlock(base, 2, -1), 0)
    expect(out).toEqual([
      { key: 'profile', visible: false },
      { key: 'daily', visible: true },
      { key: 'charts', visible: true },
      { key: 'widgets', visible: true },
    ])
    expect(visibleKeys(out)).toEqual(['daily', 'charts', 'widgets'])
    expect(base.every((i) => i.visible)).toBe(true)
  })
})

// Блок «Виджеты» и его конфиг в раскладке (BACKLOG 9, решение владельца 2026-10-03)
describe('виджеты в раскладке', () => {
  it('widgetsConfig оставляет только известное непустое: savings — строка-id', () => {
    expect(widgetsConfig({ savings: 'abc' })).toEqual({ savings: 'abc' })
    for (const v of [null, undefined, 5, 'x', {}, { savings: '' }, { savings: 7 }, { other: 1 }]) expect(widgetsConfig(v)).toBeUndefined()
  })

  it('normalizeLayout сохраняет конфиг блока «Виджеты» и не пускает его в чужие блоки', () => {
    const out = normalizeLayout([
      { key: 'widgets', visible: true, widgets: { savings: 'item-1', junk: 1 } },
      { key: 'profile', visible: true, widgets: { savings: 'x' } },
    ])
    expect(out[0]).toEqual({ key: 'widgets', visible: true, widgets: { savings: 'item-1' } })
    expect(out.find((i) => i.key === 'profile')).toEqual({ key: 'profile', visible: true })
  })

  it('hasWidgets / isBlockShown: «Виджеты» показаны только при выборе виджета; остальные блоки — по visible', () => {
    expect(hasWidgets({ key: 'widgets', visible: true })).toBe(false)
    expect(hasWidgets({ key: 'widgets', visible: true, widgets: { savings: 'a' } })).toBe(true)
    expect(isBlockShown({ key: 'widgets', visible: true })).toBe(false)
    expect(isBlockShown({ key: 'widgets', visible: false, widgets: { savings: 'a' } })).toBe(false)
    expect(isBlockShown({ key: 'widgets', visible: true, widgets: { savings: 'a' } })).toBe(true)
    expect(isBlockShown({ key: 'daily', visible: true })).toBe(true)
    expect(isBlockShown({ key: 'daily', visible: false })).toBe(false)
  })

  it('withSavingsWidget включает и выключает виджет, не трогая остальное и не мутируя исходник', () => {
    const base = defaultLayout()
    const on = withSavingsWidget(base, 'item-1')
    expect(on.find((i) => i.key === 'widgets')).toEqual({ key: 'widgets', visible: true, widgets: { savings: 'item-1' } })
    expect(on.filter((i) => i.key !== 'widgets').every((i) => !('widgets' in i))).toBe(true)
    expect(base.find((i) => i.key === 'widgets')).toEqual({ key: 'widgets', visible: true })
    const off = withSavingsWidget(on, null)
    expect(off.find((i) => i.key === 'widgets')).toEqual({ key: 'widgets', visible: true })
    expect(hasWidgets(off.find((i) => i.key === 'widgets')!)).toBe(false)
  })

  it('moveBlock и toggleBlock не теряют конфиг виджетов', () => {
    const l = withSavingsWidget(defaultLayout(), 'item-1')
    expect(moveBlock(l, 3, -1).find((i) => i.key === 'widgets')!.widgets).toEqual({ savings: 'item-1' })
    expect(toggleBlock(l, 3).find((i) => i.key === 'widgets')).toEqual({ key: 'widgets', visible: false, widgets: { savings: 'item-1' } })
  })
})
