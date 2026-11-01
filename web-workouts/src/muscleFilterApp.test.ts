import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// (шаблон из muscleMapEmpty.test.ts) «Аккордеон» на странице «Тренировки» (BACKLOG 498, срез 2). Верхний уровень — категории, карта мышц, деревья прогрессии: раскрыли один —
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

const ex = (id: string, name: string) => ({ id, user_id: 'u1', name, category: 'upper', tracks_weight: true, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-01-01' })

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

// BACKLOG 70.4: выбор мышцы на карте → фильтр списка «Упражнения»; чип снимает фильтр.
describe('Тренировки: фильтр по мышце с карты', () => {
  it('кнопка в панели мышцы оставляет в списке только её упражнения, чип «Сбросить» возвращает всё', async () => {
    h.exercises = [ex('e1', 'Жим лёжа'), ex('e2', 'Приседания')]
    const w = await mountApp()
    expect(w.findAll('[data-testid="exercise-toggle"]').length).toBe(2)
    await w.find('[data-testid="muscle-map"] [data-muscle="chest"]').trigger('click')
    await w.find('[data-testid="muscle-filter-exercises"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="muscle-filter-chip"]').exists()).toBe(true)
    expect(w.findAll('[data-testid="exercise-toggle"]').length).toBe(1)
    const tabText = w.find('[data-testid="tab-exercises"]').text()
    expect(tabText).toContain('Жим')
    expect(tabText).not.toContain('Приседания')
    await w.find('[data-testid="muscle-filter-clear"]').trigger('click')
    expect(w.find('[data-testid="muscle-filter-chip"]').exists()).toBe(false)
    expect(w.findAll('[data-testid="exercise-toggle"]').length).toBe(2)
    w.unmount()
  })
  it('на мышцу без упражнений — честная подпись вместо пустого экрана', async () => {
    h.exercises = [ex('e1', 'Жим лёжа')]
    const w = await mountApp()
    await w.find('[data-testid="muscle-map"] [data-muscle="calves"]').trigger('click')
    await w.find('[data-testid="muscle-filter-exercises"]').trigger('click')
    await flushPromises()
    expect(w.find('[data-testid="muscle-filter-empty"]').exists()).toBe(true)
    w.unmount()
  })
})
