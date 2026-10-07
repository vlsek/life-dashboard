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
import { collapseStyle, lastOpened } from './lib/useCollapseStyle'

const ex = (id: string, name: string, category: string) => ({ id, user_id: 'u1', name, category, tracks_weight: false, unit: '', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-01-01' })

async function mountApp() {
  const w = mount(App, { attachTo: document.body })
  await flushPromises()
  await flushPromises()
  return w
}
type W = Awaited<ReturnType<typeof mountApp>>
const groupToggle = (w: W, i: number) => w.findAll('[data-testid="group-toggle"]')[i]
const expanded = (el: { attributes: (n: string) => string | undefined }) => el.attributes('aria-expanded') === 'true'

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  collapseStyle.value = 'chevron'
  lastOpened.value = null
  h.style = 'collapse_accordion'
  h.exercises = [ex('e1', 'Подтягивания', 'upper'), ex('e2', 'Отжимания', 'upper'), ex('e3', 'Приседания', 'lower')]
})

describe('Тренировки: аккордеон на категориях и блоках страницы', () => {
  it('профиль с купленным «аккордеоном» включает стиль после загрузки', async () => {
    const w = await mountApp()
    expect(collapseStyle.value).toBe('accordion')
    w.unmount()
  })

  it('базовый шеврон: категории независимы', async () => {
    h.style = null
    const w = await mountApp()
    expect(collapseStyle.value).toBe('chevron')
    await groupToggle(w, 0).trigger('click') // первую свернули
    await groupToggle(w, 0).trigger('click') // и раскрыли — вторая не тронута
    await flushPromises()
    expect(expanded(groupToggle(w, 0))).toBe(true)
    expect(expanded(groupToggle(w, 1))).toBe(true)
    w.unmount()
  })

  it('аккордеон: раскрыли категорию — остальные категории сворачиваются, раскрытая остаётся', async () => {
    const w = await mountApp()
    expect(groupToggle(w, 0)).toBeTruthy()
    await groupToggle(w, 0).trigger('click') // свернули первую (соседей не трогаем)
    expect(expanded(groupToggle(w, 1))).toBe(true)
    await groupToggle(w, 0).trigger('click') // раскрыли первую → вторая сворачивается
    await flushPromises()
    expect(expanded(groupToggle(w, 0))).toBe(true)
    expect(expanded(groupToggle(w, 1))).toBe(false)
    expect(localStorage.getItem('workouts_collapsed:lower') ?? localStorage.getItem('workouts_collapsed:upper')).toBe('1') // запомнено
    w.unmount()
  })

  it('аккордеон: раскрытие категории сворачивает открытую карту мышц', async () => {
    localStorage.setItem('workouts_musclemap_open', '1')
    const w = await mountApp()
    const map = () => w.find('[data-testid="muscle-map-toggle"]')
    expect(expanded(map())).toBe(true)
    await groupToggle(w, 0).trigger('click')
    await groupToggle(w, 0).trigger('click') // раскрыли категорию
    await flushPromises()
    expect(expanded(map())).toBe(false)
    expect(localStorage.getItem('workouts_musclemap_open')).toBe('0')
    w.unmount()
  })

  it('аккордеон: раскрытие карты мышц сворачивает категории', async () => {
    localStorage.setItem('workouts_musclemap_open', '0')
    const w = await mountApp()
    const map = () => w.find('[data-testid="muscle-map-toggle"]')
    await map().trigger('click') // раскрыли карту
    await flushPromises()
    expect(expanded(groupToggle(w, 0))).toBe(false)
    expect(expanded(groupToggle(w, 1))).toBe(false)
    w.unmount()
  })
})

describe('Тренировки: аккордеон на упражнениях внутри категории', () => {
  it('раскрыли упражнение — соседнее в той же категории сворачивается, а сама категория остаётся раскрытой', async () => {
    const w = await mountApp()
    const toggles = () => w.findAll('[data-testid="exercise-toggle"]')
    expect(toggles().length).toBeGreaterThanOrEqual(3)
    const first = toggles()[0]
    const second = toggles()[1]
    await first.trigger('click') // свернули первое упражнение
    await second.trigger('click') // свернули второе
    await first.trigger('click') // раскрыли первое → второе (та же категория) остаётся свёрнутым, первое раскрыто
    await flushPromises()
    expect(expanded(first)).toBe(true)
    expect(expanded(second)).toBe(false)
    await second.trigger('click') // раскрыли второе → первое сворачивается
    await flushPromises()
    expect(expanded(second)).toBe(true)
    expect(expanded(first)).toBe(false)
    // категории при этом не свернулись
    expect(expanded(groupToggle(w, 0))).toBe(true)
    w.unmount()
  })

  it('упражнения разных категорий не мешают друг другу', async () => {
    const w = await mountApp()
    const t = () => w.findAll('[data-testid="exercise-toggle"]')
    const lowerOne = t()[t().length - 1]
    const upperFirst = t()[0]
    await lowerOne.trigger('click') // свернули
    await lowerOne.trigger('click') // раскрыли: упражнения другой категории не трогаем
    await upperFirst.trigger('click')
    await upperFirst.trigger('click')
    await flushPromises()
    expect(expanded(lowerOne)).toBe(true)
    expect(expanded(upperFirst)).toBe(true)
    w.unmount()
  })

  it('базовый шеврон: упражнения независимы', async () => {
    h.style = null
    const w = await mountApp()
    const t = () => w.findAll('[data-testid="exercise-toggle"]')
    await t()[0].trigger('click')
    await t()[1].trigger('click')
    await t()[0].trigger('click')
    await flushPromises()
    expect(expanded(t()[0])).toBe(true)
    expect(expanded(t()[1])).toBe(false)
    w.unmount()
  })
})
