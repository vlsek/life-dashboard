import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'

vi.mock('./App.vue', () => ({
  default: { props: ['panelOnly'], render() { return h('i', { 'data-panel-only': String(!!(this as any).panelOnly) }) } },
}))
vi.mock('./header.css?inline', () => ({ default: '.gh-root{}' }))

async function run(path: string) {
  vi.resetModules()
  history.replaceState(null, '', path)
  await import('./main')
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.head.querySelectorAll('style').forEach((s) => s.remove())
})
afterEach(() => vi.useRealTimers())

describe('main.ts — монтирование в #topbar-right', () => {
  it('если #topbar-right уже есть: вставляет контейнер первым ребёнком и добавляет стили один раз', async () => {
    document.body.innerHTML = '<div id="topbar-right"><span id="old"></span></div>'
    await run('/goals/')
    const host = document.getElementById('global-header-widgets')!
    expect(host).toBeTruthy()
    expect(document.getElementById('topbar-right')!.firstElementChild).toBe(host)
    expect(document.head.querySelectorAll('style')).toHaveLength(1)
  })

  it('ждёт появления #topbar-right (страница рисуется позже)', async () => {
    await run('/goals/')
    expect(document.getElementById('global-header-widgets')).toBeNull()
    const bar = document.createElement('div')
    bar.id = 'topbar-right'
    document.body.appendChild(bar)
    await new Promise((r) => setTimeout(r, 20))
    expect(document.getElementById('global-header-widgets')).toBeTruthy()
  })

  it('на Дашборде монтируется в режиме «только панель» (стакан и кольца там свои), на остальных страницах — целиком', async () => {
    document.body.innerHTML = '<div id="topbar-right"></div>'
    await run('/dashboard/')
    expect(document.querySelector('#global-header-widgets [data-panel-only]')!.getAttribute('data-panel-only')).toBe('true')
    document.body.innerHTML = '<div id="topbar-right"></div>'
    await run('/goals/')
    expect(document.querySelector('#global-header-widgets [data-panel-only]')!.getAttribute('data-panel-only')).toBe('false')
  })

  it.each(['/login/', '/onboarding/', '/admin.html', '/legacy/goals.html'])('на %s не монтируется', async (path) => {
    document.body.innerHTML = '<div id="topbar-right"></div>'
    await run(path)
    expect(document.getElementById('global-header-widgets')).toBeNull()
  })
})
