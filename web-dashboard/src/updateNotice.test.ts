// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в designTokens.test.ts)
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkMinSupported, compareVersions, registerServiceWorker, showUpdateBanner } from './lib/registerSw'

// BACKLOG 66.11: плашка «Доступна новая версия» и минимально поддерживаемая версия оболочки. Код лежит в registerSw.ts (17 одинаковых копий).
const banner = () => document.getElementById('ld-update-banner')
function fakeSW(hasController: boolean) {
  const target = new EventTarget()
  const update = vi.fn(() => Promise.resolve())
  return {
    controller: hasController ? {} : null,
    addEventListener: target.addEventListener.bind(target),
    register: vi.fn(() => Promise.resolve()),
    getRegistration: vi.fn(() => Promise.resolve({ update })),
    update,
    changeController: () => target.dispatchEvent(new Event('controllerchange')),
  }
}
function setVisible(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: v, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => {
  banner()?.remove()
  localStorage.setItem('site_lang', 'ru')
  Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  banner()?.remove()
})

describe('плашка «Доступна новая версия»', () => {
  it('смена контроллера у страницы, которая уже была под service worker\'ом, — плашка с «Обновить» и «Позже» (RU)', () => {
    const sw = fakeSW(true)
    vi.stubGlobal('navigator', { serviceWorker: sw })
    registerServiceWorker()
    expect(banner()).toBeNull()
    sw.changeController()
    expect(banner()?.querySelector('[data-test="update-banner-text"]')?.textContent).toBe('Доступна новая версия')
    expect(banner()?.querySelector('[data-test="update-banner-update"]')?.textContent).toBe('Обновить')
    expect(banner()?.querySelector('[data-test="update-banner-later"]')?.textContent).toBe('Позже')
    expect(banner()?.getAttribute('role')).toBe('status')
  })
  it('самый первый service worker (у страницы раньше не было контроллера) плашку НЕ показывает', () => {
    const sw = fakeSW(false)
    vi.stubGlobal('navigator', { serviceWorker: sw })
    registerServiceWorker()
    sw.changeController()
    expect(banner()).toBeNull()
  })
  it('плашка не дублируется; «Позже» убирает её; по-английски при site_lang=en', () => {
    localStorage.setItem('site_lang', 'en')
    const sw = fakeSW(true)
    vi.stubGlobal('navigator', { serviceWorker: sw })
    registerServiceWorker()
    sw.changeController()
    sw.changeController()
    expect(document.querySelectorAll('#ld-update-banner')).toHaveLength(1)
    expect(banner()?.textContent).toContain('A new version is available')
    ;(banner()?.querySelector('[data-test="update-banner-later"]') as HTMLButtonElement).click()
    expect(banner()).toBeNull()
  })
  it('«Обновить» вызывает перезагрузку страницы', () => {
    const reload = vi.fn()
    showUpdateBanner('fresh', reload)
    ;(banner()?.querySelector('[data-test="update-banner-update"]') as HTMLButtonElement).click()
    expect(reload).toHaveBeenCalledTimes(1)
  })
  it('при возврате на вкладку просит у браузера новую версию, но не чаще раза в 30 минут', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-20T10:00:00Z'))
    const sw = fakeSW(true)
    vi.stubGlobal('navigator', { serviceWorker: sw })
    registerServiceWorker()
    setVisible('visible') // сразу после запуска — рано
    expect(sw.getRegistration).not.toHaveBeenCalled()
    vi.setSystemTime(new Date('2026-10-20T10:31:00Z'))
    setVisible('hidden') // скрыта — не проверяем
    expect(sw.getRegistration).not.toHaveBeenCalled()
    setVisible('visible')
    await vi.advanceTimersByTimeAsync(0)
    expect(sw.getRegistration).toHaveBeenCalledTimes(1)
    expect(sw.update).toHaveBeenCalledTimes(1)
    vi.setSystemTime(new Date('2026-10-20T10:40:00Z'))
    setVisible('visible') // и снова рано
    expect(sw.getRegistration).toHaveBeenCalledTimes(1)
  })
})

describe('min_supported для оболочки-приложения', () => {
  it('compareVersions сравнивает по частям: 6.09 < 6.10 < 7.00, 6.5 < 6.31', () => {
    expect(compareVersions('6.09', '6.10')).toBe(-1)
    expect(compareVersions('6.10', '6.09')).toBe(1)
    expect(compareVersions('6.31', '6.31')).toBe(0)
    expect(compareVersions('6.99', '7.00')).toBe(-1)
    expect(compareVersions('6.5', '6.31')).toBe(-1)
  })
  it('нативная оболочка ниже min_supported — блокирующая плашка без «Позже»; равна или выше — тишина', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ version: '6.31', min_supported: '6.00' }))))
    ;(window as unknown as { LD_APP_VERSION?: string }).LD_APP_VERSION = '5.99'
    await checkMinSupported()
    expect(banner()?.getAttribute('data-kind')).toBe('unsupported')
    expect(banner()?.getAttribute('role')).toBe('alertdialog')
    expect(banner()?.querySelector('[data-test="update-banner-later"]')).toBeNull()
    expect(banner()?.textContent).toContain('устарела')
    banner()?.remove()
    ;(window as unknown as { LD_APP_VERSION?: string }).LD_APP_VERSION = '6.00'
    await checkMinSupported()
    expect(banner()).toBeNull()
    delete (window as unknown as { LD_APP_VERSION?: string }).LD_APP_VERSION
  })
  it('на сайте (переменной LD_APP_VERSION нет) проверка молчит и в сеть не ходит; сбой сети не роняет', async () => {
    const f = vi.fn(async () => new Response('{}'))
    vi.stubGlobal('fetch', f)
    await checkMinSupported()
    expect(f).not.toHaveBeenCalled()
    ;(window as unknown as { LD_APP_VERSION?: string }).LD_APP_VERSION = '1.00'
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline') }))
    await expect(checkMinSupported()).resolves.toBeUndefined()
    delete (window as unknown as { LD_APP_VERSION?: string }).LD_APP_VERSION
  })
  it('«устарела» вытесняет «новая версия», но не наоборот', () => {
    showUpdateBanner('fresh')
    showUpdateBanner('unsupported')
    expect(banner()?.getAttribute('data-kind')).toBe('unsupported')
    showUpdateBanner('fresh')
    expect(banner()?.getAttribute('data-kind')).toBe('unsupported')
  })
  it('/version.json содержит min_supported в формате X.YY и не выше текущей версии', () => {
    const data = JSON.parse(readFileSync('../version.json', 'utf-8')) as { version: string; min_supported: string }
    expect(data.min_supported).toMatch(/^\d+\.\d{2}$/)
    expect(compareVersions(data.min_supported, data.version)).toBeLessThanOrEqual(0)
  })
})
