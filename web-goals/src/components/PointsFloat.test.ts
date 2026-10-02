import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PointsFloat from './PointsFloat.vue'
import { FLOAT_MS } from '../lib/usePointsFloat'
import { emitPointsFloat } from '../lib/pointsFloat'

// Слой «+N / −N с монетой» (BACKLOG 14, копия механизма Дашборда для этой страницы): показывает подпись по событию и убирает по таймеру.
describe('PointsFloat — слой анимации баллов', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    delete document.documentElement.dataset.motion
  })
  afterEach(() => {
    vi.useRealTimers()
    delete document.documentElement.dataset.motion
  })

  it('«+5» у выполненной цели: подпись с монетой, по таймеру исчезает', async () => {
    const w = mount(PointsFloat)
    emitPointsFloat(5)
    await w.vm.$nextTick()
    const items = w.findAll('[data-test="points-float"]')
    expect(items).toHaveLength(1)
    expect(w.find('[data-test="points-float-text"]').text()).toBe('+5')
    expect(items[0].classes()).toContain('points-float--gain')
    expect(items[0].find('[data-test="coin-icon"]').exists()).toBe(true)
    vi.advanceTimersByTime(FLOAT_MS + 200)
    await w.vm.$nextTick()
    expect(w.findAll('[data-test="points-float"]')).toHaveLength(0)
    w.unmount()
  })

  it('снятие отметки → «−10» с настоящим минусом и классом потери', async () => {
    const w = mount(PointsFloat)
    emitPointsFloat(-10)
    await w.vm.$nextTick()
    expect(w.find('[data-test="points-float-text"]').text()).toBe('\u221210')
    expect(w.find('[data-test="points-float"]').classes()).toContain('points-float--loss')
    w.unmount()
  })

  it('ноль не показывается; выключатель анимаций (data-motion=off) гасит слой полностью; после размонтирования события игнорируются', async () => {
    const w = mount(PointsFloat)
    emitPointsFloat(0)
    await w.vm.$nextTick()
    expect(w.findAll('[data-test="points-float"]')).toHaveLength(0)
    document.documentElement.dataset.motion = 'off'
    emitPointsFloat(5)
    await w.vm.$nextTick()
    expect(w.findAll('[data-test="points-float"]')).toHaveLength(0)
    w.unmount()
    delete document.documentElement.dataset.motion
    emitPointsFloat(5)
  })
})
