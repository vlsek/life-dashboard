import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

// BACKLOG 69.21 (этап 2): вкладка «Каталог» в «Тренировках» — разделы по группам мышц, карточки с силуэтом/оборудованием/подсказкой, фильтр по оборудованию,
// «Добавить» открывает обычную форму упражнения с подставленным названием. Данные каталога проверяет exerciseCatalog.test.ts, здесь — интерфейс.
const h = vi.hoisted(() => ({ exercises: [] as Record<string, unknown>[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) },
    from: (table: string) => {
      const chain: Record<string, unknown> = {
        select: () => chain, eq: () => chain, order: () => chain, limit: () => chain, in: () => chain, not: () => chain, is: () => chain, gte: () => chain, lte: () => chain,
        maybeSingle: () => Promise.resolve({ data: table === 'profiles' ? { onboarded: true, workout_program: null } : null, error: null }),
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
import ExerciseCatalog from './components/ExerciseCatalog.vue'
import { CATALOG, EQUIPMENT_ORDER, GROUP_ORDER, catalogByGroup } from '../../shared/exercise-catalog/catalog'

const settle = async () => { for (let i = 0; i < 10; i++) await flushPromises() }
const exercise = (name: string) => ({ id: 'e-' + name, user_id: 'u1', name, category: 'upper', tracks_weight: true, unit: 'кг', value_label: null, suggested_scheme: null, tracks_duration: false, bilateral: false, created_at: '2026-10-01', muscles: null })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  document.body.innerHTML = ''
  h.exercises = []
})

describe('ExerciseCatalog: разделы и карточки', () => {
  it('12 разделов в порядке сверху вниз, у каждого число упражнений; по умолчанию свёрнуты (карточек нет)', () => {
    const w = mount(ExerciseCatalog, { props: { mine: [] } })
    const ids = w.findAll('[data-testid^="catalog-group-"]').map((x) => x.attributes('data-testid')!.replace('catalog-group-', ''))
    expect(ids).toEqual(GROUP_ORDER)
    for (const g of GROUP_ORDER) expect(w.find(`[data-testid="catalog-count-${g}"]`).text()).toBe(String(catalogByGroup(g).length))
    expect(w.findAll('[data-testid^="catalog-card-"]')).toHaveLength(0)
    expect(w.find('[data-testid="catalog-toggle-chest"]').attributes('aria-expanded')).toBe('false')
    expect(w.find('[data-testid="catalog-toggle-chest"] span').text()).toBe('Грудь')
    w.unmount()
  })

  it('раскрытие раздела показывает карточки: название, оборудование, тип, подсказка, «также работают»; повторное нажатие сворачивает', async () => {
    const w = mount(ExerciseCatalog, { props: { mine: [] } })
    await w.find('[data-testid="catalog-toggle-chest"]').trigger('click')
    expect(w.find('[data-testid="catalog-toggle-chest"]').attributes('aria-expanded')).toBe('true')
    expect(w.findAll('[data-testid^="catalog-card-"]')).toHaveLength(catalogByGroup('chest').length)
    const card = w.find('[data-testid="catalog-card-bench_press_barbell"]')
    expect(card.find('[data-testid="catalog-name-bench_press_barbell"]').text()).toBe('Жим штанги лёжа')
    expect(card.find('[data-testid="catalog-equipment-chip"]').text()).toBe('Штанга')
    expect(card.find('[data-testid="catalog-kind-chip"]').text()).toBe('Базовое')
    expect(card.find('[data-testid="catalog-cue"]').text()).toContain('Лопатки сведены')
    expect(card.find('[data-testid="catalog-also"]').text()).toBe('Также работают: Трицепс, Плечи')
    await w.find('[data-testid="catalog-toggle-chest"]').trigger('click')
    expect(w.findAll('[data-testid^="catalog-card-"]')).toHaveLength(0)
    w.unmount()
  })

  it('мини-силуэт: главная группа подсвечена (1), вторичные — бледнее (s), остальное не горит', async () => {
    const w = mount(ExerciseCatalog, { props: { mine: [] } })
    await w.find('[data-testid="catalog-toggle-chest"]').trigger('click')
    const body = w.find('[data-testid="catalog-card-bench_press_barbell"] [data-testid="mini-body"]')
    const lit = (m: string): string[] => body.findAll(`[data-muscle="${m}"]`).map((p) => p.attributes('data-lit')!)
    expect(new Set(lit('chest'))).toEqual(new Set(['1']))
    expect(new Set(lit('triceps'))).toEqual(new Set(['s']))
    expect(new Set(lit('shoulders'))).toEqual(new Set(['s']))
    expect(new Set(lit('calves'))).toEqual(new Set(['0']))
    w.unmount()
  })

  it('фильтр по оборудованию: остаются только подходящие упражнения, пустые разделы скрываются, счётчики пересчитываются, разделы раскрыты', async () => {
    const w = mount(ExerciseCatalog, { props: { mine: [] } })
    await w.find('[data-testid="catalog-eq-barbell"]').trigger('click')
    expect(w.find('[data-testid="catalog-eq-barbell"]').attributes('aria-pressed')).toBe('true')
    const cards = w.findAll('[data-testid^="catalog-card-"]')
    expect(cards.length).toBe(CATALOG.filter((x) => x.equipment === 'barbell').length)
    for (const c of cards) expect(c.find('[data-testid="catalog-equipment-chip"]').text()).toBe('Штанга')
    const groups = new Set(CATALOG.filter((x) => x.equipment === 'barbell').map((x) => x.group))
    expect(w.findAll('[data-testid^="catalog-group-"]')).toHaveLength(groups.size)
    expect(groups.size).toBeLessThan(GROUP_ORDER.length)
    await w.find('[data-testid="catalog-eq-all"]').trigger('click')
    expect(w.findAll('[data-testid^="catalog-group-"]')).toHaveLength(GROUP_ORDER.length)
    expect(w.findAll('[data-testid^="catalog-card-"]')).toHaveLength(0) // снова свёрнуто
    w.unmount()
  })

  it('кнопки оборудования: «любое» и по одной на каждое оборудование', () => {
    const w = mount(ExerciseCatalog, { props: { mine: [] } })
    expect(w.findAll('[data-testid^="catalog-eq-"]')).toHaveLength(EQUIPMENT_ORDER.length + 1)
    w.unmount()
  })

  it('«Добавить» отдаёт упражнение каталога; уже заведённое (без учёта регистра и ё/е) помечено «Уже в твоих» и без кнопки', async () => {
    const w = mount(ExerciseCatalog, { props: { mine: ['жим ШТАНГИ лежа'] } })
    await w.find('[data-testid="catalog-toggle-chest"]').trigger('click')
    expect(w.find('[data-testid="catalog-card-bench_press_barbell"] [data-testid="catalog-mine"]').text()).toContain('Уже в твоих')
    expect(w.find('[data-testid="catalog-add-bench_press_barbell"]').exists()).toBe(false)
    await w.find('[data-testid="catalog-add-pushup"]').trigger('click')
    expect(w.emitted('add')).toHaveLength(1)
    expect((w.emitted('add')![0][0] as { id: string }).id).toBe('pushup')
    w.unmount()
  })

  it('на английском — английские названия, подсказки и оборудование', async () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ExerciseCatalog, { props: { mine: [] } })
    await w.find('[data-testid="catalog-toggle-chest"]').trigger('click')
    expect(w.find('[data-testid="catalog-name-bench_press_barbell"]').text()).toBe('Barbell bench press')
    expect(w.find('[data-testid="catalog-card-bench_press_barbell"] [data-testid="catalog-equipment-chip"]').text()).toBe('Barbell')
    expect(w.find('[data-testid="catalog-card-bench_press_barbell"] [data-testid="catalog-cue"]').text()).toContain('Shoulder blades')
    w.unmount()
  })
})

