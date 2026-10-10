import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// Модель тела на карте мышц (BACKLOG 54.5): пол из профиля задаёт модель по умолчанию, переключатель «Мужская / Женская» главнее и помнится.
const h = vi.hoisted(() => ({ gender: null as string | null }))

vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, gender: h.gender, workout_program: null, customization: {} } : null, error: null }),
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(res, rej),
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
import { BODY_OUTLINE } from './lib/muscleShapes'
import { FEMALE_OUTLINE } from './lib/bodyModel'

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
const outline = (w: ReturnType<typeof mount>) => w.find('[data-testid="body-outline"]').attributes('d')

beforeEach(() => {
  localStorage.clear()
  h.gender = null
})

describe('Тренировки: модель тела карты мышц', () => {
  it('без пола и без выбора — мужская модель', async () => {
    const w = await mountApp()
    expect(outline(w)).toBe(BODY_OUTLINE)
    w.unmount()
  })

  it('пол «female» в профиле — женская модель по умолчанию', async () => {
    h.gender = 'female'
    const w = await mountApp()
    expect(outline(w)).toBe(FEMALE_OUTLINE)
    expect(w.find('[data-testid="body-model-female"]').attributes('aria-pressed')).toBe('true')
    w.unmount()
  })

  it('переключатель главнее пола профиля и запоминается', async () => {
    h.gender = 'female'
    const w = await mountApp()
    await w.find('[data-testid="body-model-male"]').trigger('click')
    expect(outline(w)).toBe(BODY_OUTLINE)
    expect(localStorage.getItem('workouts_body_model')).toBe('male')
    w.unmount()
    const w2 = await mountApp()
    expect(outline(w2)).toBe(BODY_OUTLINE)
    w2.unmount()
  })
})
