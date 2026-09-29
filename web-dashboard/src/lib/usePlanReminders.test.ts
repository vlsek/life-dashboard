import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { notifyDataChanged } from './events'

const db = vi.hoisted(() => ({ planned: [] as unknown[], goals: [] as unknown[] }))
vi.mock('./supabase', () => {
  const chain = (table: string) => {
    const q: any = {
      select: () => q, eq: () => q,
      maybeSingle: () => Promise.resolve({ data: { planned_goals: db.planned }, error: null }),
      then: (res: (v: unknown) => unknown) => res({ data: table === 'goals' ? db.goals : [], error: null }),
    }
    return q
  }
  return { sb: { from: (table: string) => chain(table) } }
})

import { PLAN_REMINDERS_KEY, usePlanReminders } from './usePlanReminders'

const shown = vi.fn()
class FakeNotification {
  static permission = 'granted'
  constructor(title: string, opts: { body: string; tag: string }) { shown(title, opts.body, opts.tag) }
}

function setup() {
  let api!: ReturnType<typeof usePlanReminders>
  const w = mount(defineComponent({ setup() { api = usePlanReminders(); return () => h('div') } }))
  return { api, w }
}

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  shown.mockClear()
  FakeNotification.permission = 'granted'
  ;(globalThis as any).Notification = FakeNotification
  db.goals = []
  db.planned = [{ type: 'custom', text: 'Позвонить', time: '15:00', done: false }, { type: 'custom', text: 'Без времени', done: false }]
})
afterEach(() => { vi.useRealTimers(); delete (globalThis as any).Notification })

describe('usePlanReminders', () => {
  it('nothing visible before the time, then appears by itself when it comes (30s timer) + one system notification', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 14, 59, 40))
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toEqual([])
    expect(shown).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(api.visible.value.map((d) => d.text)).toEqual(['Позвонить'])
    expect(shown).toHaveBeenCalledTimes(1)
    expect(shown.mock.calls[0][1]).toBe('15:00 · Позвонить')
    await vi.advanceTimersByTimeAsync(120_000) // дальше таймер не должен повторять то же уведомление
    expect(shown).toHaveBeenCalledTimes(1)
    w.unmount()
  })

  it('does not repeat the system notification after a page reload the same day', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 16, 0))
    const first = setup()
    await first.api.load('u')
    expect(shown).toHaveBeenCalledTimes(1)
    first.w.unmount()
    const second = setup() // «перезагрузка»
    await second.api.load('u')
    expect(second.api.visible.value).toHaveLength(1) // плашка всё ещё показывает — пункт не выполнен
    expect(shown).toHaveBeenCalledTimes(1)
    second.w.unmount()
  })

  it('without permission the banner still shows, no system notification is attempted', async () => {
    FakeNotification.permission = 'denied'
    vi.setSystemTime(new Date(2026, 8, 29, 16, 0))
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toHaveLength(1)
    expect(shown).not.toHaveBeenCalled()
    w.unmount()
  })

  it('works when the Notification API does not exist at all', async () => {
    delete (globalThis as any).Notification
    vi.setSystemTime(new Date(2026, 8, 29, 16, 0))
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toHaveLength(1)
    w.unmount()
  })

  it('dismiss hides one reminder for the day and remembers it', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 16, 0))
    const first = setup()
    await first.api.load('u')
    first.api.dismiss(first.api.visible.value[0].key)
    expect(first.api.visible.value).toEqual([])
    expect(localStorage.getItem(`${PLAN_REMINDERS_KEY}:2026-09-29`)).toContain('Позвонить')
    first.w.unmount()
    const second = setup()
    await second.api.load('u')
    expect(second.api.visible.value).toEqual([])
    second.w.unmount()
  })

  it('disappears once the item is done (DATA_CHANGED triggers a reload)', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 16, 0))
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value).toHaveLength(1)
    db.planned = [{ type: 'custom', text: 'Позвонить', time: '15:00', done: true }]
    notifyDataChanged({ source: 'plan', date: '2026-09-29' })
    await vi.advanceTimersByTimeAsync(0)
    expect(api.visible.value).toEqual([])
    w.unmount()
  })

  it('a goal item is done by the goal state, and a deleted goal never reminds', async () => {
    vi.setSystemTime(new Date(2026, 8, 29, 16, 0))
    db.planned = [{ type: 'goal', text: 'Прочитать', time: '10:00' }, { type: 'goal', text: 'Удалённая', time: '10:00' }]
    db.goals = [{ id: 'g1', name: 'Прочитать', stages: 1, done: false, current_stage: 0 }]
    const { api, w } = setup()
    await api.load('u')
    expect(api.visible.value.map((d) => d.text)).toEqual(['Прочитать'])
    w.unmount()
  })
})
