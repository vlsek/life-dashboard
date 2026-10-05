import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

// BACKLOG раздел 35 «Цели: категории должны сохраняться (список своих категорий)»: выбор из своих категорий + «Новая категория…».
const api = vi.hoisted(() => ({ addGoal: vi.fn(), updateGoal: vi.fn(), itemsRef: null as unknown as { value: Record<string, unknown>[] } }))

vi.mock('./lib/useGoals', () => ({
  useGoals: () => ({
    auth: ref({ status: 'ready', userId: 'u1', userEmail: 'a@b.c' }),
    items: api.itemsRef,
    error: ref(null),
    init: () => {},
    addGoal: api.addGoal,
    updateGoal: api.updateGoal,
    deleteGoal: vi.fn(),
    toggleGoal: vi.fn(),
    stepGoal: vi.fn(),
    setStage: vi.fn(),
  }),
}))

import App from './App.vue'
import { categoryKey, matchCategory, savedCategories } from './lib/categories'

const g = (category: string, extra: Record<string, unknown> = {}) => ({ id: Math.random().toString(), name: 'x', category, done: false, points: 5, stages: 1, ...extra })

describe('savedCategories', () => {
  it('уникальные категории, самые частые сверху, при равенстве — по алфавиту', () => {
    expect(savedCategories([g('Спорт'), g('Учёба'), g('Спорт'), g('Дом')])).toEqual(['Спорт', 'Дом', 'Учёба'])
  })
  it('регистр и лишние пробелы не плодят дубли; пишется самое частое написание', () => {
    expect(savedCategories([g('спорт'), g('Спорт'), g(' Спорт  '), g('СПОРТ')])).toEqual(['Спорт'])
  })
  it('выполненные цели тоже дают категории (список не пропадает, когда цель закрыта)', () => {
    expect(savedCategories([g('Здоровье', { done: true })])).toEqual(['Здоровье'])
  })
  it('пустые и «Без категории» (на любом языке) в список не попадают', () => {
    expect(savedCategories([g(''), g('   '), g('Без категории'), g('No category'), g('Дом')], ['Без категории', 'No category'])).toEqual(['Дом'])
  })
  it('нет целей — пустой список', () => {
    expect(savedCategories([])).toEqual([])
  })
})

describe('matchCategory / categoryKey', () => {
  it('пустое значение и «Без категории» — это пункт «без категории»', () => {
    expect(matchCategory('', ['Дом'], ['Без категории'])).toBe('')
    expect(matchCategory('без категории', ['Дом'], ['Без категории'])).toBe('')
  })
  it('значение из списка находится в его написании, чужое — null', () => {
    expect(matchCategory(' дом ', ['Дом'])).toBe('Дом')
    expect(matchCategory('Работа', ['Дом'])).toBeNull()
  })
  it('categoryKey сворачивает регистр и пробелы', () => {
    expect(categoryKey('  Мой   Спорт ')).toBe('мой спорт')
  })
})

describe('форма цели: категории', () => {
  beforeEach(() => {
    localStorage.setItem('site_lang', 'ru')
    api.addGoal.mockReset().mockResolvedValue(undefined)
    api.updateGoal.mockReset().mockResolvedValue(undefined)
    api.itemsRef = ref([g('Спорт'), g('Спорт'), g('Дом'), g('Без категории')]) as unknown as { value: Record<string, unknown>[] }
  })
  const open = async () => {
    const w = mount(App, { attachTo: document.body })
    await w.find('[data-test="goal-add"]').trigger('click')
    return w
  }
  const select = (w: ReturnType<typeof mount>) => w.find('[data-test="goal-category-select"]')

  it('в списке свои категории (частые сверху), «Без категории» первой и «Новая категория…» последней', async () => {
    const w = await open()
    const opts = select(w).findAll('option').map((o) => o.text())
    expect(opts).toEqual(['Без категории', 'Спорт', 'Дом', '+ Новая категория…'])
    expect(w.find('[data-test="goal-category-new"]').exists()).toBe(false)
    w.unmount()
  })

  it('выбрали свою категорию — цель сохраняется с ней', async () => {
    const w = await open()
    await w.find('input[type="text"]').setValue('Бегать')
    await select(w).setValue('Спорт')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(api.addGoal.mock.calls[0][1]).toMatchObject({ name: 'Бегать', category: 'Спорт' })
    w.unmount()
  })

  it('«Новая категория…» открывает поле; введённое название сохраняется (с обрезкой пробелов)', async () => {
    const w = await open()
    await w.find('input[type="text"]').setValue('Читать')
    await select(w).setValue(select(w).findAll('option').at(-1)!.element.getAttribute('value') as string)
    const field = w.find('[data-test="goal-category-new"]')
    expect(field.exists()).toBe(true)
    await field.setValue('  Книги ')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(api.addGoal.mock.calls[0][1]).toMatchObject({ name: 'Читать', category: 'Книги' })
    w.unmount()
  })

  it('по умолчанию «Без категории»: категория уходит пустой (подпись подставит сохранение)', async () => {
    const w = await open()
    await w.find('input[type="text"]').setValue('Просто цель')
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(api.addGoal.mock.calls[0][1]).toMatchObject({ category: '' })
    w.unmount()
  })

  it('«Новая категория…» с пустым полем = без категории', async () => {
    const w = await open()
    await w.find('input[type="text"]').setValue('Цель')
    await select(w).setValue(select(w).findAll('option').at(-1)!.element.getAttribute('value') as string)
    await w.find('[data-test="goal-form-save"]').trigger('click')
    await flushPromises()
    expect(api.addGoal.mock.calls[0][1]).toMatchObject({ category: '' })
    w.unmount()
  })

  it('новая категория появляется в списке при следующем открытии формы', async () => {
    const w = await open()
    api.itemsRef.value.push(g('Книги'))
    await w.find('[data-test="goal-form-save"]').trigger('click') // пустое название — форма остаётся, закрываем отменой
    await w.find('button.secondary').trigger('click')
    await w.find('[data-test="goal-add"]').trigger('click')
    expect(select(w).findAll('option').map((o) => o.text())).toContain('Книги')
    w.unmount()
  })
})
