import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// «Отслеживать воду» (BACKLOG 932): выключатель в настройках шапки и поведение шапки, когда учёт выключен.
// Фейковый Supabase — как в App.test.ts: from(table) отдаёт rows[table], upsert пишется в writes.
const db = vi.hoisted(() => ({
  rows: {} as Record<string, unknown[]>,
  writes: [] as { table: string; op: string; payload: unknown }[],
  upsertError: null as null | { message: string; code?: string },
}))
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
      upsert: (payload: unknown) => {
        db.writes.push({ table, op: 'upsert', payload })
        return Promise.resolve({ error: db.upsertError })
      },
      update: (payload: unknown) => {
        db.writes.push({ table, op: 'update', payload })
        return { eq: () => Promise.resolve({ error: null }) }
      },
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: db.rows[table] || [], error: null }).then(res),
    }
    return c
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } } }) }, from: chain } }
})

import App from './App.vue'
import RightPanel from './components/RightPanel.vue'
import SettingsModal from './components/SettingsModal.vue'
import { _resetTrackWaterForTests, saveTrackWater } from './lib/waterTracking'
import { todayStr } from './lib/date'

const today = todayStr()
const waterMetric = { id: 'w', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, active: true, position: 1, user_id: 'u1' }
const habit = { id: 'h', name: 'Зарядка', icon: null, type: 'boolean', goal_value: null, active: true, position: 2, user_id: 'u1' }
const values = [{ date: today, metric_id: 'h', value: true }, { date: today, metric_id: 'w', value: 500 }]

function setup(rows: Record<string, unknown[]>) {
  db.rows = { metrics: [waterMetric, habit], daily_values: values, daily_notes: [], goals: [], body_parameters: [], body_parameter_values: [], workout_exercises: [], workout_entries: [], profiles: [], ...rows }
}
const dayTitle = (w: ReturnType<typeof mount>) => w.find('[data-kind="day"]').attributes('title')

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  db.writes = []
  db.upsertError = null
  _resetTrackWaterForTests()
})

