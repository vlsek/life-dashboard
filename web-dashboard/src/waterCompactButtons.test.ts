import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterModal from './components/WaterModal.vue'

// BACKLOG раздел 30: «отменить последнее действие — где вода очень большой блок, можно просто отменить или стрелочку»;
// «сохранить рост тоже большая кнопка, просто делаем «сохранить» или svg-иконку». Обе кнопки — компактные иконки с подсказкой.
const metric = { id: 'w', user_id: 'u', name: 'Вода', type: 'number', unit: 'мл', icon: null, goal_value: null, goal_direction: null, schedule: null, position: 0, active: true }
const props = (over: Record<string, unknown> = {}) => ({ metric, amountMl: 500, autoNormMl: 1820, heightCm: null, canUndo: () => true, undoLast: vi.fn(async () => 300), ...over })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('вода: кнопки-иконки', () => {
  it('«Отменить» — иконка-стрелка (svg) без длинной подписи, текст — в подсказке и aria-label', () => {
    const w = mount(WaterModal, { props: props() as never })
    const b = w.find('[data-test="undo-last"]')
    expect(b.find('svg').exists()).toBe(true)
    expect(b.text()).toBe('')
    expect(b.attributes('title')).toBe('Отменить последнее добавление')
    expect(b.attributes('aria-label')).toBe('Отменить последнее добавление')
  })

  it('«Отменить» по-прежнему вызывает отмену и блокируется, когда отменять нечего', async () => {
    const undoLast = vi.fn(async () => 300)
    const w = mount(WaterModal, { props: props({ undoLast }) as never })
    await w.find('[data-test="undo-last"]').trigger('click')
    expect(undoLast).toHaveBeenCalledTimes(1)
    const off = mount(WaterModal, { props: props({ canUndo: () => false }) as never })
    expect(off.find('[data-test="undo-last"]').attributes('disabled')).toBeDefined()
  })

  it('«Сохранить рост» — иконка-галочка (svg) без текста; подсказка и aria-label «Сохранить рост»; не сжимается рядом с полем', () => {
    const w = mount(WaterModal, { props: props() as never })
    const b = w.find('[data-test="save-height"]')
    expect(b.find('svg').exists()).toBe(true)
    expect(b.text()).toBe('')
    expect(b.attributes('title')).toBe('Сохранить рост')
    expect(b.attributes('aria-label')).toBe('Сохранить рост')
    expect(b.classes()).toContain('shrink-0')
  })

  it('«Сохранить рост» работает как раньше: верный рост уходит событием, неверный показывает ошибку', async () => {
    const w = mount(WaterModal, { props: props() as never })
    await w.find('[data-test="height-input"]').setValue('178')
    await w.find('[data-test="save-height"]').trigger('click')
    expect(w.emitted('saveHeight')![0]).toEqual([178])
    await w.find('[data-test="height-input"]').setValue('50')
    await w.find('[data-test="save-height"]').trigger('click')
    expect(w.find('[data-test="height-error"]').exists()).toBe(true)
    expect(w.emitted('saveHeight')).toHaveLength(1)
  })
})
