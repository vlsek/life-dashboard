import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import WaterModal from '../components/WaterModal.vue'
import type { Metric } from './types'

// BACKLOG 17 (07:22): справка (i) у «Дневной нормы» не должна врать «задана вручную»; есть способ вернуть авто-расчёт по весу.
const metric = (goal: number | null) => ({ id: 'm1', user_id: 'u1', name: 'Вода', icon: '💧', type: 'number', unit: 'мл', goal_value: goal, goal_direction: null, schedule: null, category_id: null, position: 0 }) as unknown as Metric
const props = (goal: number | null, auto: number | null = 2100, weight: number | null = 70) => ({
  metric: metric(goal),
  currentMl: 500,
  normMl: goal ?? auto ?? 2000,
  autoNormMl: auto,
  weightKg: weight,
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
