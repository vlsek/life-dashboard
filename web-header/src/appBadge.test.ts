import { describe, expect, it, vi } from 'vitest'
import { applyBadge, badgeCount } from './lib/appBadge'
import { readQuick, withoutQuick } from './lib/quickAction'

// BACKLOG 79.5: бейдж приложения и параметр быстрого действия из ярлыка
describe('badgeCount', () => {
  it('невыполненное = всего − сделано; без данных и без плана — 0; не уходит в минус', () => {
    expect(badgeCount({ done: 3, total: 8 })).toBe(5)
    expect(badgeCount({ done: 8, total: 8 })).toBe(0)
    expect(badgeCount({ done: 9, total: 8 })).toBe(0)
    expect(badgeCount({ done: 0, total: 0 })).toBe(0)
    expect(badgeCount(null)).toBe(0)
    expect(badgeCount(undefined)).toBe(0)
  })
})

describe('applyBadge', () => {
  it('число > 0 ставит бейдж, 0 — снимает', async () => {
    const nav = { setAppBadge: vi.fn().mockResolvedValue(undefined), clearAppBadge: vi.fn().mockResolvedValue(undefined) }
    await applyBadge(4, nav)
    expect(nav.setAppBadge).toHaveBeenCalledWith(4)
    expect(nav.clearAppBadge).not.toHaveBeenCalled()
    await applyBadge(0, nav)
    expect(nav.clearAppBadge).toHaveBeenCalledTimes(1)
  })
  it('без Badging API и при отказе API не бросает', async () => {
    await expect(applyBadge(3, {})).resolves.toBeUndefined()
    const nav = { setAppBadge: vi.fn().mockRejectedValue(new Error('denied')), clearAppBadge: vi.fn() }
    await expect(applyBadge(3, nav)).resolves.toBeUndefined()
  })
})

describe('quickAction', () => {
  it('читает только известное действие', () => {
    expect(readQuick('?quick=water')).toBe('water')
    expect(readQuick('?a=1&quick=water')).toBe('water')
    expect(readQuick('?quick=other')).toBeNull()
    expect(readQuick('')).toBeNull()
  })
  it('убирает параметр, остальное сохраняет', () => {
    expect(withoutQuick('https://s.test/dashboard/?quick=water')).toBe('/dashboard/')
    expect(withoutQuick('https://s.test/dashboard/?a=1&quick=water#x')).toBe('/dashboard/?a=1#x')
    expect(withoutQuick('https://s.test/goals/')).toBe('/goals/')
  })
})

// @ts-ignore — типов node в проекте нет, vitest работает в node (как в activeWorkoutBadge.test.ts)
import { readFileSync } from 'node:fs'
describe('manifest.json: ярлыки приложения', () => {
  const m = JSON.parse(readFileSync('../manifest.json', 'utf-8')) as { scope: string; shortcuts: { name: string; url: string }[] }
  it('до 4 ярлыков с названием и адресом внутри scope', () => {
    expect(m.shortcuts.length).toBeGreaterThanOrEqual(3)
    expect(m.shortcuts.length).toBeLessThanOrEqual(4)
    for (const s of m.shortcuts) {
      expect(s.name.trim()).not.toBe('')
      expect(s.url.startsWith(m.scope)).toBe(true)
    }
  })
  it('ярлык «+ вода» ведёт туда, где шапка понимает параметр', () => {
    const w = m.shortcuts.find((s) => s.name.includes('вода'))!
    expect(readQuick(w.url.slice(w.url.indexOf('?')))).toBe('water')
  })
})
