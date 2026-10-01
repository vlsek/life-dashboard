import { afterEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts пилота Дашборда).
import { readFileSync } from 'node:fs'
import { registerServiceWorker } from './lib/registerSw'

const main: string = readFileSync('src/main.ts', 'utf-8')

afterEach(() => vi.unstubAllGlobals())

describe('registerServiceWorker (workouts)', () => {
  it('страница уже загружена — регистрирует /sw.js сразу', () => {
    const register = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    registerServiceWorker()
    expect(register).toHaveBeenCalledWith('/sw.js')
    expect(register).toHaveBeenCalledTimes(1)
  })

  it('страница ещё грузится — ждёт событие load и регистрирует один раз', () => {
    const register = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true })
    registerServiceWorker()
    expect(register).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('load'))
    window.dispatchEvent(new Event('load'))
    expect(register).toHaveBeenCalledTimes(1)
  })

  it('браузер без service worker (старый, приватный режим) — ничего не делает и не падает', () => {
    vi.stubGlobal('navigator', {})
    expect(() => registerServiceWorker()).not.toThrow()
  })

  it('ошибка регистрации не роняет страницу — только предупреждение в консоли', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const register = vi.fn(() => Promise.reject(new Error('boom')))
    vi.stubGlobal('navigator', { serviceWorker: { register } })
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
    registerServiceWorker()
    await Promise.resolve()
    await Promise.resolve()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('main.ts вызывает регистрацию после монтирования приложения', () => {
    expect(main).toContain("import { registerServiceWorker } from './lib/registerSw'")
    expect(main.indexOf('registerServiceWorker()')).toBeGreaterThan(main.indexOf('.mount('))
  })
})
