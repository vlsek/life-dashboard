import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BlockOrderList from '../components/BlockOrderList.vue'
import type { LayoutItem } from './layout'

const labels = {
  profile: { title: 'Профиль', desc: 'д1' },
  charts: { title: 'Графики', desc: 'д2' },
  daily: { title: 'Дневные', desc: 'д3' },
  widgets: { title: 'Виджеты', desc: 'д4' },
}
const items = (): LayoutItem[] => [
  { key: 'profile', visible: true },
  { key: 'charts', visible: true },
  { key: 'daily', visible: false },
]

// jsdom не считает раскладку — подсовываем карточкам геометрию: высота 50, зазор 8 (как у gap-2 ≈ 8px)
function mountWithGeometry(model: LayoutItem[] = items()) {
  const w = mount(BlockOrderList, { props: { modelValue: model, labels }, attachTo: document.body })
  w.findAll('[data-test="layout-row"]').forEach((row, i) => {
    ;(row.element as HTMLElement).getBoundingClientRect = () => ({ top: i * 58, bottom: i * 58 + 50, height: 50, left: 0, right: 300, width: 300, x: 0, y: i * 58, toJSON: () => ({}) }) as DOMRect
  })
  return w
}
const ptr = (type: string, y: number) => new MouseEvent(type, { clientY: y, bubbles: true, button: 0 })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('BlockOrderList', () => {
  it('рисует карточки: ручка (SVG), название, описание, переключатель видимости (скрытый блок бледный и выключен)', () => {
    const w = mountWithGeometry()
    const rows = w.findAll('[data-test="layout-row"]')
    expect(rows).toHaveLength(3)
    expect(rows[0].find('[data-test="drag-handle"] svg').exists()).toBe(true) // ручка — SVG-иконка menu (BACKLOG 1.3), а не символ ☰
    expect(rows[1].text()).toContain('Графики')
    expect(rows[1].text()).toContain('д2')
    expect(rows[0].find('[data-test="toggle"]').attributes('aria-checked')).toBe('true')
    expect(rows[2].find('[data-test="toggle"]').attributes('aria-checked')).toBe('false')
    w.unmount()
  })

  it('перетаскивание ручкой вниз через соседа меняет порядок (update:modelValue)', async () => {
    const w = mountWithGeometry()
    const handle = w.findAll('[data-test="drag-handle"]')[0]
    handle.element.dispatchEvent(ptr('pointerdown', 25))
    handle.element.dispatchEvent(ptr('pointermove', 25 + 70)) // центр 95 — за серединой второй карточки (83)
    await w.vm.$nextTick()
    handle.element.dispatchEvent(ptr('pointerup', 95))
    await w.vm.$nextTick()
    const out = w.emitted('update:modelValue')![0][0] as LayoutItem[]
    expect(out.map((i) => i.key)).toEqual(['charts', 'profile', 'daily'])
    w.unmount()
  })

  it('перетаскивание вверх и до конца; видимость переносится вместе с карточкой', async () => {
    const w = mountWithGeometry()
    const handle = w.findAll('[data-test="drag-handle"]')[2]
    handle.element.dispatchEvent(ptr('pointerdown', 141))
    handle.element.dispatchEvent(ptr('pointermove', 141 - 200))
    handle.element.dispatchEvent(ptr('pointerup', -59))
    await w.vm.$nextTick()
    expect((w.emitted('update:modelValue')![0][0] as LayoutItem[])).toEqual([
      { key: 'daily', visible: false },
      { key: 'profile', visible: true },
      { key: 'charts', visible: true },
    ])
    w.unmount()
  })

  it('короткое движение без пересечения середины, а также отмена жеста порядок не меняют', async () => {
    const w = mountWithGeometry()
    const handle = w.findAll('[data-test="drag-handle"]')[0]
    handle.element.dispatchEvent(ptr('pointerdown', 25))
    handle.element.dispatchEvent(ptr('pointermove', 40))
    handle.element.dispatchEvent(ptr('pointerup', 40))
    handle.element.dispatchEvent(ptr('pointerdown', 25))
    handle.element.dispatchEvent(ptr('pointermove', 200))
    handle.element.dispatchEvent(ptr('pointercancel', 200))
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')).toBeUndefined()
    w.unmount()
  })

  it('во время перетаскивания карточка получает сдвиг по курсору, соседи уступают место; после отпускания всё сбрасывается', async () => {
    const w = mountWithGeometry()
    const handle = w.findAll('[data-test="drag-handle"]')[0]
    handle.element.dispatchEvent(ptr('pointerdown', 25))
    handle.element.dispatchEvent(ptr('pointermove', 25 + 70))
    await w.vm.$nextTick()
    const rows = w.findAll('[data-test="layout-row"]')
    expect((rows[0].element as HTMLElement).style.transform).toBe('translateY(70px)')
    expect((rows[1].element as HTMLElement).style.transform).toBe('translateY(-58px)')
    expect((rows[2].element as HTMLElement).style.transform).toBe('')
    handle.element.dispatchEvent(ptr('pointerup', 95))
    await w.vm.$nextTick()
    expect((w.findAll('[data-test="layout-row"]')[0].element as HTMLElement).style.transform).toBe('')
    w.unmount()
  })

  it('клавиатура на ручке: стрелки двигают на одну позицию; кнопки ↑/↓ и переключатель работают как раньше', async () => {
    const w = mountWithGeometry()
    await w.findAll('[data-test="drag-handle"]')[0].trigger('keydown', { key: 'ArrowDown' })
    expect((w.emitted('update:modelValue')![0][0] as LayoutItem[]).map((i) => i.key)).toEqual(['charts', 'profile', 'daily'])
    await w.findAll('[data-test="down"]')[1].trigger('click')
    expect((w.emitted('update:modelValue')![1][0] as LayoutItem[]).map((i) => i.key)).toEqual(['profile', 'daily', 'charts'])
    await w.findAll('[data-test="toggle"]')[2].trigger('click')
    expect((w.emitted('update:modelValue')![2][0] as LayoutItem[])[2]).toEqual({ key: 'daily', visible: true })
    expect(w.findAll('[data-test="up"]')[0].attributes('disabled')).toBeDefined()
    expect(w.findAll('[data-test="down"]')[2].attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('не основная кнопка мыши жест не начинает', async () => {
    const w = mountWithGeometry()
    const handle = w.findAll('[data-test="drag-handle"]')[0]
    handle.element.dispatchEvent(new MouseEvent('pointerdown', { clientY: 25, bubbles: true, button: 2 }))
    handle.element.dispatchEvent(ptr('pointermove', 200))
    handle.element.dispatchEvent(ptr('pointerup', 200))
    expect(w.emitted('update:modelValue')).toBeUndefined()
    w.unmount()
  })
})