describe('шапка: учёт воды выключен в профиле', () => {
  it('контроль — включено (флаг true или профиля нет): стакан есть, вода в кольце дня (1 из 2)', async () => {
    setup({ profiles: [{ track_water: true }] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="water-badge"]').exists()).toBe(true)
    expect(dayTitle(w)).toContain('Прогресс дня: 50% (1/2)')
    expect(w.findComponent(RightPanel).props('water')).not.toBeNull()
    w.unmount()
  })

  it('выключено: нет стакана, нет блока воды в правой панели, воды нет в кольце дня (1 из 1)', async () => {
    setup({ profiles: [{ track_water: false }] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="water-badge"]').exists()).toBe(false)
    expect(w.findComponent(RightPanel).props('water')).toBeNull()
    expect(w.find('[data-kind="day"]').exists()).toBe(true) // кольца остаются
    expect(dayTitle(w)).toContain('Прогресс дня: 100% (1/1)')
    w.unmount()
  })

  it('кэш устройства работает без сети: профиля нет, но на этом устройстве выключено — стакана нет сразу', async () => {
    localStorage.setItem('track_water_off:u1', '1')
    setup({ profiles: [] })
    const w = mount(App)
    await flushPromises()
    expect(w.find('[data-test="water-badge"]').exists()).toBe(false)
    expect(dayTitle(w)).toContain('(1/1)')
    w.unmount()
  })

  it('выключили на лету: стакан пропадает, открытое окно воды закрывается, кольцо пересчитывается', async () => {
    setup({})
    const w = mount(App)
    await flushPromises()
    await w.find('[data-test="water-badge"]').trigger('click')
    expect(w.find('[data-test="water-modal"]').exists()).toBe(true)
    expect(await saveTrackWater('u1', false)).toEqual({ ok: true })
    await flushPromises()
    expect(w.find('[data-test="water-modal"]').exists()).toBe(false)
    expect(w.find('[data-test="water-badge"]').exists()).toBe(false)
    expect(dayTitle(w)).toContain('(1/1)')
    // и обратно: включили — вода возвращается
    await saveTrackWater('u1', true)
    await flushPromises()
    expect(w.find('[data-test="water-badge"]').exists()).toBe(true)
    expect(dayTitle(w)).toContain('(1/2)')
    w.unmount()
  })

  it('выключенная вода не мешает остальному: данные воды не удаляются и не пишутся', async () => {
    setup({ profiles: [{ track_water: false }] })
    const w = mount(App)
    await flushPromises()
    expect(db.writes.filter((x) => x.table === 'daily_values' || x.table === 'water_log')).toEqual([])
    w.unmount()
  })
})

describe('настройки шапки: выключатель «Отслеживать воду»', () => {
  const open = async () => {
    const w = mount(SettingsModal, { props: { userId: 'u1' } })
    await flushPromises()
    return w
  }
  const toggle = (w: ReturnType<typeof mount>) => w.find('[data-test="track-water"]')

  it('по умолчанию включён: выключатель отмечен, видны напоминания о воде и кнопка окна воды', async () => {
    setup({})
    const w = await open()
    expect((toggle(w).element as HTMLInputElement).checked).toBe(true)
    expect(w.find('[data-test="water-reminders"]').exists()).toBe(true)
    expect(w.find('[data-test="open-water"]').exists()).toBe(true)
    expect(w.text()).toContain('Отслеживать воду')
    expect(w.text()).toContain('Прошлые записи и баллы останутся')
    w.unmount()
  })

  it('выключение пишет флаг в профиль (только user_id и track_water) и прячет напоминания и окно воды', async () => {
    setup({})
    const w = await open()
    await toggle(w).setValue(false)
    await flushPromises()
    expect(db.writes.filter((x) => x.table === 'profiles')).toEqual([{ table: 'profiles', op: 'upsert', payload: { user_id: 'u1', track_water: false } }])
    expect((toggle(w).element as HTMLInputElement).checked).toBe(false)
    expect(w.find('[data-test="water-reminders"]').exists()).toBe(false)
    expect(w.find('[data-test="open-water"]').exists()).toBe(false)
    expect(localStorage.getItem('track_water_off:u1')).toBe('1')
    w.unmount()
  })

  it('включение обратно возвращает напоминания и кнопку окна воды', async () => {
    setup({ profiles: [{ track_water: false }] })
    const w = await open()
    expect((toggle(w).element as HTMLInputElement).checked).toBe(false)
    await toggle(w).setValue(true)
    await flushPromises()
    expect(db.writes.at(-1)!.payload).toEqual({ user_id: 'u1', track_water: true })
    expect(w.find('[data-test="water-reminders"]').exists()).toBe(true)
    expect(w.find('[data-test="open-water"]').exists()).toBe(true)
    w.unmount()
  })

  it('не записалось (например, миграция 055 не применена): выключатель возвращается, понятный текст без адреса Supabase, всё остаётся как было', async () => {
    db.upsertError = { message: 'TypeError: Failed to fetch https://abcd1234.supabase.co/rest/v1/profiles' }
    setup({})
    const w = await open()
    await toggle(w).setValue(false)
    await flushPromises()
    expect((toggle(w).element as HTMLInputElement).checked).toBe(true)
    const err = w.find('[data-test="track-water-error"]')
    expect(err.exists()).toBe(true)
    expect(err.text()).not.toMatch(/supabase|fetch|https?:/i)
    expect(w.find('[data-test="open-water"]').exists()).toBe(true)
    expect(localStorage.getItem('track_water_off:u1')).toBeNull()
    // повторная попытка после исправления снимает ошибку
    db.upsertError = null
    await toggle(w).setValue(false)
    await flushPromises()
    expect(w.find('[data-test="track-water-error"]').exists()).toBe(false)
    expect((toggle(w).element as HTMLInputElement).checked).toBe(false)
    w.unmount()
  })

  it('по-английски подписи тоже есть', async () => {
    localStorage.setItem('site_lang', 'en')
    setup({})
    const w = await open()
    expect(w.text()).toContain('Track water')
    expect(w.text()).toContain('Past entries and points stay')
    w.unmount()
  })
})
