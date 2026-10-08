import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в других стражах пилота).
import { readFileSync } from 'node:fs'
import WaterSavedAnim from '../components/WaterSavedAnim.vue'
import { WATER_ANIMS, WATER_ANIM_KEY } from './waterAnim'

// Копия анимации «записалось» в Дашборде (BACKLOG 44.21, v3.79): те же варианты, что в шапке (выбор — «Настройки» шапки, localStorage).
const src: string = readFileSync('src/components/WaterSavedAnim.vue', 'utf-8')

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0))
  localStorage.clear()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('WaterSavedAnim в Дашборде: варианты', () => {
  const mountIt = () => mount(WaterSavedAnim, { props: { tick: 0 }, global: { stubs: { transition: false } } })
  const show = async (w: ReturnType<typeof mountIt>, tick: number) => {
    await w.setProps({ tick })
    await vi.advanceTimersByTimeAsync(10)
  }
  it('по умолчанию wave; выбор из localStorage действует при следующем показе', async () => {
    const w = mountIt()
    await show(w, 1)
    expect(w.find('[data-test="water-saved"]').attributes('data-variant')).toBe('wave')
    await vi.advanceTimersByTimeAsync(1500)
    localStorage.setItem(WATER_ANIM_KEY, 'drops')
    await show(w, 2)
    expect(w.find('[data-test="water-saved"]').attributes('data-variant')).toBe('drops')
    w.unmount()
  })
  it('внутри те же части, что в шапке', async () => {
    const w = mountIt()
    await show(w, 1)
    for (const c of ['water-saved-fill', 'ws-wave', 'ws-wave-back', 'ws-bubble', 'ws-ripple', 'ws-drop', 'water-saved-badge', 'water-saved-check']) expect(w.html(), c).toContain(c)
    w.unmount()
  })
})

describe('CSS анимации в компоненте Дашборда (страж)', () => {
  it('каждая анимация ссылается на существующие keyframes; заданы все три варианта', () => {
    const used = new Set([...src.matchAll(/animation:\s*([a-z-]+)/g)].map((m) => m[1]).filter((n) => n !== 'none'))
    const defined = new Set([...src.matchAll(/@keyframes\s+([a-z-]+)/g)].map((m) => m[1]))
    for (const u of used) expect(defined.has(u), u).toBe(true)
    for (const v of WATER_ANIMS) expect(src, v).toContain(`.water-saved[data-variant='${v}']`)
  })
  it('«Отключить анимации» и reduced-motion: итоговое состояние сразу', () => {
    expect(src).toMatch(/html\[data-motion='off'\] \.water-saved-fill\s*\{[^}]*transform:\s*none/)
    expect(src).toMatch(/html\[data-motion='off'\] \.water-saved-check\s*\{[^}]*stroke-dashoffset:\s*0/)
    const rm = src.slice(src.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(rm).toMatch(/\.ws-bubble, \.ws-drop, \.ws-ripple\s*\{\s*display:\s*none/)
  })
})
