import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReorderPanel from '../components/ReorderPanel.vue'
import type { LayoutItem } from './layout'

// BACKLOG 22 (11:53): режим «Изменить порядок» прямо на главной — список карточек блоков, порядок меняется перетаскиванием.
const items = (): LayoutItem[] => [
  { key: 'profile', visible: true },
  { key: 'charts', visible: true },
  { key: 'daily', visible: false },
]
const ptr = (type: string, y: number) => new MouseEvent(type, { clientY: y, bubbles: true, button: 0 })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('ReorderPanel', () => {
  it('заголовок, подсказка, три карточки блоков и кнопка «Готово»', () => {
    const w = mount(ReorderPanel, { props: { modelValue: items() } })
    expect(w.text()).toContain('Порядок блоков')
    expect(w.text()).toContain('Перетащите блок')
    expect(w.findAll('[data-test="layout-row"]')).toHaveLength(3)
    expect(w.find('[data-test="reorder-done"]').text()).toBe('Готово')
    w.unmount()
  })

  it('перетаскивание ручкой поднимает update:modelValue с новым порядком; «Готово» — done', async () => {
    const w = mount(ReorderPanel, { props: { modelValue: items() }, attachTo: document.body })
    w.findAll('[data-test="layout-row"]').forEach((row, i) => {
      ;(row.element as HTMLElement).getBoundingClientRect = () => ({ top: i * 58, bottom: i * 58 + 50, height: 50, left: 0, right: 300, width: 300, x: 0, y: i * 58, toJSON: () => ({}) }) as DOMRect
    })
    const handle = w.findAll('[data-test="drag-handle"]')[0].element
    handle.dispatchEvent(ptr('pointerdown', 25))
    handle.dispatchEvent(ptr('pointermove', 25 + 70))
    handle.dispatchEvent(ptr('pointerup', 95))
    await w.vm.$nextTick()
    expect((w.emitted('update:modelValue')![0][0] as LayoutItem[]).map((i) => i.key)).toEqual(['charts', 'profile', 'daily'])
    await w.find('[data-test="reorder-done"]').trigger('click')
    expect(w.emitted('done')).toHaveLength(1)
    w.unmount()
  })

  it('переключатель прячет блок и тоже уходит в update:modelValue', async () => {
    const w = mount(ReorderPanel, { props: { modelValue: items() } })
    await w.findAll('[data-test="toggle"]')[0].trigger('click')
    expect((w.emitted('update:modelValue')![0][0] as LayoutItem[])[0]).toEqual({ key: 'profile', visible: false })
    w.unmount()
  })

  it('«Сохранено» показывается после успешной записи, ошибка — вместо него', async () => {
    const w = mount(ReorderPanel, { props: { modelValue: items(), saved: true } })
    expect(w.find('[data-test="reorder-saved"]').text()).toContain('Сохранено')
    await w.setProps({ error: 'нет доступа' })
    expect(w.find('[data-test="reorder-saved"]').exists()).toBe(false)
    expect(w.find('[data-test="reorder-error"]').text()).toContain('нет доступа')
    w.unmount()
  })
})
