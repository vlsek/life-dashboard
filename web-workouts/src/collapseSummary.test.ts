import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// «Карточка со сводкой» на странице «Тренировки» (BACKLOG 498, срез 3): у свёрнутой категории — «Упражнений: N»,
// у свёрнутого упражнения — его рекорд; только при выбранном виде «сводка».
const h = vi.hoisted(() => ({ exercises: [] as Record<string, unknown>[], style: 'collapse_summary' as string | null }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () =>
          Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null, customization: h.style ? { collapse_style: h.style } : {} } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data: table === 'workout_exercises' ? h.exercises : [], error: null }).then(res, rej),
        insert: () => Promise.resolve({ error: null }),
        upsert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
      return chain
    },
  },
}))

import App from './App.vue'
import ExerciseCard from './components/ExerciseCard.vue'
import { collapseStyle, lastOpened } from './lib/useCollapseStyle'
import type { Exercise } from './lib/types'

const ex = (id: string, name: string, category: string) => ({ id, user_id: 'u1', name, category, tracks_weight: true, unit: 'кг', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-01-01' })
const exercise = ex('ex1', 'Жим', 'upper') as unknown as Exercise
const today = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})()
const entry = (sets: unknown[]) => ({ id: 'n1', user_id: 'u', exercise_id: 'ex1', date: today, sets, notes: null }) as never
const set = (reps: number, weight: number) => ({ reps, weight, time: '10:00', duration: null, side: null })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  collapseStyle.value = 'chevron'
  lastOpened.value = null
  h.style = 'collapse_summary'
  h.exercises = [ex('e1', 'Подтягивания', 'upper'), ex('e2', 'Отжимания', 'upper'), ex('e3', 'Приседания', 'lower')]
})

describe('Тренировки: сводка свёрнутой категории', () => {
  async function mountApp() {
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await flushPromises()
    return w
  }
  const pills = (w: Awaited<ReturnType<typeof mountApp>>) => w.findAll('[data-testid="group-toggle"] [data-test="collapse-summary"]').map((p) => p.text())

  it('профиль с купленной «карточкой со сводкой» включает стиль; развёрнутые категории итога не показывают', async () => {
    const w = await mountApp()
    expect(collapseStyle.value).toBe('summary')
    expect(pills(w)).toEqual([])
    w.unmount()
  })

  it('свернули категорию — справа «Упражнений: N» по числу упражнений в ней', async () => {
    const w = await mountApp()
    const toggles = w.findAll('[data-testid="group-toggle"]')
    for (const tg of toggles) await tg.trigger('click') // свернуть все
    await flushPromises()
    const texts = pills(w).sort()
    expect(texts).toEqual(['Упражнений: 1', 'Упражнений: 2'])
    w.unmount()
  })

  it('базовый шеврон: итога нет и у свёрнутой категории', async () => {
    h.style = null
    const w = await mountApp()
    for (const tg of w.findAll('[data-testid="group-toggle"]')) await tg.trigger('click')
    await flushPromises()
    expect(pills(w)).toEqual([])
    w.unmount()
  })
})

describe('ExerciseCard: сводка свёрнутого упражнения', () => {
  const mk = (entries: unknown[]) => mount(ExerciseCard, { props: { exercise, entries: entries as never[] } })
  const pill = (w: ReturnType<typeof mk>) => w.find('[data-test="collapse-summary"]')

  it('«сводка»: свёрнутое упражнение показывает свой рекорд; развёрнутое — нет', async () => {
    collapseStyle.value = 'summary'
    const w = mk([entry([set(8, 80), set(5, 60)])])
    expect(pill(w).exists()).toBe(false) // развёрнуто
    await w.find('[data-testid="exercise-toggle"]').trigger('click')
    expect(pill(w).exists()).toBe(true)
    expect(pill(w).text()).toContain('Лучший подход')
    expect(pill(w).text()).toContain('80')
    await w.find('[data-testid="exercise-toggle"]').trigger('click')
    expect(pill(w).exists()).toBe(false)
  })

  it('нет записей — итога нет, плашка не рисуется', async () => {
    collapseStyle.value = 'summary'
    const w = mk([])
    await w.find('[data-testid="exercise-toggle"]').trigger('click')
    expect(pill(w).exists()).toBe(false)
  })

  it('базовый шеврон и аккордеон — плашки нет', async () => {
    for (const s of ['chevron', 'accordion'] as const) {
      collapseStyle.value = s
      const w = mk([entry([set(8, 80)])])
      await w.find('[data-testid="exercise-toggle"]').trigger('click')
      expect(pill(w).exists()).toBe(false)
    }
  })
})
