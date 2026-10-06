import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG раздел 38: «Новая цель» с главной — то же окно, что в «Целях» (название, баллы, категория…); цель создаётся и встаёт в план дня.
const h = vi.hoisted(() => ({
  goalInserts: [] as Record<string, unknown>[],
  catInserts: [] as Record<string, unknown>[],
  upserts: [] as Record<string, unknown>[],
  goalInsertError: null as null | { message: string; code?: string },
  existingGoalCats: [{ category: 'Спорт' }, { category: 'спорт ' }, { category: 'Учёба' }, { category: 'Без категории' }] as { category: string }[],
  storedCats: [{ name: 'Здоровье' }, { name: 'учёба' }] as { name: string }[],
  catTableMissing: false,
}))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      let cols = ''
      const chain: any = {
        select: (c?: string) => ((cols = c ?? ''), chain),
        eq: () => chain,
        order: () => chain,
        gte: () => chain,
        lt: () => chain,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        then: (res: (v: unknown) => unknown) => {
          if (table === 'goals') return Promise.resolve({ data: cols === 'category' ? h.existingGoalCats : [], error: null }).then(res)
          if (table === 'goal_categories') return Promise.resolve(h.catTableMissing ? { data: null, error: { message: 'relation does not exist' } } : { data: h.storedCats, error: null }).then(res)
          return Promise.resolve({ data: [], error: null }).then(res)
        },
        upsert: (p: Record<string, unknown>) => (h.upserts.push(p), Promise.resolve({ error: null })),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        insert: (p: Record<string, unknown>) => {
          if (table === 'goals') {
            h.goalInserts.push(p)
            return {
              select: () => ({
                single: () =>
                  Promise.resolve(h.goalInsertError ? { data: null, error: h.goalInsertError } : { data: { id: 'g-new', name: p.name, stages: p.stages, done: false, current_stage: 0 }, error: null }),
              }),
            }
          }
          h.catInserts.push(p)
          return Promise.resolve({ error: null })
        },
      }
      return chain
    },
  },
}))

import PlannedSection from './components/PlannedSection.vue'

