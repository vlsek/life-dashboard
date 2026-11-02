import { beforeEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ActiveSkillsList from './components/ActiveSkillsList.vue'
import SkillForm from './components/SkillForm.vue'
import { buildSkillRow } from './lib/skills'
import { categoryOptions, groupByCategory, matchCategory, normalizeCategory, sortSkills } from './lib/skillsView'
import type { Skill, SkillFormInput } from './lib/types'

// BACKLOG 44.4 срез 2 (РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-10-29): категории навыков свободным текстом с выбором из своих; миграция 112.
const sk = (name: string, category?: string | null, progress = 10): Skill => ({ id: name, user_id: 'u', name, progress, mastered: false, step: 10, points: 10, category, created_at: '2026-01-01' })

describe('normalizeCategory', () => {
  it('пробелы по краям и внутри схлопываются; пусто → null; длина ≤ 40', () => {
    expect(normalizeCategory('  Языки  ')).toBe('Языки')
    expect(normalizeCategory('Тяжёлая   атлетика')).toBe('Тяжёлая атлетика')
    for (const empty of [null, undefined, '', '   ', '\n\t']) expect(normalizeCategory(empty)).toBeNull()
    const long = normalizeCategory('я'.repeat(60))!
    expect(long.length).toBe(40)
    expect(normalizeCategory('я'.repeat(39) + ' яяя')!.endsWith(' ')).toBe(false) // обрез не оставляет пробел на конце (миграция 112 такого не примет)
  })
})

describe('categoryOptions и matchCategory — «выбор из своих»', () => {
  it('свои категории: уникальные без учёта регистра, по алфавиту, в первом написании; пустые не берутся', () => {
    const list = [sk('a', 'спорт'), sk('b', 'Спорт'), sk('c', 'Языки'), sk('d', null), sk('e', '  '), sk('f', 'Музыка')]
    expect(categoryOptions(list)).toEqual(['Музыка', 'спорт', 'Языки'])
  })
  it('введённое совпало без учёта регистра с существующей — берём её написание («спорт» и «Спорт» не разъезжаются)', () => {
    expect(matchCategory('СПОРТ', ['Музыка', 'Спорт'])).toBe('Спорт')
    expect(matchCategory('  спорт ', ['Спорт'])).toBe('Спорт')
    expect(matchCategory('Рисование', ['Спорт'])).toBe('Рисование') // новая — как введена
    expect(matchCategory('   ', ['Спорт'])).toBeNull()
  })
})

describe('groupByCategory', () => {
  it('именованные по алфавиту, «Без категории» (null) последней; порядок навыков внутри группы сохраняется', () => {
    const g = groupByCategory([sk('1', 'Языки'), sk('2'), sk('3', 'музыка'), sk('4', 'Языки'), sk('5', null)])
    expect(g.map((x) => x.category)).toEqual(['музыка', 'Языки', null])
    expect(g[1].skills.map((s) => s.name)).toEqual(['1', '4'])
    expect(g[2].skills.map((s) => s.name)).toEqual(['2', '5'])
  })
  it('одна категория с разным регистром — одна группа; категорий нет вообще — одна группа без названия; пусто — пусто', () => {
    expect(groupByCategory([sk('1', 'Спорт'), sk('2', 'спорт')])).toHaveLength(1)
    expect(groupByCategory([sk('1'), sk('2', null)])).toEqual([{ category: null, skills: [sk('1'), sk('2', null)] }])
    expect(groupByCategory([])).toEqual([])
  })
})

describe('buildSkillRow', () => {
  const res: SkillFormInput = { name: '  Гитара ', step: 0, points: 0, category: '  Музыка  ' }
  it('без колонки (миграция 112 не применена) категорию НЕ пишем — прежний патч байт-в-байт', () => {
    expect(buildSkillRow(res)).toEqual({ name: 'Гитара', step: 10, points: 10 })
    expect(buildSkillRow(res)).not.toHaveProperty('category')
    expect(buildSkillRow(res, { categoryColumn: false })).not.toHaveProperty('category')
  })
  it('с колонкой: категория нормализована; пустая — null (чистит категорию при правке)', () => {
    expect(buildSkillRow(res, { categoryColumn: true })).toEqual({ name: 'Гитара', step: 10, points: 10, category: 'Музыка' })
    expect(buildSkillRow({ ...res, category: '   ' }, { categoryColumn: true }).category).toBeNull()
    expect(buildSkillRow({ name: 'X', step: 5, points: 5 }, { categoryColumn: true }).category).toBeNull()
  })
})

describe('SkillForm: поле категории', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  const mountForm = (props: Record<string, unknown>) => mount(SkillForm, { props: { isEdit: false, initial: { name: 'Гитара', step: 10, points: 10, category: '' }, ...props }, attachTo: document.body })
  const submit = async (w: ReturnType<typeof mountForm>) => {
    await w.find('form').trigger('submit')
    await flushPromises()
  }

  it('без колонки поле не показывается (человек не вводит то, что некуда сохранить)', () => {
    const w = mountForm({ categoryEnabled: false })
    expect(w.find('[data-test="skill-category"]').exists()).toBe(false)
    w.unmount()
  })
  it('с колонкой: поле и подсказка из своих категорий (datalist)', () => {
    const w = mountForm({ categoryEnabled: true, categories: ['Музыка', 'Спорт'] })
    const input = w.find('[data-test="skill-category"]')
    expect(input.exists()).toBe(true)
    expect(input.attributes('list')).toBe('skill-categories')
    expect(input.attributes('maxlength')).toBe('40')
    expect(w.findAll('datalist#skill-categories option').map((o) => o.attributes('value'))).toEqual(['Музыка', 'Спорт'])
    w.unmount()
  })
  it('сохранение: введённое совпало с существующей без учёта регистра — уходит её написание; новая — как введена; пусто — пустая строка', async () => {
    const w = mountForm({ categoryEnabled: true, categories: ['Спорт'] })
    await w.find('[data-test="skill-category"]').setValue('  спорт ')
    await submit(w)
    expect((w.emitted('save')![0][0] as SkillFormInput).category).toBe('Спорт')
    await w.find('[data-test="skill-category"]').setValue('Рисование')
    await submit(w)
    expect((w.emitted('save')![1][0] as SkillFormInput).category).toBe('Рисование')
    await w.find('[data-test="skill-category"]').setValue('   ')
    await submit(w)
    expect((w.emitted('save')![2][0] as SkillFormInput).category).toBe('')
    w.unmount()
  })
  it('правка: поле заполнено категорией навыка', () => {
    const w = mountForm({ isEdit: true, categoryEnabled: true, initial: { name: 'Гитара', step: 10, points: 10, category: 'Музыка' } })
    expect((w.find('[data-test="skill-category"]').element as HTMLInputElement).value).toBe('Музыка')
    w.unmount()
  })
})

