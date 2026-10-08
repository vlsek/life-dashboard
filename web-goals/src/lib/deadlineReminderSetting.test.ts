import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import { DEADLINE_REMINDER_OFF_KEY, isDeadlineReminderEnabled, setDeadlineReminderEnabled } from './deadlineReminderSetting'

// BACKLOG 47.2: выключатель напоминания о сроках на странице «Цели»; плашка живёт в Дашборде, ключ общий.
beforeEach(() => localStorage.clear())

describe('выключатель напоминания', () => {
  it('по умолчанию включено; выключить и включить обратно', () => {
    expect(isDeadlineReminderEnabled()).toBe(true)
    setDeadlineReminderEnabled(false)
    expect(localStorage.getItem(DEADLINE_REMINDER_OFF_KEY)).toBe('1')
    expect(isDeadlineReminderEnabled()).toBe(false)
    setDeadlineReminderEnabled(true)
    expect(localStorage.getItem(DEADLINE_REMINDER_OFF_KEY)).toBeNull()
    expect(isDeadlineReminderEnabled()).toBe(true)
  })
  it('страж: ключ и значение «1» те же, что в Дашборде', () => {
    const dash: string = readFileSync('../web-dashboard/src/lib/goalDeadlineReminder.ts', 'utf-8')
    expect(dash).toContain(`DEADLINE_REMINDER_OFF_KEY = '${DEADLINE_REMINDER_OFF_KEY}'`)
    const comp: string = readFileSync('../web-dashboard/src/lib/useDeadlineReminder.ts', 'utf-8')
    expect(comp).toContain("write(DEADLINE_REMINDER_OFF_KEY, '1')")
    expect(comp).toContain("read(DEADLINE_REMINDER_OFF_KEY) !== '1'")
  })
})

import { ref } from 'vue'
import { vi } from 'vitest'
const h = vi.hoisted(() => ({ items: null as any }))
vi.mock('./useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u', userEmail: 'a@b.c' }),
    items: h.items,
    error: ref(null),
    flashed: ref({}),
    init: () => {},
    addGoal: vi.fn(), updateGoal: vi.fn(), deleteGoal: vi.fn(), toggleGoal: vi.fn(), stepGoal: vi.fn(), setStage: vi.fn(),
  }),
}))
import App from '../App.vue'

describe('страница «Цели»: галочка «Напоминать о сроках»', () => {
  it('отражает текущее значение и сохраняет изменение', async () => {
    h.items = ref([])
    setDeadlineReminderEnabled(false)
    const w = mount(App)
    const box = w.find('[data-test="deadline-remind-toggle"]')
    expect((box.element as HTMLInputElement).checked).toBe(false)
    await box.setValue(true)
    expect(isDeadlineReminderEnabled()).toBe(true)
    await box.setValue(false)
    expect(isDeadlineReminderEnabled()).toBe(false)
  })
})
