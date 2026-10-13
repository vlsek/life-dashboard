import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 590 + 62.3 «Подходы строками, как на главной»: у сегодняшней записи строка на подход, «+ подход» добавляет строку, × убирает, правка в строке — без окон
const h = vi.hoisted(() => ({
  exercises: [] as Record<string, unknown>[],
  entries: [] as Record<string, unknown>[],
  updates: [] as { patch: Record<string, unknown>; id: string }[],
  updateError: null as unknown,
  inserted: [] as unknown[],
}))

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve({ data: table === 'workout_exercises' ? h.exercises : table === 'workout_entries' ? h.entries : [], error: null }).then(res, rej),
        insert: (row: unknown) => (h.inserted.push(row), Promise.resolve({ error: null })),
        upsert: () => Promise.resolve({ error: null }),
        update: (patch: Record<string, unknown>) => ({
          eq: (_c: string, id: string) => {
            if (table === 'workout_entries') {
              h.updates.push({ patch, id })
              if (!h.updateError) h.entries = h.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) // «база» принимает правку
            }
            return Promise.resolve({ error: h.updateError })
          },
        }),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import { todayStr } from './lib/date'

const exercise = (o: Record<string, unknown> = {}) => ({ id: 'e1', user_id: 'u1', name: 'Подтягивания', category: 'upper', tracks_weight: false, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-10-01', ...o })
const set = (reps: number, weight: number | null = null, side: 'L' | 'R' | null = null, time = '10:00') => ({ reps, weight, time, duration: null, side })
const entry = (o: Record<string, unknown> = {}) => ({ id: 'n1', user_id: 'u1', exercise_id: 'e1', date: todayStr(), sets: [set(8)], notes: null, ...o })

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const add = (w: ReturnType<typeof mount>) => w.find('[data-testid="quick-add-set"]')
const rowsOf = (w: ReturnType<typeof mount>) => w.findAll('[data-testid="entry-set-row"]')
const remove = (w: ReturnType<typeof mount>, i = 0) => w.findAll('[data-testid="entry-set-remove"]')[i]

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.exercises = [exercise()]
  h.entries = [entry()]
  h.updates = []
  h.updateError = null
  h.inserted = []
})

