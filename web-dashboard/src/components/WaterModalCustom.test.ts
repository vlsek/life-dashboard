import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterModal from './WaterModal.vue'
import type { Metric } from '../lib/types'

// BACKLOG 573 «Аудит устаревшего оформления»: «своё количество воды» — поле в окне воды вместо системного prompt()
const metric: Metric = { id: 'm1', user_id: 'u1', name: 'Water', icon: '💧', type: 'number', unit: 'мл', goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0 }
const base = { metric, currentMl: 700, normMl: 2000, autoNormMl: null, weightKg: null, getMlForDate: async () => 0 }
const input = (w: ReturnType<typeof mount>) => w.find('[data-test="custom-input"]')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('WaterModal: своё количество воды', () => {
  it('кнопка «+ Своё» открывает поле прямо в окне (системный prompt не вызывается) и закрывает его повторным нажатием', async () => {
    const prompt = vi.fn()
    vi.stubGlobal('prompt', prompt)
    const w = mount(WaterModal, { props: base, attachTo: document.body })
    expect(w.find('[data-test="custom-form"]').exists()).toBe(false)
    await w.find('[data-test="add-custom"]').trigger('click')
    expect(w.find('[data-test="custom-form"]').exists()).toBe(true)
    expect(w.find('[data-test="add-custom"]').attributes('aria-expanded')).toBe('true')
    expect(w.text()).toContain('Сколько мл добавить?')
    await w.find('[data-test="add-custom"]').trigger('click')
    expect(w.find('[data-test="custom-form"]').exists()).toBe(false)
    expect(prompt).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
    w.unmount()
  })

  it('поле получает фокус при открытии', async () => {
    const w = mount(WaterModal, { props: base, attachTo: document.body })
    await w.find('[data-test="add-custom"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(document.activeElement).toBe(input(w).element)
    w.unmount()
  })

  it('«Добавить» шлёт add(мл, дата) и обновляет сумму в окне; поле закрывается', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-custom"]').trigger('click')
    await input(w).setValue('350')
    await w.find('[data-test="custom-add"]').trigger('click')
    const ev = w.emitted('add')!
    expect(ev).toHaveLength(1)
    expect(ev[0][0]).toBe(350)
    expect(ev[0][1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(w.text()).toContain('1050 / 2000')
    expect(w.find('[data-test="custom-form"]').exists()).toBe(false)
    w.unmount()
  })

  it('Enter тоже добавляет, Esc закрывает без записи', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-custom"]').trigger('click')
    await input(w).setValue('150')
    await input(w).trigger('keydown', { key: 'Enter' })
    expect(w.emitted('add')![0][0]).toBe(150)
    await w.find('[data-test="add-custom"]').trigger('click')
    await input(w).setValue('999')
    await input(w).trigger('keydown', { key: 'Escape' })
    expect(w.find('[data-test="custom-form"]').exists()).toBe(false)
    expect(w.emitted('add')).toHaveLength(1)
    w.unmount()
  })

  it('неверное число (пусто, 0, минус, больше 20000, не число) — подсказка и ничего не пишется', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-custom"]').trigger('click')
    for (const bad of ['', '0', '-5', '20001', '99999', 'abc']) {
      await input(w).setValue(bad)
      await w.find('[data-test="custom-add"]').trigger('click')
      expect(w.find('[data-test="custom-invalid"]').exists(), `«${bad}»`).toBe(true)
    }
    expect(w.emitted('add')).toBeUndefined()
    expect(w.find('[data-test="custom-form"]').exists()).toBe(true) // поле осталось, можно поправить
    w.unmount()
  })

  it('дробное число округляется вниз (как раньше), ровно 20000 допустимо', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-custom"]').trigger('click')
    await input(w).setValue('250.9')
    await w.find('[data-test="custom-add"]').trigger('click')
    expect(w.emitted('add')![0][0]).toBe(250)
    await w.find('[data-test="add-custom"]').trigger('click')
    await input(w).setValue('20000')
    await w.find('[data-test="custom-add"]').trigger('click')
    expect(w.emitted('add')![1][0]).toBe(20000)
    w.unmount()
  })

  it('«Отмена» закрывает поле без записи; после ошибки и повторного открытия подсказки нет', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-custom"]').trigger('click')
    await input(w).setValue('0')
    await w.find('[data-test="custom-add"]').trigger('click')
    expect(w.find('[data-test="custom-invalid"]').exists()).toBe(true)
    await w.find('[data-test="custom-cancel"]').trigger('click')
    expect(w.find('[data-test="custom-form"]').exists()).toBe(false)
    await w.find('[data-test="add-custom"]').trigger('click')
    expect(w.find('[data-test="custom-invalid"]').exists()).toBe(false)
    expect((input(w).element as HTMLInputElement).value).toBe('')
    expect(w.emitted('add')).toBeUndefined()
    w.unmount()
  })

  it('быстрые кнопки +200 мл и +1 л работают как раньше', async () => {
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-200"]').trigger('click')
    expect(w.emitted('add')![0][0]).toBe(200)
    w.unmount()
  })

  it('открытие «своего количества» закрывает правку суммы за день и наоборот', async () => {
    const w = mount(WaterModal, { props: { ...base, canUndo: () => false, undoLast: async () => 0, setTotal: async (ml: number) => ml } })
    await w.find('[data-test="edit-total"]').trigger('click')
    expect(w.find('[data-test="edit-total-form"]').exists()).toBe(true)
    await w.find('[data-test="add-custom"]').trigger('click')
    expect(w.find('[data-test="edit-total-form"]').exists()).toBe(false)
    expect(w.find('[data-test="custom-form"]').exists()).toBe(true)
    await w.find('[data-test="edit-total"]').trigger('click')
    expect(w.find('[data-test="custom-form"]').exists()).toBe(false)
    expect(w.find('[data-test="edit-total-form"]').exists()).toBe(true)
    w.unmount()
  })

  it('английский интерфейс: подписи и подсказка об ошибке', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(WaterModal, { props: base })
    await w.find('[data-test="add-custom"]').trigger('click')
    expect(w.text()).toContain('How many ml to add?')
    expect(w.find('[data-test="custom-add"]').text()).toBe('Add')
    await w.find('[data-test="custom-add"]').trigger('click')
    expect(w.find('[data-test="custom-invalid"]').text()).toContain('from 1 to 20000')
    w.unmount()
  })
})