describe('ActiveSkillsList', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  it('категорий нет — прежний плоский список без секций (ничего не меняется)', () => {
    const w = mount(ActiveSkillsList, { props: { skills: [sk('A'), sk('B', null)] } })
    expect(w.find('[data-test="skills-flat"]').exists()).toBe(true)
    expect(w.find('[data-test="skills-by-category"]').exists()).toBe(false)
    expect(w.findAll('[data-test="skill-card"]')).toHaveLength(2)
    expect(w.findAll('section')).toHaveLength(0)
  })
  it('есть категории — секции: именованные по алфавиту, «Без категории» последней, счётчик в заголовке, все карточки на месте', () => {
    const w = mount(ActiveSkillsList, { props: { skills: [sk('Гитара', 'Музыка'), sk('Бег'), sk('Пианино', 'музыка'), sk('Шахматы', 'Игры')] } })
    expect(w.find('[data-test="skills-by-category"]').exists()).toBe(true)
    const heads = w.findAll('section').map((s) => s.find('h3').text())
    expect(heads).toEqual(['Игры', 'Музыка', 'Без категории'])
    expect(w.findAll('[data-test="section-count"]').map((c) => c.text())).toEqual(['1', '2', '1'])
    expect(w.findAll('[data-test="skill-card"]')).toHaveLength(4)
  })
  it('порядок, заданный вызывающим (сортировка), сохраняется ВНУТРИ каждой секции', () => {
    const all = [sk('Слабый', 'Игры', 10), sk('Сильный', 'Игры', 90), sk('Средний', 'Игры', 50), sk('Один', 'Другое', 5)]
    const w = mount(ActiveSkillsList, { props: { skills: sortSkills(all, 'progress') } })
    const names = w.findAll('section').map((s) => s.findAll('[data-test="skill-name"]').map((n) => n.text()))
    expect(names).toEqual([['Один'], ['Сильный', 'Средний', 'Слабый']])
  })
  it('секция сворачивается без потери карточек и запоминает состояние по категории без учёта регистра', async () => {
    const w = mount(ActiveSkillsList, { props: { skills: [sk('А', 'Музыка'), sk('Б')] } })
    await w.find('[data-test="section-toggle-cat-' + encodeURIComponent('музыка') + '"]').trigger('click')
    expect(w.findAll('[data-test="skill-card"]')).toHaveLength(2) // тело в DOM, просто скрыто
    expect(localStorage.getItem('skills_section_cat-' + encodeURIComponent('музыка'))).toBe('0')
  })
  it('события карточек пробрасываются с нужным навыком (правка, удаление, освоено, шаг прогресса)', async () => {
    const a = sk('А', 'Музыка')
    const w = mount(ActiveSkillsList, { props: { skills: [a, sk('Б')] } })
    await w.find('[data-test="skill-card"]').trigger('click') // карточка кликабельна не везде — проверяем через emit детей
    const cards = w.findAllComponents({ name: 'SkillCard' })
    cards[0].vm.$emit('edit')
    cards[0].vm.$emit('delete')
    cards[0].vm.$emit('mastered')
    cards[0].vm.$emit('bump', 1)
    expect(w.emitted('edit')![0]).toEqual([a])
    expect(w.emitted('delete')![0]).toEqual([a])
    expect(w.emitted('mastered')![0]).toEqual([a])
    expect(w.emitted('bump')![0]).toEqual([a, 1])
  })
})
