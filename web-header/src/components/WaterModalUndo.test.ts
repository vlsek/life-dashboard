import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import WaterModal from './WaterModal.vue'
import type { Metric } from '../lib/types'

// «Отменить последнее добавление» и карандашик правки суммы за день в окне воды (BACKLOG 12).
const metric: Metric = { id: 'm1', user_id: 'u1', name: 'Water', icon: '💧', type: 'number', unit: 'мл', goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0 }
const base = { metric, currentMl: 700, normMl: 2000, autoNormMl: null, weightKg: null, getMlForDate: async () => 0 }

describe('WaterModal — отмена и правка суммы', () => {
  it('без новых колбэков блок не показывается (старое поведение окна сохранено)', () => {
    const w = mount(WaterModal, { props: base })
    expect(w.find('[data-test="water-day-tools"]').exists()).toBe(false)
    w.unmount()
  })

  it('«Отменить» неактивна, пока отменять нечего, и оживает, когда есть что откатывать', async () => {
    const canUndo = vi.fn(() => false)
    const w = mount(WaterModal, { props: { ...base, canUndo, undoLast: async () => 0, setTotal: async () => 0 } })
    expect(w.find('[data-test="undo-last"]').attributes('disabled')).toBeDefined()
    expect(canUndo).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), 700)
    await w.setProps({ canUndo: () => true })
    expect(w.find('[data-test="undo-last"]').attributes('disabled')).toBeUndefined()
    w.unmount()
  })

  it('нажатие «Отменить» вызывает undoLast с выбранной датой и показывает новую сумму; при отказе сумма не меняется', async () => {
    const undoLast = vi.fn(async () => 500)
    const w = mount(WaterModal, { props: { ...base, canUndo: () => true, undoLast, setTotal: async () => 0 } })
    await w.find('[data-test="undo-last"]').trigger('click')
    await flushPromises()
    expect(undoLast).toHaveBeenCalledTimes(1)
    expect(w.text()).toContain('500 / 2000')
    undoLast.mockResolvedValueOnce(null as any)
    await w.find('[data-test="undo-last"]').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('500 / 2000')
    w.unmount()
  })

  it('карандашик открывает поле с текущей суммой; неверный ввод показывает ошибку и ничего не пишет', async () => {
    const setTotal = vi.fn(async (ml: number) => ml)
    const w = mount(WaterModal, { props: { ...base, canUndo: () => false, undoLast: async () => 0, setTotal } })
    expect(w.find('[data-test="edit-total-form"]').exists()).toBe(false)
    await w.find('[data-test="edit-total"]').trigger('click')
    const input = w.find('[data-test="edit-total-input"]')
    expect((input.element as HTMLInputElement).value).toBe('700')
    await input.setValue('-5')
    await w.find('[data-test="edit-total-save"]').trigger('click')
    expect(w.find('[data-test="edit-total-invalid"]').exists()).toBe(true)
    await input.setValue('99999')
    await w.find('[data-test="edit-total-save"]').trigger('click')
    expect(setTotal).not.toHaveBeenCalled()
    w.unmount()
  })

  it('верная сумма: setTotal(ml, дата), поле закрывается, в окне новая сумма; Enter тоже сохраняет, отмена закрывает без записи', async () => {
    const setTotal = vi.fn(async (ml: number) => ml)
    const w = mount(WaterModal, { props: { ...base, canUndo: () => false, undoLast: async () => 0, setTotal } })
    await w.find('[data-test="edit-total"]').trigger('click')
    await w.find('[data-test="edit-total-input"]').setValue('1500')
    await w.find('[data-test="edit-total-save"]').trigger('click')
    await flushPromises()
    expect(setTotal).toHaveBeenCalledWith(1500, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/))
    expect(w.find('[data-test="edit-total-form"]').exists()).toBe(false)
    expect(w.text()).toContain('1500 / 2000')

    await w.find('[data-test="edit-total"]').trigger('click')
    await w.find('[data-test="edit-total-input"]').setValue('1800')
    await w.find('[data-test="edit-total-input"]').trigger('keydown.enter')
    await flushPromises()
    expect(setTotal).toHaveBeenLastCalledWith(1800, expect.any(String))

    await w.find('[data-test="edit-total"]').trigger('click')
    await w.find('[data-test="edit-total-cancel"]').trigger('click')
    expect(w.find('[data-test="edit-total-form"]').exists()).toBe(false)
    expect(setTotal).toHaveBeenCalledTimes(2)
    w.unmount()
  })

  it('сбой записи правки: поле остаётся открытым, сумма в окне прежняя', async () => {
    const setTotal = vi.fn(async () => null as any)
    const w = mount(WaterModal, { props: { ...base, canUndo: () => false, undoLast: async () => 0, setTotal } })
    await w.find('[data-test="edit-total"]').trigger('click')
    await w.find('[data-test="edit-total-input"]').setValue('1200')
    await w.find('[data-test="edit-total-save"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-test="edit-total-form"]').exists()).toBe(true)
    expect(w.text()).toContain('700 / 2000')
    w.unmount()
  })
})
