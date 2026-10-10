import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// «Аккордеон» на странице «Тренировки» (BACKLOG 498, срез 2). Верхний уровень — категории, карта мышц, деревья прогрессии: раскрыли один —
// остальные сворачиваются. Упражнения внутри категории — своя группа: раскрытие упражнения НЕ сворачивает его категорию.
const h = vi.hoisted(() => ({ exercises: [] as Record<string, unknown>[], style: 'collapse_accordion' as string | null }))

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
          Promise.resolve({
            data: table === 'profiles' ? { onboarded: true, workout_program: null, customization: h.style ? { collapse_style: h.style } : {} } : null,
            error: null,
          }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
          Promise.resolve({ data: table === 'workout_exercises' ? h.exercises : [], error: null }).then(res, rej),
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

// BACKLOG 52.2: карта мышц видна и у человека без упражнений — пустая, с подсказкой (раньше появлялась только после первого упражнения).
async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  h.style = null
})

describe('Тренировки: карта мышц без упражнений', () => {
  it('нет упражнений — карта есть, рядом подсказка', async () => {
    h.exercises = []
    const w = await mountApp()
    expect(w.find('[data-testid="muscle-map"]').exists()).toBe(true)
    expect(w.find('[data-testid="muscles-empty-hint"]').exists()).toBe(true)
    w.unmount()
  })
  it('есть упражнения — подсказки нет', async () => {
    h.exercises = [{ id: 'e1', user_id: 'u1', name: 'Подтягивания', category: 'upper', tracks_weight: false, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-01-01' }]
    const w = await mountApp()
    expect(w.find('[data-testid="muscle-map"]').exists()).toBe(true)
    expect(w.find('[data-testid="muscles-empty-hint"]').exists()).toBe(false)
    w.unmount()
  })
})
