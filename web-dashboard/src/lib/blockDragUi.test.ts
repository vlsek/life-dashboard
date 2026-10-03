import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockDragHandle from '../components/BlockDragHandle.vue'
import BlockDragOverlay from '../components/BlockDragOverlay.vue'
import SectionHeading from '../components/SectionHeading.vue'
import { CARD_STEP } from './blockDrag'
// @ts-ignore — node:fs в тесте, как в других стражах пилота
import { readFileSync } from 'node:fs'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('BlockDragHandle', () => {
  it('ручка с подписью, pointer-события уходят родителю вместе с ключом блока', async () => {
    const w = mount(BlockDragHandle, { props: { blockKey: 'charts' } })
    const b = w.find('[data-test="block-drag-handle"]')
    expect(b.attributes('aria-label')).toContain('Потяните')
    expect(b.attributes('style')).toContain('touch-action: none')
    b.element.dispatchEvent(new MouseEvent('pointerdown', { clientY: 50, bubbles: true, button: 0 }))
    expect(w.emitted('down')![0][1]).toBe('charts')
    b.element.dispatchEvent(new MouseEvent('pointermove', { clientY: 80, bubbles: true }))
    b.element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    expect(w.emitted('move')).toHaveLength(1)
    expect(w.emitted('up')).toHaveLength(1)
    w.unmount()
  })
})

describe('SectionHeading со слотом ручки', () => {
  it('клик по ручке НЕ сворачивает секцию, клик по заголовку — сворачивает', async () => {
    const w = mount(SectionHeading, {
      props: { title: 'Профиль', storageKey: 't-drag', collapsed: false },
      slots: { actions: '<button data-test="slot-handle">☰</button>' },
    })
    await w.find('[data-test="slot-handle"]').trigger('click')
    expect(w.emitted('update:collapsed')).toBeUndefined()
    await w.find('[data-test="collapse-toggle"]').trigger('click')
    expect(w.emitted('update:collapsed')![0]).toEqual([true])
    w.unmount()
  })
  it('без слота лишней обёртки нет', () => {
    const w = mount(SectionHeading, { props: { title: 'Профиль', storageKey: 't-drag2' } })
    expect(w.find('.ml-auto').exists()).toBe(false)
    w.unmount()
  })
})

describe('BlockDragOverlay', () => {
  const items = [
    { key: 'profile' as const, title: 'Профиль' },
    { key: 'charts' as const, title: 'Графики' },
    { key: 'daily' as const, title: 'Дневные метрики' },
  ]
  const drag = (over: Partial<{ from: number; to: number; dy: number }> = {}) => ({ key: 'profile' as const, from: 0, to: 0, dy: 0, startY: 0, top: 100, mids: [0, 0, 0], ...over })

  it('три карточки с названиями, слой не перехватывает касания', () => {
    const w = mount(BlockDragOverlay, { props: { items, drag: drag() } })
    expect(w.findAll('[data-test="block-drag-card"]')).toHaveLength(3)
    expect(w.text()).toContain('Дневные метрики')
    expect(w.find('[data-test="block-drag-overlay"]').attributes('style')).toContain('pointer-events: none')
    w.unmount()
  })
  it('тянется карточка from (за курсором), соседи расступаются на шаг', () => {
    const w = mount(BlockDragOverlay, { props: { items, drag: drag({ from: 0, to: 2, dy: 90 }) } })
    const cards = w.findAll('[data-test="block-drag-card"]')
    expect(cards[0].attributes('style')).toContain('translateY(90px)')
    expect(cards[1].attributes('style')).toContain(`translateY(-${CARD_STEP}px)`)
    expect(cards[2].attributes('style')).toContain(`translateY(-${CARD_STEP}px)`)
    w.unmount()
  })
})

describe('App.vue: ручки на странице, режим «Изменить порядок» убран', () => {
  const src: string = readFileSync('src/App.vue', 'utf-8')
  it('ручка есть у каждого из трёх блоков и показывается, только когда видимых блоков больше одного', () => {
    for (const k of ['profile', 'charts', 'daily']) expect(src).toContain(`:block-key="'${k}'"`)
    expect(src.match(/visibleBlockCount > 1/g)!.length).toBe(3)
  })
  it('слой перетаскивания подключён, старой кнопки режима и панели нет', () => {
    expect(src).toContain('<BlockDragOverlay v-if="blockDrag"')
    expect(src).not.toContain('reorder-btn')
    expect(src).not.toContain('<ReorderPanel')
  })
  it('при сбое записи порядок откатывается', () => {
    expect(src).toMatch(/layout\.value = prev/)
  })
})
