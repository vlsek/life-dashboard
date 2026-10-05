import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// Миграция 050 (BACKLOG раздел 35, «Цели: категории должны сохраняться»): сохранённый список категорий в таблице goal_categories.
// Клиент обязан работать и ДО применения миграции (нет таблицы — как в v3.11, без ошибок на экране).
const db = vi.hoisted(() => ({
  rows: [] as { name: string }[],
  selectError: null as null | { code?: string; message: string },
  insertError: null as null | { code?: string; message: string },
  inserted: [] as Record<string, unknown>[],
  throwOnSelect: false,
}))

vi.mock('./lib/supabase', () => ({
  sb: {
    from: (table: string) => {
      if (table !== 'goal_categories') throw new Error('unexpected table ' + table)
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
          if (db.throwOnSelect) return Promise.reject(new Error('network')).then(res, rej)
          return Promise.resolve({ data: db.selectError ? null : db.rows, error: db.selectError }).then(res, rej)
        },
        insert: (row: Record<string, unknown>) => {
          db.inserted.push(row)
          return Promise.resolve({ error: db.insertError })
        },
      }
      return chain
    },
  },
}))

const api = vi.hoisted(() => ({ addGoal: vi.fn(), items: null as unknown as { value: Record<string, unknown>[] } }))
vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'a@b.c' }),
    items: api.items,
    error: ref(null),
    flashed: ref({}),
    init: () => {},
    addGoal: api.addGoal,
    updateGoal: vi.fn(),
    deleteGoal: vi.fn(),
    toggleGoal: vi.fn(),
    stepGoal: vi.fn(),
    setStage: vi.fn(),
  }),
}))


import { useGoalCategories } from './lib/useGoalCategories'
import { mergeCategories, needsSaving } from './lib/categories'

beforeEach(() => {
  db.rows = []
  db.selectError = null
  db.insertError = null
  db.inserted = []
  db.throwOnSelect = false
})

describe('mergeCategories / needsSaving', () => {
  it('сначала категории из целей, затем сохранённые без целей; повторы без учёта регистра убираются', () => {
    expect(mergeCategories(['Спорт', 'Дом'], ['дом', 'Книги', 'Спорт'])).toEqual(['Спорт', 'Дом', 'Книги'])
  })
  it('«Без категории» и пустые не попадают', () => {
    expect(mergeCategories([], ['', '  ', 'Без категории', 'Дом'], ['Без категории'])).toEqual(['Дом'])
  })
  it('needsSaving: новая — да; уже есть (регистр) — нет; пустая, «Без категории», длиннее 40 — нет', () => {
    expect(needsSaving('Книги', ['Дом'])).toBe(true)
    expect(needsSaving(' дом ', ['Дом'])).toBe(false)
    expect(needsSaving('', ['Дом'])).toBe(false)
    expect(needsSaving('Без категории', [], ['Без категории'])).toBe(false)
    expect(needsSaving('x'.repeat(41), [])).toBe(false)
  })
})

describe('useGoalCategories', () => {
  it('load: читает названия из таблицы в порядке списка', async () => {
    db.rows = [{ name: 'Спорт' }, { name: 'Дом' }]
    const c = useGoalCategories()
    await c.load('u1')
    expect(c.saved.value).toEqual(['Спорт', 'Дом'])
  })

  it('нет таблицы (миграция ещё не применена): список пуст, ошибок не бросает, запись молча отключена', async () => {
    db.selectError = { code: '42P01', message: 'relation "goal_categories" does not exist' }
    const c = useGoalCategories()
    await expect(c.load('u1')).resolves.toBeUndefined()
    expect(c.saved.value).toEqual([])
    await c.ensure('Книги')
    expect(db.inserted).toEqual([])
  })

  it('сбой сети при чтении тоже не ломает страницу', async () => {
    db.throwOnSelect = true
    const c = useGoalCategories()
    await expect(c.load('u1')).resolves.toBeUndefined()
    expect(c.saved.value).toEqual([])
  })

  it('ensure: новая категория записывается с позицией в конец и появляется в списке', async () => {
    db.rows = [{ name: 'Спорт' }, { name: 'Дом' }]
    const c = useGoalCategories()
    await c.load('u1')
    await c.ensure('  Книги ')
    expect(db.inserted).toEqual([{ user_id: 'u1', name: 'Книги', position: 2 }])
    expect(c.saved.value).toEqual(['Спорт', 'Дом', 'Книги'])
  })

  it('ensure: уже сохранённая (даже другим регистром), пустая и «Без категории» не пишутся', async () => {
    db.rows = [{ name: 'Спорт' }]
    const c = useGoalCategories()
    await c.load('u1')
    await c.ensure('спорт')
    await c.ensure('   ')
    await c.ensure('Без категории', ['Без категории'])
    expect(db.inserted).toEqual([])
  })

  it('ensure: другое устройство успело раньше (23505) — это не ошибка, категория в списке', async () => {
    const c = useGoalCategories()
    await c.load('u1')
    db.insertError = { code: '23505', message: 'duplicate key' }
    await c.ensure('Книги')
    expect(c.saved.value).toEqual(['Книги'])
  })

  it('ensure: другая ошибка записи не бросает и категорию в список не добавляет', async () => {
    const c = useGoalCategories()
    await c.load('u1')
    db.insertError = { code: '42501', message: 'rls' }
    await expect(c.ensure('Книги')).resolves.toBeUndefined()
    expect(c.saved.value).toEqual([])
  })
})

describe('раздел «Цели» и сохранённый список', () => {
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
    api.addGoal.mockReset().mockResolvedValue(undefined)
    api.items = ref([]) as unknown as { value: Record<string, unknown>[] }
  })

  it('категория без единой цели остаётся в выборе (список из таблицы)', async () => {
    db.rows = [{ name: 'Здоровье' }]
    const { default: App } = await import('./App.vue')
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await w.find('[data-test="goal-add"]').trigger('click')
    expect(w.find('[data-test="goal-category-select"]').findAll('option').map((o) => o.text())).toContain('Здоровье')
    w.unmount()
  })

  it('сохранили цель с новой категорией — она записывается в таблицу', async () => {
    const { default: App } = await import('./App.vue')
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await w.find('[data-test="goal-add"]').trigger('click')
    await w.find('input[type="text"]').setValue('Читать')
    const sel = w.find('[data-test="goal-category-select"]')
    await sel.setValue(sel.findAll('option').at(-1)!.element.getAttribute('value') as string)
    await w.find('[data-test="goal-category-new"]').setValue('Книги')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(db.inserted).toEqual([{ user_id: 'u1', name: 'Книги', position: 0 }])
    w.unmount()
  })

  it('сбой записи категории не мешает сохранить цель', async () => {
    db.insertError = { code: '42501', message: 'rls' }
    const { default: App } = await import('./App.vue')
    const w = mount(App, { attachTo: document.body })
    await flushPromises()
    await w.find('[data-test="goal-add"]').trigger('click')
    await w.find('input[type="text"]').setValue('Цель')
    const sel = w.find('[data-test="goal-category-select"]')
    await sel.setValue(sel.findAll('option').at(-1)!.element.getAttribute('value') as string)
    await w.find('[data-test="goal-category-new"]').setValue('Новая')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(api.addGoal).toHaveBeenCalledTimes(1)
    expect(w.find('.modal-backdrop').exists()).toBe(false)
    w.unmount()
  })
})