describe('Тренировки: вкладка «Каталог»', () => {
  it('вкладка есть последней; по нажатию открывается каталог; «Добавить» открывает форму с названием и «с весом» по оборудованию', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    const tabs = w.findAll('[data-testid^="page-tab-"]').map((b) => b.text())
    expect(tabs[tabs.length - 1]).toBe('Каталог')
    expect(w.find('[data-testid="tab-catalog"]').exists()).toBe(false)
    await w.find('[data-testid="page-tab-catalog"]').trigger('click')
    expect(w.find('[data-testid="tab-catalog"]').exists()).toBe(true)
    expect(localStorage.getItem('workouts_tab')).toBe('catalog')
    await w.find('[data-testid="catalog-toggle-chest"]').trigger('click')
    await w.find('[data-testid="catalog-add-bench_press_barbell"]').trigger('click')
    await settle()
    const nameInput = document.body.querySelector('.modal-input[type="text"]') as HTMLInputElement
    expect(nameInput.value).toBe('Жим штанги лёжа')
    expect((document.body.querySelector('[data-testid="tracks-weight-select"]') as HTMLSelectElement).value).toBe('yes')
    w.unmount()
  })

  it('упражнение со своим весом — в форме «без веса»: и типовое (отжимания), и такое, которого нет среди типовых (ролик для пресса) — это решает prefill', async () => {
    const w = mount(App, { attachTo: document.body })
    await settle()
    await w.find('[data-testid="page-tab-catalog"]').trigger('click')
    await w.find('[data-testid="catalog-toggle-chest"]').trigger('click')
    await w.find('[data-testid="catalog-add-pushup"]').trigger('click')
    await settle()
    expect((document.body.querySelector('.modal-input[type="text"]') as HTMLInputElement).value).toBe('Отжимания от пола')
    expect((document.body.querySelector('[data-testid="tracks-weight-select"]') as HTMLSelectElement).value).toBe('no')
    w.unmount()
    document.body.innerHTML = ''
    const w2 = mount(App, { attachTo: document.body })
    await settle()
    await w2.find('[data-testid="page-tab-catalog"]').trigger('click')
    await w2.find('[data-testid="catalog-toggle-abs"]').trigger('click')
    await w2.find('[data-testid="catalog-add-ab_wheel"]').trigger('click')
    await settle()
    expect((document.body.querySelector('.modal-input[type="text"]') as HTMLInputElement).value).toBe('Ролик для пресса')
    expect((document.body.querySelector('[data-testid="tracks-weight-select"]') as HTMLSelectElement).value).toBe('no')
    w2.unmount()
  })

  it('уже заведённое упражнение отмечено в каталоге', async () => {
    h.exercises = [exercise('Планка')]
    const w = mount(App, { attachTo: document.body })
    await settle()
    await w.find('[data-testid="page-tab-catalog"]').trigger('click')
    await w.find('[data-testid="catalog-toggle-abs"]').trigger('click')
    expect(w.find('[data-testid="catalog-card-plank"] [data-testid="catalog-mine"]').exists()).toBe(true)
    expect(w.find('[data-testid="catalog-add-crunch"]').exists()).toBe(true)
    w.unmount()
  })
})