beforeEach(() => {
  h.goalInserts = []
  h.catInserts = []
  h.upserts = []
  h.goalInsertError = null
  h.catTableMissing = false
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

async function mountPlanned() {
  const w = mount(PlannedSection, { props: { userId: 'u1', date: '2026-10-06' }, attachTo: document.body })
  await flushPromises()
  return w
}
async function openModal(w: ReturnType<typeof mount>) {
  await w.find('[data-test="new-goal"]').trigger('click')
  await flushPromises()
}
const modal = () => document.body.querySelector('.modal')

describe('«Планы»: «Новая цель»', () => {
  it('кнопка открывает то же окно, что в «Целях»: название, баллы, категория, этапы, сложность, дедлайн', async () => {
    const w = await mountPlanned()
    expect(modal()).toBeNull()
    await openModal(w)
    expect(modal()).not.toBeNull()
    const labels = [...document.body.querySelectorAll('.modal label')].map((l) => l.textContent)
    expect(labels).toEqual(['Название', 'Баллы за выполнение', 'Категория', 'Количество этапов (1 = обычная галочка)', 'Сложность', 'Дедлайн (необязательно)'])
    w.unmount()
  })

  it('список категорий: из целей (частые сверху) + сохранённые, без повторов и без «Без категории»', async () => {
    const w = await mountPlanned()
    await openModal(w)
    const opts = [...document.body.querySelectorAll('[data-test="goal-category-select"] option')].map((o) => o.textContent)
    expect(opts).toEqual(['Без категории', 'Спорт', 'Учёба', 'Здоровье', '+ Новая категория…'])
    w.unmount()
  })

  it('нет таблицы goal_categories (миграция 050 не применена): список из самих целей, окно работает', async () => {
    h.catTableMissing = true
    const w = await mountPlanned()
    await openModal(w)
    const opts = [...document.body.querySelectorAll('[data-test="goal-category-select"] option')].map((o) => o.textContent)
    expect(opts).toEqual(['Без категории', 'Спорт', 'Учёба', '+ Новая категория…'])
    w.unmount()
  })

  it('без названия — подсказка в окне, ничего не записывается', async () => {
    const w = await mountPlanned()
    await openModal(w)
    ;(document.body.querySelector('[data-test="goal-form-save"]') as HTMLElement).click()
    await flushPromises()
    expect(document.body.querySelector('[data-test="goal-form-error"]')?.textContent).toBe('Введи название цели')
    expect(h.goalInserts).toEqual([])
    expect(h.upserts).toEqual([])
    w.unmount()
  })

  it('сохранение: цель создаётся с баллами и категорией, встаёт в план дня, окно закрывается', async () => {
    const w = await mountPlanned()
    await openModal(w)
    const name = document.body.querySelector('[data-test="new-goal-name"]') as HTMLInputElement
    name.value = '  Пробежка  '
    name.dispatchEvent(new Event('input'))
    const pts = document.body.querySelector('[data-test="new-goal-points"]') as HTMLInputElement
    pts.value = '10'
    pts.dispatchEvent(new Event('input'))
    const sel = document.body.querySelector('[data-test="goal-category-select"]') as HTMLSelectElement
    sel.value = 'Спорт'
    sel.dispatchEvent(new Event('change'))
    await flushPromises()
    ;(document.body.querySelector('[data-test="goal-form-save"]') as HTMLElement).click()
    await flushPromises()
    expect(h.goalInserts).toEqual([{ user_id: 'u1', name: 'Пробежка', points: 10, category: 'Спорт', stages: 1, current_stage: 0, done: false }])
    expect(h.upserts.at(-1)).toMatchObject({ user_id: 'u1', date: '2026-10-06', planned_goals: [{ type: 'goal', text: 'Пробежка' }] })
    expect(modal()).toBeNull()
    // «Спорт» есть в целях, но не в сохранённом списке (миграция 050) — как в «Целях», запоминается там (position = сколько уже сохранено)
    expect(h.catInserts).toEqual([{ user_id: 'u1', name: 'Спорт', position: 2 }])
    expect(w.text()).toContain('Пробежка')
    w.unmount()
  })

  it('новая категория запоминается в списке; без категории — подпись «Без категории», как в «Целях»', async () => {
    const w = await mountPlanned()
    await openModal(w)
    const name = document.body.querySelector('[data-test="new-goal-name"]') as HTMLInputElement
    name.value = 'Читать'
    name.dispatchEvent(new Event('input'))
    const sel = document.body.querySelector('[data-test="goal-category-select"]') as HTMLSelectElement
    sel.value = '\u0000new'
    sel.dispatchEvent(new Event('change'))
    await flushPromises()
    const fresh = document.body.querySelector('[data-test="goal-category-new"]') as HTMLInputElement
    fresh.value = ' Книги '
    fresh.dispatchEvent(new Event('input'))
    ;(document.body.querySelector('[data-test="goal-form-save"]') as HTMLElement).click()
    await flushPromises()
    expect(h.goalInserts[0]).toMatchObject({ name: 'Читать', category: 'Книги', points: 5 })
    expect(h.catInserts).toEqual([{ user_id: 'u1', name: 'Книги', position: 2 }])

    // вторая цель без категории
    await openModal(w)
    const name2 = document.body.querySelector('[data-test="new-goal-name"]') as HTMLInputElement
    name2.value = 'Без рубрики'
    name2.dispatchEvent(new Event('input'))
    ;(document.body.querySelector('[data-test="goal-form-save"]') as HTMLElement).click()
    await flushPromises()
    expect(h.goalInserts[1]).toMatchObject({ name: 'Без рубрики', category: 'Без категории' })
    w.unmount()
  })

  it('время из поля рядом с «Добавить» попадает в пункт плана; сложность и дедлайн пишутся, только если заданы', async () => {
    const w = await mountPlanned()
    await w.find('[data-test="new-time"]').setValue('18:30')
    await openModal(w)
    const name = document.body.querySelector('[data-test="new-goal-name"]') as HTMLInputElement
    name.value = 'Йога'
    name.dispatchEvent(new Event('input'))
    const dl = document.body.querySelector('input[type="date"]') as HTMLInputElement
    dl.value = '2026-10-20'
    dl.dispatchEvent(new Event('input'))
    await flushPromises()
    ;(document.body.querySelector('[data-test="goal-form-save"]') as HTMLElement).click()
    await flushPromises()
    expect(h.goalInserts[0]).toMatchObject({ name: 'Йога', deadline: '2026-10-20' })
    expect(h.goalInserts[0]).not.toHaveProperty('difficulty')
    expect(h.upserts.at(-1)).toMatchObject({ planned_goals: [{ type: 'goal', text: 'Йога', time: '18:30' }] })
    w.unmount()
  })

  it('ошибка записи цели: понятный текст без адреса Supabase, окно остаётся открытым, в план ничего не попало', async () => {
    h.goalInsertError = { message: 'TypeError: Failed to fetch https://xyz.supabase.co/rest/v1/goals' }
    const w = await mountPlanned()
    await openModal(w)
    const name = document.body.querySelector('[data-test="new-goal-name"]') as HTMLInputElement
    name.value = 'Не запишется'
    name.dispatchEvent(new Event('input'))
    ;(document.body.querySelector('[data-test="goal-form-save"]') as HTMLElement).click()
    await flushPromises()
    const err = document.body.querySelector('[data-test="goal-form-error"]')?.textContent ?? ''
    expect(err).not.toBe('')
    expect(err).not.toMatch(/supabase|fetch|https?:/i)
    expect(modal()).not.toBeNull()
    expect(h.upserts).toEqual([])
    w.unmount()
  })
})
