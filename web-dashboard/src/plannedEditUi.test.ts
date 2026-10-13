import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { todayStr } from './lib/date'

// BACKLOG 61.3/61.4 в интерфейсе «Планов»: правка пункта и время выполнения у галки (сегодняшний день).
const h = vi.hoisted(() => ({ writes: [] as { planned_goals: Array<Record<string, unknown>> }[], initial: [] as unknown[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: { planned_goals: h.initial }, error: null }),
        then: (res: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res),
        upsert: (p: { planned_goals: Array<Record<string, unknown>> }) => (h.writes.push(p), Promise.resolve({ error: null })),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'

beforeEach(() => {
  h.writes = []
  h.initial = [{ type: 'custom', text: 'Йога', done: false, time: '09:00' }]
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})
const mountPlanned = async (date: string) => {
  const w = mount(PlannedSection, { props: { userId: 'u1', date }, attachTo: document.body })
  await flushPromises()
  return w
}

describe('«Планы»: правка и время выполнения', () => {
  it('карандаш открывает правку, «Сохранить» пишет новое название и время', async () => {
    const w = await mountPlanned(todayStr())
    await w.find('[data-test="edit"]').trigger('click')
    await w.find('[data-test="edit-text"]').setValue('Растяжка')
    await w.find('[data-test="edit-time"]').setValue('08:15')
    await w.find('[data-test="edit-save"]').trigger('click')
    await flushPromises()
    expect(h.writes.at(-1)!.planned_goals[0]).toMatchObject({ text: 'Растяжка', time: '08:15' })
    expect(w.find('[data-test="edit-row"]').exists()).toBe(false)
  })
  it('пустое название — «Сохранить» недоступна, «Отмена» закрывает без записи', async () => {
    const w = await mountPlanned(todayStr())
    await w.find('[data-test="edit"]').trigger('click')
    await w.find('[data-test="edit-text"]').setValue('  ')
    expect(w.find('[data-test="edit-save"]').attributes('disabled')).toBeDefined()
    await w.find('[data-test="edit-cancel"]').trigger('click')
    expect(w.find('[data-test="edit-row"]').exists()).toBe(false)
    expect(h.writes).toEqual([])
  })
  it('галка сегодня ставит время выполнения и показывает его; снятие убирает', async () => {
    const w = await mountPlanned(todayStr())
    await w.find('[data-test="custom-check"]').setValue(true)
    await flushPromises()
    expect(h.writes.at(-1)!.planned_goals[0].doneAt).toMatch(/^\d\d:\d\d$/)
    expect(w.find('[data-test="done-at"]').exists()).toBe(true)
    await w.find('[data-test="custom-check"]').setValue(false)
    await flushPromises()
    expect('doneAt' in h.writes.at(-1)!.planned_goals[0]).toBe(false)
    expect(w.find('[data-test="done-at"]').exists()).toBe(false)
  })
  it('галка в плане прошлого дня время не ставит', async () => {
    const w = await mountPlanned('2026-01-05')
    await w.find('[data-test="custom-check"]').setValue(true)
    await flushPromises()
    expect('doneAt' in h.writes.at(-1)!.planned_goals[0]).toBe(false)
  })
})
