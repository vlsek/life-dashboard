import { describe, expect, it } from 'vitest'
import { defaultLayout, hasWidgets, isBlockShown, moveBlock, normalizeLayout, toggleBlock, visibleKeys, widgetsConfig, withWidgetConfig, MAX_WIDGET_SKILLS } from './layout'

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

// Блок «Виджеты» и его конфиг в раскладке (BACKLOG 388, решение владельца 2026-10-03; формат `config` — как задумал агент 4)
describe('виджеты в раскладке', () => {
  const W = (l: ReturnType<typeof defaultLayout>) => l.find((i) => i.key === 'widgets')!

  it('widgetsConfig оставляет только известное непустое: skills — уникальные id, savings — строка-id', () => {
    expect(widgetsConfig({ savings: 'abc' })).toEqual({ savings: 'abc' })
    expect(widgetsConfig({ skills: ['a', 'b', 'a', '', 5, null] })).toEqual({ skills: ['a', 'b'] })
    expect(widgetsConfig({ skills: ['a'], savings: 'x', junk: 1 })).toEqual({ skills: ['a'], savings: 'x' })
    for (const v of [null, undefined, 5, 'x', {}, { savings: '' }, { savings: 7 }, { skills: [] }, { skills: 'a' }, { other: 1 }]) expect(widgetsConfig(v)).toBeUndefined()
  })

  it('навыков не больше MAX_WIDGET_SKILLS', () => {
    const many = Array.from({ length: MAX_WIDGET_SKILLS + 5 }, (_, k) => 's' + k)
    expect(widgetsConfig({ skills: many })!.skills).toHaveLength(MAX_WIDGET_SKILLS)
  })

  it('normalizeLayout сохраняет config блока «Виджеты» и не пускает его в чужие блоки', () => {
    const out = normalizeLayout([
      { key: 'widgets', visible: true, config: { savings: 'item-1', skills: ['s1'], junk: 1 } },
      { key: 'profile', visible: true, config: { savings: 'x' } },
    ])
    expect(out[0]).toEqual({ key: 'widgets', visible: true, config: { skills: ['s1'], savings: 'item-1' } })
    expect(out.find((i) => i.key === 'profile')).toEqual({ key: 'profile', visible: true })
  })

  it('hasWidgets / isBlockShown: «Виджеты» показаны только при выборе виджета; остальные блоки — по visible', () => {
    expect(hasWidgets({ key: 'widgets', visible: true })).toBe(false)
    expect(hasWidgets({ key: 'widgets', visible: true, config: { savings: 'a' } })).toBe(true)
    expect(isBlockShown({ key: 'widgets', visible: true })).toBe(false)
    expect(isBlockShown({ key: 'widgets', visible: false, config: { savings: 'a' } })).toBe(false)
    expect(isBlockShown({ key: 'widgets', visible: true, config: { skills: ['s'] } })).toBe(true)
    expect(isBlockShown({ key: 'daily', visible: true })).toBe(true)
    expect(isBlockShown({ key: 'daily', visible: false })).toBe(false)
  })

  it('withWidgetConfig включает/выключает виджеты по отдельности, не мутирует исходник и не трогает другие блоки', () => {
    const base = defaultLayout()
    const sk = withWidgetConfig(base, { skills: ['s1', 's2', 's1'] })
    expect(W(sk)).toEqual({ key: 'widgets', visible: true, config: { skills: ['s1', 's2'] } })
    const both = withWidgetConfig(sk, { savings: 'item-1' })
    expect(W(both).config).toEqual({ skills: ['s1', 's2'], savings: 'item-1' })
    expect(W(withWidgetConfig(both, { skills: [] })).config).toEqual({ savings: 'item-1' })
    const none = withWidgetConfig(withWidgetConfig(both, { skills: [] }), { savings: null })
    expect(W(none)).toEqual({ key: 'widgets', visible: true })
    expect(W(base)).toEqual({ key: 'widgets', visible: true })
    expect(both.filter((i) => i.key !== 'widgets').every((i) => !('config' in i))).toBe(true)
  })

  it('выбор виджета включает скрытый блок «Виджеты»; пустой выбор видимость не меняет', () => {
    const hidden = toggleBlock(defaultLayout(), 3)
    expect(W(hidden).visible).toBe(false)
    expect(W(withWidgetConfig(hidden, { savings: 'a' })).visible).toBe(true)
    expect(W(withWidgetConfig(hidden, { skills: [] })).visible).toBe(false)
  })

  it('moveBlock и toggleBlock не теряют config', () => {
    const l = withWidgetConfig(defaultLayout(), { savings: 'item-1' })
    expect(moveBlock(l, 3, -1).find((i) => i.key === 'widgets')!.config).toEqual({ savings: 'item-1' })
    expect(toggleBlock(l, 3).find((i) => i.key === 'widgets')).toEqual({ key: 'widgets', visible: false, config: { savings: 'item-1' } })
  })
})
