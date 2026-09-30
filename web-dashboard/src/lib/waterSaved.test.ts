import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import WaterSavedAnim from '../components/WaterSavedAnim.vue'
import WaterModal from '../components/WaterModal.vue'
import { t } from './i18n'
import type { Metric } from './types'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0))
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('WaterSavedAnim', () => {
  it('не показывается, пока tick = 0; после роста tick появляется и гаснет через ~1.4 с', async () => {
    const w = mount(WaterSavedAnim, { props: { tick: 0 }, global: { stubs: { transition: false } } })
    expect(w.find('[data-test="water-saved"]').exists()).toBe(false)
    await w.setProps({ tick: 1 })
    await vi.advanceTimersByTimeAsync(10)
    expect(w.find('[data-test="water-saved"]').exists()).toBe(true)
    await vi.advanceTimersByTimeAsync(1500)
    await nextTick()
    expect(w.find('[data-test="water-saved"]').exists()).toBe(false)
    w.unmount()
  })

  it('повторный tick перезапускает показ, а не обрывается таймером первого', async () => {
    const w = mount(WaterSavedAnim, { props: { tick: 0 }, global: { stubs: { transition: false } } })
    await w.setProps({ tick: 1 })
    await vi.advanceTimersByTimeAsync(1000)
    await w.setProps({ tick: 2 })
    await vi.advanceTimersByTimeAsync(700) // 1.7 с от первого tick: старый таймер уже сработал бы
    expect(w.find('[data-test="water-saved"]').exists()).toBe(true)
    w.unmount()
  })
})

const metric = { id: 'm', name: 'Вода', goal_value: 2000 } as unknown as Metric
const baseProps = { metric, currentMl: 500, normMl: 2000, autoNormMl: null, weightKg: null, getMlForDate: async () => 0 }

describe('WaterModal: норма и подтверждение', () => {
  it('кнопка нормы называется «Изменить дневную норму» и стоит под полем нормы, а не рядом с «Закрыть»', () => {
    const w = mount(WaterModal, { props: baseProps })
    const btn = w.find('[data-test="change-goal"]')
    expect(btn.text()).toBe('Изменить дневную норму')
    expect(w.find('.modal-actions').text()).not.toContain('норму')
    expect(w.find('.modal-actions').text()).toBe(t('dash_close_btn'))
    w.unmount()
  })

  it('«Дневная норма изменена» появляется только после подтверждения (goalSavedTick), ошибка записи показывается', async () => {
    const w = mount(WaterModal, { props: baseProps })
    expect(w.find('[data-test="goal-saved"]').exists()).toBe(false)
    await w.setProps({ goalSavedTick: 1 })
    expect(w.find('[data-test="goal-saved"]').text()).toContain('Дневная норма изменена')
    await w.setProps({ saveError: 'нет связи' })
    expect(w.find('[data-test="water-save-error"]').text()).toBe('нет связи')
    w.unmount()
  })

  it('быстрое добавление по-прежнему шлёт add, а анимации до подтверждения нет', async () => {
    const w = mount(WaterModal, { props: baseProps, global: { stubs: { transition: false } } })
    await w.find('[data-test="add-200"]').trigger('click')
    await vi.advanceTimersByTimeAsync(50)
    expect(w.emitted('add')?.[0]).toEqual([200, expect.any(String)])
    expect(w.find('[data-test="water-saved"]').exists()).toBe(false)
    await w.setProps({ savedTick: 1 })
    await vi.advanceTimersByTimeAsync(50)
    expect(w.find('[data-test="water-saved"]').exists()).toBe(true)
    w.unmount()
  })
})
