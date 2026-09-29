import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { t } from './i18n'

// Отдельный файл от plannedComponents.test.ts (тот про сам план) — здесь только то, что добавила
// v1.20: время у пункта и кнопка «Включить уведомления».
const h = vi.hoisted(() => ({ calls: [] as any[], noteData: null as any }))
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'daily_notes' ? h.noteData : null, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (payload: unknown) => (h.calls.push({ table, payload }), Promise.resolve({ error: null })),
      }
      return chain
    },
  },
}))

import PlannedSection from '../components/PlannedSection.vue'

const q = (sel: string) => document.body.querySelector<HTMLElement>(sel)
const lastPlan = () => h.calls.at(-1)?.payload.planned_goals
let w: VueWrapper | null = null
async function mountSection() {
  w = mount(PlannedSection, { props: { userId: 'u1' }, attachTo: document.body })
  await flushPromises()
}
function type(el: HTMLInputElement, value: string, ev = 'input') {
  el.value = value
  el.dispatchEvent(new Event(ev))
}

beforeEach(() => {
  h.calls = []
  h.noteData = null
  localStorage.setItem('site_lang', 'ru')
  delete (globalThis as any).Notification
})
afterEach(() => {
  w?.unmount()
  w = null
  document.body.innerHTML = ''
})

describe('PlannedSection: время и уведомления', () => {
  it('заголовок блока — «Планы»', async () => {
    await mountSection()
    expect(q('[data-test="planned"] h2')!.textContent).toContain('Планы')
  })

  it('пункт, добавленный со временем, сохраняется с полем time и время очищается в форме', async () => {
    await mountSection()
    type(q('[data-test="custom-input"]') as HTMLInputElement, 'Позвонить')
    type(q('[data-test="new-time"]') as HTMLInputElement, '15:30')
    q('[data-test="add-custom"]')!.click()
    await flushPromises()
    expect(lastPlan()).toEqual([{ type: 'custom', text: 'Позвонить', done: false, time: '15:30' }])
    expect((q('[data-test="new-time"]') as HTMLInputElement).value).toBe('')
  })

  it('пункт без времени сохраняется без поля time', async () => {
    await mountSection()
    type(q('[data-test="custom-input"]') as HTMLInputElement, 'Купить хлеб')
    q('[data-test="add-custom"]')!.click()
    await flushPromises()
    expect('time' in lastPlan()[0]).toBe(false)
  })

  it('время в строке показывает сохранённое; смена пишет новое, очистка убирает поле', async () => {
    h.noteData = { planned_goals: [{ type: 'custom', text: 'Позвонить', done: false, time: '15:30' }] }
    await mountSection()
    const input = q('[data-test="time"]') as HTMLInputElement
    expect(input.value).toBe('15:30')
    type(input, '16:45', 'change')
    await flushPromises()
    expect(lastPlan()[0].time).toBe('16:45')
    type(q('[data-test="time"]') as HTMLInputElement, '', 'change')
    await flushPromises()
    expect('time' in lastPlan()[0]).toBe(false)
    expect(lastPlan()[0].text).toBe('Позвонить')
  })

  it('кнопка «Включить уведомления» запрашивает разрешение и исчезает после «granted»', async () => {
    const request = vi.fn(async () => 'granted')
    ;(globalThis as any).Notification = { permission: 'default', requestPermission: request }
    await mountSection()
    expect(q('[data-test="notify"]')!.textContent).toContain(t('plan_notify_hint'))
    q('[data-test="notify-enable"]')!.click()
    await flushPromises()
    expect(request).toHaveBeenCalledTimes(1)
    expect(q('[data-test="notify"]')).toBeNull()
  })

  it('при запрете — только пояснение без кнопки; без поддержки API блока нет вовсе', async () => {
    ;(globalThis as any).Notification = { permission: 'denied', requestPermission: vi.fn() }
    await mountSection()
    expect(q('[data-test="notify-enable"]')).toBeNull()
    expect(q('[data-test="notify"]')!.textContent).toContain(t('plan_notify_denied'))
    w!.unmount()
    document.body.innerHTML = ''
    delete (globalThis as any).Notification
    await mountSection()
    expect(q('[data-test="notify"]')).toBeNull()
  })
})
