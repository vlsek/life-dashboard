import { describe, expect, it } from 'vitest'
import { defaultLayout, moveBlock, normalizeLayout, toggleBlock, visibleKeys } from './layout'

describe('normalizeLayout (порт normalizeDashboardLayout из dashboard.js)', () => {
  it('пусто/мусор → раскладка по умолчанию, всё видно', () => {
    for (const v of [null, undefined, 42, 'x', {}]) expect(normalizeLayout(v)).toEqual(defaultLayout())
    expect(defaultLayout().map((i) => i.key)).toEqual(['profile', 'charts', 'daily'])
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
    ])
  })
})

describe('moveBlock / toggleBlock / visibleKeys', () => {
  const base = defaultLayout()

  it('moveBlock меняет соседей и не мутирует исходник', () => {
    const out = moveBlock(base, 0, 1)
    expect(out.map((i) => i.key)).toEqual(['charts', 'profile', 'daily'])
    expect(base.map((i) => i.key)).toEqual(['profile', 'charts', 'daily'])
  })

  it('moveBlock за границы списка ничего не меняет', () => {
    expect(moveBlock(base, 0, -1).map((i) => i.key)).toEqual(['profile', 'charts', 'daily'])
    expect(moveBlock(base, 2, 1).map((i) => i.key)).toEqual(['profile', 'charts', 'daily'])
  })

  it('toggleBlock переключает один блок, visibleKeys отдаёт видимые в порядке раскладки', () => {
    const out = toggleBlock(moveBlock(base, 2, -1), 0)
    expect(out).toEqual([
      { key: 'profile', visible: false },
      { key: 'daily', visible: true },
      { key: 'charts', visible: true },
    ])
    expect(visibleKeys(out)).toEqual(['daily', 'charts'])
    expect(base.every((i) => i.visible)).toBe(true)
  })
})
