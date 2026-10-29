import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NATIVE_REMINDERS, NATIVE_REMINDERS_KEY, loadNativeReminders, nativeRemindersAvailable, sanitizeNativeReminders, saveAndApplyNativeReminders } from './nativeReminders'

const g = globalThis as { __ldNative?: unknown }
beforeEach(() => localStorage.clear())
afterEach(() => { delete g.__ldNative })

describe('sanitizeNativeReminders', () => {
  it('мусор и пустота → значения по умолчанию, всё выключено', () => {
    expect(sanitizeNativeReminders(null)).toEqual(DEFAULT_NATIVE_REMINDERS)
    expect(sanitizeNativeReminders('x')).toEqual(DEFAULT_NATIVE_REMINDERS)
  })
  it('границы окна воды упорядочиваются, шаг и часы зажимаются', () => {
    const r = sanitizeNativeReminders({ water: { enabled: true, fromHour: 22, toHour: 7, everyHours: 99 } })
    expect(r.water).toEqual({ enabled: true, fromHour: 7, toHour: 22, everyHours: 12 })
    expect(sanitizeNativeReminders({ water: { everyHours: 0, fromHour: -5 } }).water).toMatchObject({ everyHours: 1, fromHour: 0 })
  })
  it('время тренировки нормализуется, дни — без дублей и мусора, по возрастанию', () => {
    const r = sanitizeNativeReminders({ workout: { enabled: true, time: '7:05', weekdays: [5, 1, 5, 0, 8, 'x', 2.5] } })
    expect(r.workout).toEqual({ enabled: true, time: '07:05', weekdays: [1, 5] })
    expect(sanitizeNativeReminders({ workout: { time: '25:00' } }).workout.time).toBe('18:30')
  })
  it('«включено» только при настоящем true', () => {
    expect(sanitizeNativeReminders({ water: { enabled: 'yes' }, workout: { enabled: 1 } })).toMatchObject({ water: { enabled: false }, workout: { enabled: false } })
  })
})

describe('сохранение и применение', () => {
  it('в браузере: раздел недоступен, настройки всё равно сохраняются, применить нечем (false)', async () => {
    expect(nativeRemindersAvailable()).toBe(false)
    expect(await saveAndApplyNativeReminders({ ...DEFAULT_NATIVE_REMINDERS, water: { ...DEFAULT_NATIVE_REMINDERS.water, enabled: true } })).toBe(false)
    expect(loadNativeReminders().water.enabled).toBe(true)
  })
  it('в приложении: зовёт applyReminders с очищенными настройками, возвращает его ответ', async () => {
    const apply = vi.fn(async () => true)
    g.__ldNative = { isNative: true, applyReminders: apply }
    expect(nativeRemindersAvailable()).toBe(true)
    const ok = await saveAndApplyNativeReminders({ water: { enabled: true, fromHour: 20, toHour: 8, everyHours: 3 }, workout: { enabled: false, time: '18:30', weekdays: [] } })
    expect(ok).toBe(true)
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ water: { enabled: true, fromHour: 8, toHour: 20, everyHours: 3 } }))
  })
  it('отказ в разрешении (false) и исключение плагина не ломают сохранение', async () => {
    g.__ldNative = { isNative: true, applyReminders: async () => false }
    expect(await saveAndApplyNativeReminders(DEFAULT_NATIVE_REMINDERS)).toBe(false)
    g.__ldNative = { isNative: true, applyReminders: async () => { throw new Error('x') } }
    expect(await saveAndApplyNativeReminders(DEFAULT_NATIVE_REMINDERS)).toBe(false)
    expect(localStorage.getItem(NATIVE_REMINDERS_KEY)).toBeTruthy()
  })
  it('битый JSON в хранилище → значения по умолчанию', () => {
    localStorage.setItem(NATIVE_REMINDERS_KEY, '{oops')
    expect(loadNativeReminders()).toEqual(DEFAULT_NATIVE_REMINDERS)
  })
})
