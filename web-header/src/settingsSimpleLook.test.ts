import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 50.1: ручной переключатель «Простое оформление» в «Глобальных настройках» (раздел «Эффекты»): site_simple=on → <html data-simple="on">.
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

async function openSettings(w: ReturnType<typeof mount>) {
  await w.find('[data-test="panel-open"]').trigger('click')
  await w.find('[data-test="panel-settings"]').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.documentElement.removeAttribute('data-simple')
  document.documentElement.className = ''
  db.rows = { metrics: [], daily_values: [], daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: [] }
})

describe('Глобальные настройки: «Простое оформление»', () => {
  it('по умолчанию выключено, с пояснением; в разделе «Эффекты»', async () => {
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    const cb = w.find('[data-test="simple-look"]')
    expect(cb.exists()).toBe(true)
    expect((cb.element as HTMLInputElement).checked).toBe(false)
    expect(cb.attributes('disabled')).toBeUndefined()
    expect(w.text()).toContain('Простое оформление')
    expect(w.text()).toContain('Отключает свечение')
    w.unmount()
  })

  it('включение пишет site_simple=on и сразу ставит data-simple на <html>; выключение снимает', async () => {
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    const cb = w.find('[data-test="simple-look"]')
    await cb.setValue(true)
    expect(localStorage.getItem('site_simple')).toBe('on')
    expect(document.documentElement.getAttribute('data-simple')).toBe('on')
    await cb.setValue(false)
    expect(localStorage.getItem('site_simple')).toBeNull()
    expect(document.documentElement.hasAttribute('data-simple')).toBe(false)
    w.unmount()
  })

  it('уже выбрано раньше — открывается отмеченным', async () => {
    localStorage.setItem('site_simple', 'on')
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    expect((w.find('[data-test="simple-look"]').element as HTMLInputElement).checked).toBe(true)
    w.unmount()
  })

  it('не мешает «Отключить все анимации»: это два независимых выключателя', async () => {
    const w = mount(App)
    await flushPromises()
    await openSettings(w)
    await w.find('[data-test="simple-look"]').setValue(true)
    expect(localStorage.getItem('site_motion')).toBeNull()
    expect(document.documentElement.getAttribute('data-motion')).toBeNull()
    w.unmount()
  })
})
