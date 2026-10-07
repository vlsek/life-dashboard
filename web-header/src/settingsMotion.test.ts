import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 513: выключатели «Отключить все анимации» и «Поздравления за серии» живут ТОЛЬКО в «Глобальных настройках» (шапка);
// из окна «Настроить Дашборд» они убраны. Сюда перенесён тест оттуда: при системном «уменьшить движение» переключатель
// включён и заблокирован, с пояснением, а выбор не пишется (запись/снятие обычного случая — в App.test.ts).
const db = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]> }))
vi.mock('./lib/supabase', () => {
  const chain = (table: string) => {
    const c: any = {
      select: () => c,
      eq: () => c,
      gte: () => c,
      order: () => c,
      limit: () => c,
      range: () => c,
      maybeSingle: () => Promise.resolve({ data: (db.rows[table] || [])[0] ?? null, error: null }),
      upsert: () => Promise.resolve({ error: null }),
      update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: db.rows[table] || [], error: null }).then(res),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) }, from: chain } }
})

import App from './App.vue'

function mockSystemReduce(reduce: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('prefers-reduced-motion'), media: q, addEventListener() {}, removeEventListener() {} }))
}
async function openSettings(w: ReturnType<typeof mount>) {
  await w.find('[data-test="panel-open"]').trigger('click')
  await w.find('[data-test="panel-settings"]').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.documentElement.removeAttribute('data-motion')
  document.documentElement.className = ''
  db.rows = { metrics: [], daily_values: [], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: [] }
  mockSystemReduce(false)
})
afterEach(() => vi.unstubAllGlobals())

describe('Глобальные настройки: «Отключить все анимации»', () => {
  it('выключен по умолчанию и доступен для изменения; пояснение — про обычный случай', async () => {
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    const cb = w.find('[data-test="motion-off"]')
    expect((cb.element as HTMLInputElement).checked).toBe(false)
    expect(cb.attributes('disabled')).toBeUndefined()
    expect(w.text()).toContain('Отключить все анимации')
    w.unmount()
  })

  it('уже выбрано раньше — открывается отмеченным', async () => {
    localStorage.setItem('site_motion', 'off')
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    expect((w.find('[data-test="motion-off"]').element as HTMLInputElement).checked).toBe(true)
    w.unmount()
  })

  it('при системном «уменьшить движение»: отмечен, заблокирован, с пояснением; выбор не пишется', async () => {
    mockSystemReduce(true)
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    const cb = w.find('[data-test="motion-off"]')
    expect((cb.element as HTMLInputElement).checked).toBe(true)
    expect(cb.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('уменьшить движение')
    expect(localStorage.getItem('site_motion')).toBeNull()
    w.unmount()
  })
})
