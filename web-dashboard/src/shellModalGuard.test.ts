import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в motionAllPilots.test.ts).
import { readdirSync, readFileSync } from 'node:fs'

// BACKLOG «При активном всплывающем окне нельзя вызывать левую и правую шторки»: пока на странице есть окно, шторки не открываются.
vi.mock('./lib/supabase', () => ({ logout: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
  globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ version: '1.00', en: [], ru: [] }))) as unknown as typeof fetch
})
afterEach(() => {
  document.querySelectorAll('.modal-backdrop, .gh-backdrop, .logout-backdrop').forEach((e) => e.remove())
})

async function mountShell() {
  const { default: AppShell } = await import('./components/AppShell.vue')
  return mount(AppShell, { props: { userEmail: null }, attachTo: document.body })
}
// свайп вправо из центральной зоны экрана (как палец): touchstart → touchmove на 120 px
function swipeRight() {
  const fire = (type: string, x: number) => {
    const e = new Event(type, { bubbles: true }) as Event & { touches: unknown[] }
    e.touches = [{ clientX: x, clientY: 300 }]
    document.body.dispatchEvent(e)
  }
  fire('touchstart', 500)
  fire('touchmove', 620)
}
const overlay = (w: ReturnType<typeof mount>) => w.find('[data-testid="sidebar-overlay"]').exists()

describe('левая шторка и всплывающие окна', () => {
  it('без окна свайп вправо открывает шторку', async () => {
    const w = await mountShell()
    swipeRight()
    await w.vm.$nextTick()
    expect(overlay(w)).toBe(true)
    w.unmount()
  })

  it.each(['modal-backdrop', 'gh-backdrop', 'logout-backdrop'])('пока на странице есть окно (.%s), свайп шторку не открывает', async (cls) => {
    const w = await mountShell()
    const m = document.createElement('div')
    m.className = cls
    document.body.appendChild(m)
    swipeRight()
    await w.vm.$nextTick()
    expect(overlay(w)).toBe(false)
    w.unmount()
  })

  it('окно закрыли — свайп снова работает', async () => {
    const w = await mountShell()
    const m = document.createElement('div')
    m.className = 'modal-backdrop'
    document.body.appendChild(m)
    swipeRight()
    await w.vm.$nextTick()
    expect(overlay(w)).toBe(false)
    m.remove()
    swipeRight()
    await w.vm.$nextTick()
    expect(overlay(w)).toBe(true)
    w.unmount()
  })

  it('кнопка-гамбургер: без окна шторку открывает, при открытом окне — нет', async () => {
    const w = await mountShell()
    const m = document.createElement('div')
    m.className = 'modal-backdrop'
    document.body.appendChild(m)
    await w.find('button[aria-label]').trigger('click')
    expect(overlay(w)).toBe(false)
    m.remove()
    await w.find('button[aria-label]').trigger('click')
    expect(overlay(w)).toBe(true)
    w.unmount()
  })
})

describe('страж: правило одинаково во всех пилотах и в шапке', () => {
  const pilots: string[] = (readdirSync('..') as string[]).filter((d) => d.startsWith('web-') && d !== 'web-header')
  const shells = pilots.map((d) => `../${d}/src/components/AppShell.vue`).filter((f) => {
    try {
      readFileSync(f, 'utf-8')
      return true
    } catch {
      return false
    }
  })

  it('нашлись все 13 AppShell', () => {
    expect(shells.length).toBeGreaterThanOrEqual(13)
  })

  it('в каждом AppShell есть общий селектор окон, проверка в onTouchStart и в openSidebar', () => {
    for (const f of shells) {
      const s: string = readFileSync(f, 'utf-8')
      expect(s, f).toContain("const MODAL_SELECTOR = '.modal-backdrop, .gh-backdrop, .logout-backdrop'")
      expect(s, f).toMatch(/target\.closest\('\.no-edge-swipe'\) \|\| isModalOpen\(\)/)
      expect(s, f).toMatch(/function openSidebar\(\) \{\s*if \(isModalOpen\(\)\) return/)
    }
  })

  it('селектор в шапке (правая шторка) совпадает, RightPanel проверяет окно до начала свайпа', () => {
    const edge: string = readFileSync('../web-header/src/lib/edgeSwipe.ts', 'utf-8')
    const panel: string = readFileSync('../web-header/src/components/RightPanel.vue', 'utf-8')
    expect(edge).toContain("export const MODAL_SELECTOR = '.modal-backdrop, .gh-backdrop, .logout-backdrop'")
    expect(panel).toMatch(/startOpenCandidate = !props\.open && startZone !== null && !isSwipeBlockedTarget\(e\.target\) && !isModalOpen\(\)/)
  })
})