describe('«+ подход» в таблице записей', () => {
  it('у сегодняшней записи с подходом есть «+ подход» и строка подхода; × нет, пока подход один', async () => {
    const w = await mountApp()
    expect(add(w).exists()).toBe(true)
    expect(add(w).text()).toBe('+ подход')
    expect(rowsOf(w)).toHaveLength(1)
    expect(remove(w)).toBeUndefined()
    w.unmount()
  })

  it('кнопки нет у записи другого дня и у записи без подходов', async () => {
    h.entries = [entry({ date: '2026-01-01' })]
    let w = await mountApp()
    expect(add(w).exists()).toBe(false)
    w.unmount()
    h.entries = [entry({ sets: [] })]
    w = await mountApp()
    expect(add(w).exists()).toBe(false)
    w.unmount()
  })

  it('тап добавляет НОВУЮ СТРОКУ, копируя прошлый подход, БЕЗ окна; запись обновляется, видна подсказка и × у строк', async () => {
    h.exercises = [exercise({ tracks_weight: true, unit: 'kg' })]
    h.entries = [entry({ sets: [set(10, 20)] })]
    const w = await mountApp()
    await add(w).trigger('click')
    await flushPromises()
    await flushPromises()
    expect(w.find('form').exists()).toBe(false) // новых окон нет
    expect(h.updates).toHaveLength(1)
    const sets = h.updates[0].patch.sets as { reps: number; weight: number; time: string }[]
    expect(sets).toHaveLength(2)
    expect(sets[1]).toMatchObject({ reps: 10, weight: 20 })
    expect(sets[1].time).toMatch(/^\d{2}:\d{2}$/)
    expect(h.updates[0].patch).toMatchObject({ date: todayStr(), notes: null })
    expect(w.text()).toContain('Подход 2 добавлен')
    expect(rowsOf(w)).toHaveLength(2)
    expect(remove(w)).toBeDefined()
    w.unmount()
  })

  it('второй тап копирует уже добавленный (подходов становится три)', async () => {
    const w = await mountApp()
    await add(w).trigger('click')
    await flushPromises()
    await flushPromises()
    await add(w).trigger('click')
    await flushPromises()
    await flushPromises()
    expect((h.updates.at(-1)!.patch.sets as unknown[]).length).toBe(3)
    w.unmount()
  })

  it('× убирает строку; на одном подходе кнопка исчезает', async () => {
    h.entries = [entry({ sets: [set(12), set(10), set(8)] })]
    const w = await mountApp()
    expect(rowsOf(w)).toHaveLength(3)
    await remove(w, 1).trigger('click') // убираем СРЕДНЮЮ строку, не последнюю
    await flushPromises()
    await flushPromises()
    expect((h.updates[0].patch.sets as { reps: number }[]).map((s) => s.reps)).toEqual([12, 8])
    expect(rowsOf(w)).toHaveLength(2)
    await remove(w, 0).trigger('click')
    await flushPromises()
    await flushPromises()
    expect(remove(w)).toBeUndefined()
    expect((h.updates.at(-1)!.patch.sets as unknown[]).length).toBe(1)
    w.unmount()
  })

  it('правка повторов и веса в строке сохраняется сразу; очистка повторов возвращает прежнее значение', async () => {
    h.exercises = [exercise({ tracks_weight: true, unit: 'kg' })]
    h.entries = [entry({ sets: [set(10, 20), set(8, 20)] })]
    const w = await mountApp()
    const reps = w.findAll('[data-testid="entry-set-reps"]')
    ;(reps[1].element as HTMLInputElement).value = '9'
    await reps[1].trigger('change')
    await flushPromises()
    await flushPromises()
    expect((h.updates[0].patch.sets as { reps: number; weight: number }[]).map((x) => [x.reps, x.weight])).toEqual([[10, 20], [9, 20]])
    const weight = w.findAll('[data-testid="entry-set-weight"]')[0]
    ;(weight.element as HTMLInputElement).value = '22,5'
    await weight.trigger('change')
    await flushPromises()
    await flushPromises()
    expect((h.updates.at(-1)!.patch.sets as { weight: number }[])[0].weight).toBe(22.5)
    const n = h.updates.length
    const first = w.findAll('[data-testid="entry-set-reps"]')[0]
    ;(first.element as HTMLInputElement).value = ''
    await first.trigger('change')
    await flushPromises()
    expect(h.updates).toHaveLength(n) // пустые повторы не сохраняем
    expect((first.element as HTMLInputElement).value).toBe('10')
    w.unmount()
  })

  it('упражнение с левой/правой стороной: «+ подход» копирует пару Л+П', async () => {
    h.exercises = [exercise({ bilateral: true })]
    h.entries = [entry({ sets: [set(10, null, 'L'), set(9, null, 'R')] })]
    const w = await mountApp()
    await add(w).trigger('click')
    await flushPromises()
    const sets = h.updates[0].patch.sets as { reps: number; side: string }[]
    expect(sets.map((s) => [s.reps, s.side])).toEqual([[10, 'L'], [9, 'R'], [10, 'L'], [9, 'R']])
    expect(w.text()).toContain('Подход 2 добавлен') // пара — один подход
    w.unmount()
  })

  it('сбой записи — тост с ошибкой (с текстом ошибки базы), подходов не прибавилось', async () => {
    h.updateError = { message: 'rls' }
    const w = await mountApp()
    await add(w).trigger('click')
    await flushPromises()
    await flushPromises()
    expect(w.text()).toContain('Не получилось сохранить. Попробуй ещё раз.') // понятный текст, а не «[object Object]» и не сырое «rls» (BACKLOG 942)
    expect(w.text()).not.toContain('rls')
    expect(w.text()).not.toContain('Подход 2 добавлен')
    expect(rowsOf(w)).toHaveLength(1)
    w.unmount()
  })
})
