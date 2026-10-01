import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PointsFloat from './components/PointsFloat.vue'
import { emitPointsFloat } from './lib/pointsFloat'
import { FLOAT_MS, FLOAT_REDUCED_MS, MAX_ITEMS } from './lib/usePointsFloat'

let w: ReturnType<typeof mount> | null = null
const items = () => w!.findAll('[data-test="points-float"]')

function click(x: number, y: number) {
  window.dispatchEvent(new PointerEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-01T12:00:00Z'))
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
  w = mount(PointsFloat)
})
afterEach(() => {
  w?.unmount()
  w = null
  delete document.documentElement.dataset.motion
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('PointsFloat', () => {
  it('пока баллов нет — ничего не рисует', () => {
    expect(items()).toHaveLength(0)
  })

  it('+1: показывает «+1» с монетой у места клика, чуть выше пальца', async () => {
    click(200, 500)
    emitPointsFloat(1)
    await nextTick()
    expect(items()).toHaveLength(1)
    const el = items()[0]
    expect(el.find('[data-test="points-float-text"]').text()).toBe('+1')
    expect(el.find('[data-test="coin-icon"]').exists()).toBe(true)
    expect(el.classes()).toContain('points-float--gain')
    expect(el.attributes('style')).toContain('left: 200px')
    expect(el.attributes('style')).toContain('top: 470px')
  })

  it('−1: та же анимация, но «−1» и другой класс', async () => {
    click(200, 500)
    emitPointsFloat(-1)
    await nextTick()
    const el = items()[0]
    expect(el.find('[data-test="points-float-text"]').text()).toBe('\u22121')
    expect(el.classes()).toContain('points-float--loss')
    expect(el.classes()).not.toContain('points-float--gain')
  })

  it('растворяется и удаляется по таймеру', async () => {
    emitPointsFloat(1)
    await nextTick()
    expect(items()).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(FLOAT_MS + 200)
    expect(items()).toHaveLength(0)
  })

  it('нет недавнего клика → запасное место: по центру экрана', async () => {
    emitPointsFloat(1)
    await nextTick()
    expect(items()[0].attributes('style')).toContain('left: 200px')
    expect(items()[0].attributes('style')).toContain('top: 360px')
  })

  it('старый клик (больше 4 с назад) не используется', async () => {
    click(50, 100)
    await vi.advanceTimersByTimeAsync(5000)
    emitPointsFloat(1)
    await nextTick()
    expect(items()[0].attributes('style')).toContain('left: 200px')
  })

  it('клик у самого края не выталкивает подпись за экран', async () => {
    click(2, 400)
    emitPointsFloat(1)
    await nextTick()
    expect(items()[0].attributes('style')).toContain('left: 44px')
  })

  it('частые нажатия у одного места раскладываются стопкой, а не слипаются', async () => {
    click(200, 500)
    emitPointsFloat(1)
    emitPointsFloat(-1)
    await nextTick()
    const tops = items().map((i) => Number(/top: (\d+)px/.exec(i.attributes('style') || '')![1]))
    expect(tops).toHaveLength(2)
    expect(tops[1]).toBeLessThan(tops[0])
  })

  it(`одновременно не больше ${MAX_ITEMS} подписей`, async () => {
    click(200, 700)
    for (let i = 0; i < MAX_ITEMS + 4; i++) emitPointsFloat(1)
    await nextTick()
    expect(items()).toHaveLength(MAX_ITEMS)
  })

  it('ноль и мусор в событии игнорируются', async () => {
    emitPointsFloat(0)
    window.dispatchEvent(new CustomEvent('dashboard:points-float', { detail: { delta: 'x' } }))
    window.dispatchEvent(new CustomEvent('dashboard:points-float'))
    await nextTick()
    expect(items()).toHaveLength(0)
  })

  it('prefers-reduced-motion: на месте, без полёта, исчезает быстрее', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    emitPointsFloat(1)
    await nextTick()
    expect(items()[0].classes()).toContain('points-float--still')
    await vi.advanceTimersByTimeAsync(FLOAT_REDUCED_MS + 200)
    expect(items()).toHaveLength(0)
  })

  it('data-motion="off" — не показывается совсем', async () => {
    document.documentElement.dataset.motion = 'off'
    emitPointsFloat(1)
    await nextTick()
    expect(items()).toHaveLength(0)
  })

  it('скринридеру объявляется «Баллы +1» (ru) / «Points +1» (en)', async () => {
    emitPointsFloat(1)
    await nextTick()
    expect(w!.find('[data-test="points-float-sr"]').text()).toBe('Баллы +1')
  })

  it('после размонтирования слушатели сняты: событие больше ничего не рисует и не падает', async () => {
    w!.unmount()
    expect(() => emitPointsFloat(1)).not.toThrow()
    w = mount(PointsFloat)
    await nextTick()
    expect(items()).toHaveLength(0)
  })
})
