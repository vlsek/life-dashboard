import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import NativeRemindersSection from './NativeRemindersSection.vue'
import { trackWater as realTrackWater } from '../lib/waterTracking'

const trackWater = realTrackWater as unknown as { value: boolean } // в моке это обычная ссылка, а тип — computed только для чтения
// «Отслеживать воду» в настоящем модуле — computed только для чтения; подменяем изменяемой ссылкой
vi.mock('../lib/waterTracking', async () => ({ trackWater: (await import('vue')).ref(true) }))

const g = globalThis as { __ldNative?: unknown }
beforeEach(() => { localStorage.clear(); trackWater.value = true })
afterEach(() => { delete g.__ldNative })

describe('NativeRemindersSection', () => {
  it('в браузере раздела нет', () => {
    expect(mount(NativeRemindersSection).find('[data-test="native-reminders"]').exists()).toBe(false)
  })
  it('в приложении: включение воды применяет напоминания, смена шага — применяет заново', async () => {
    const apply = vi.fn(async () => true)
    g.__ldNative = { isNative: true, applyReminders: apply }
    const w = mount(NativeRemindersSection)
    expect(w.find('[data-test="native-reminders"]').exists()).toBe(true)
    await w.get('[data-test="nr-water"]').setValue(true)
    await flushPromises()
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ water: expect.objectContaining({ enabled: true, everyHours: 2 }) }))
    await w.get('[data-test="nr-water-every"]').setValue('4')
    await flushPromises()
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ water: expect.objectContaining({ everyHours: 4 }) }))
    expect(w.find('[data-test="nr-denied"]').exists()).toBe(false)
  })
  it('отказ в разрешении показывает подсказку; тренировка: дни переключаются', async () => {
    const apply = vi.fn(async () => false)
    g.__ldNative = { isNative: true, applyReminders: apply }
    const w = mount(NativeRemindersSection)
    await w.get('[data-test="nr-workout"]').setValue(true)
    await flushPromises()
    expect(w.find('[data-test="nr-denied"]').exists()).toBe(true)
    await w.get('[data-test="nr-day-2"]').setValue(true)
    await flushPromises()
    expect(apply).toHaveBeenLastCalledWith(expect.objectContaining({ workout: expect.objectContaining({ weekdays: [1, 2, 3, 5] }) }))
  })
  it('без «отслеживать воду» блока воды нет, тренировка есть', () => {
    trackWater.value = false
    g.__ldNative = { isNative: true, applyReminders: async () => true }
    const w = mount(NativeRemindersSection)
    expect(w.find('[data-test="nr-water"]').exists()).toBe(false)
    expect(w.find('[data-test="nr-workout"]').exists()).toBe(true)
  })
})
