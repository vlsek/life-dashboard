import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterModal from '../components/WaterModal.vue'
import type { Metric } from './types'

// BACKLOG 17 (07:22): справка (i) у «Дневной нормы» не должна врать «задана вручную»; есть способ вернуть авто-расчёт по весу.
const metric = (goal: number | null) => ({ id: 'm1', user_id: 'u1', name: 'Вода', icon: '💧', type: 'number', unit: 'мл', goal_value: goal, goal_direction: null, schedule: null, category_id: null, position: 0 }) as unknown as Metric
const props = (goal: number | null, auto: number | null = 2100, weight: number | null = 70, height: number | null = null) => ({
  metric: metric(goal),
  currentMl: 500,
  normMl: goal ?? auto ?? 2000,
  autoNormMl: auto,
  weightKg: weight,
  heightCm: height,
  getMlForDate: async () => 0,
})
const alerts: string[] = []

beforeEach(() => {
  alerts.length = 0
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  vi.stubGlobal('alert', (m: string) => alerts.push(m))
})
afterEach(() => vi.unstubAllGlobals())

describe('WaterModal: справка о норме и возврат к авто-расчёту', () => {
  it('норма автоматическая: справка говорит «рассчитана автоматически по весу», кнопки возврата нет', async () => {
    const w = mount(WaterModal, { props: props(null) })
    await w.find('button[style*="border-radius: 50%"]').trigger('click')
    expect(alerts[0]).toContain('Рассчитана автоматически')
    expect(alerts[0]).toContain('70')
    expect(alerts[0]).toContain('2100')
    expect(alerts[0]).not.toContain('зафиксирована')
    expect(w.find('[data-test="auto-goal"]').exists()).toBe(false)
    w.unmount()
  })

  it('норма зафиксирована (в т.ч. осталась от шаблона): справка так и говорит и показывает, что дал бы расчёт по весу', async () => {
    const w = mount(WaterModal, { props: props(2500) })
    await w.find('button[style*="border-radius: 50%"]').trigger('click')
    expect(alerts[0]).toContain('зафиксирована')
    expect(alerts[0]).toContain('шаблона')
    expect(alerts[0]).toContain('2100')
    expect(alerts[0]).toContain('«Изменить дневную норму»')
    w.unmount()
  })

  it('кнопка «Считать автоматически (N мл)» есть только при зафиксированной норме и известном весе; клик шлёт resetGoal', async () => {
    const w = mount(WaterModal, { props: props(2500) })
    const btn = w.find('[data-test="auto-goal"]')
    expect(btn.exists()).toBe(true)
    expect(btn.text()).toContain('2100')
    await btn.trigger('click')
    expect(w.emitted('resetGoal')).toHaveLength(1)
    w.unmount()

    const noWeight = mount(WaterModal, { props: props(2500, null, null) })
    expect(noWeight.find('[data-test="auto-goal"]').exists()).toBe(false)
    noWeight.unmount()
  })

  it('подтверждение после возврата: «Норма снова считается по весу», после смены — «Дневная норма изменена»', async () => {
    const w = mount(WaterModal, { props: { ...props(null), goalSavedTick: 1, goalSavedMsg: 'auto' as const } })
    expect(w.find('[data-test="goal-saved"]').text()).toContain('Норма снова считается по весу')
    await w.setProps({ goalSavedMsg: 'manual' as const })
    expect(w.find('[data-test="goal-saved"]').text()).toContain('Дневная норма изменена')
    w.unmount()
  })
})

describe('WaterModal: рост в авто-норме (BACKLOG 17)', () => {
  it('известен рост: справка называет вес, рост, площадь поверхности тела (Мостеллер) и итог', () => {
    const w = mount(WaterModal, { props: props(null, 2210, 70, 175) })
    w.find('button[style*="border-radius: 50%"]').trigger('click')
    expect(alerts[0]).toContain('по весу и росту')
    expect(alerts[0]).toContain('70 кг')
    expect(alerts[0]).toContain('175 см')
    expect(alerts[0]).toContain('1.84')
    expect(alerts[0]).toContain('Мостеллера')
    expect(alerts[0]).toContain('2210')
    w.unmount()
  })

  it('рост неизвестен: справка считает по весу и предлагает указать рост', () => {
    const w = mount(WaterModal, { props: props(null, 2100, 70, null) })
    w.find('button[style*="border-radius: 50%"]').trigger('click')
    expect(alerts[0]).toContain('70 кг × 30 мл = 2100')
    expect(alerts[0]).toContain('Укажите рост')
    w.unmount()
  })

  it('поле роста: значение из профиля подставляется, «Сохранить рост» шлёт saveHeight', async () => {
    const w = mount(WaterModal, { props: props(null, 2210, 70, 175) })
    expect((w.find('[data-test="height-input"]').element as HTMLInputElement).value).toBe('175')
    await w.find('[data-test="height-input"]').setValue('180')
    await w.find('[data-test="save-height"]').trigger('click')
    expect(w.emitted('saveHeight')![0]).toEqual([180])
    w.unmount()
  })

  it('неправдоподобный рост не отправляется, показывается подсказка', async () => {
    const w = mount(WaterModal, { props: props(null, 2100, 70, null) })
    await w.find('[data-test="height-input"]').setValue('17')
    await w.find('[data-test="save-height"]').trigger('click')
    expect(w.emitted('saveHeight')).toBeUndefined()
    expect(w.find('[data-test="height-error"]').text()).toContain('от 100 до 250')
    w.unmount()
  })

  it('подтверждение «Рост сохранён — норма пересчитана»', () => {
    const w = mount(WaterModal, { props: { ...props(null), goalSavedTick: 1, goalSavedMsg: 'height' as const } })
    expect(w.find('[data-test="goal-saved"]').text()).toContain('Рост сохранён')
    w.unmount()
  })
})
