import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReadingGoalCard from './ReadingGoalCard.vue'

const y = new Date().getFullYear()
const done = (m: number) => ({ status: 'done', done_date: `${y}-${String(m).padStart(2, '0')}-02` })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('ReadingGoalCard (77.4)', () => {
  it('без цели: подсказка, кнопка «Поставить цель», прочитанное всё равно показано', () => {
    const w = mount(ReadingGoalCard, { props: { books: [done(1), done(2)] } })
    expect(w.get('[data-test="rg-caption"]').text()).toContain('Поставь цель')
    expect(w.get('[data-test="rg-count"]').text()).toBe('2')
    expect(w.get('[data-test="rg-edit"]').text()).toBe('Поставить цель')
  })
  it('цель вводится, сохраняется в localStorage и сразу меняет кольцо и подпись', async () => {
    const w = mount(ReadingGoalCard, { props: { books: [done(1)] } })
    await w.get('[data-test="rg-edit"]').trigger('click')
    await w.get('[data-test="rg-input"]').setValue('24')
    await w.get('[data-test="rg-save"]').trigger('click')
    expect(localStorage.getItem(`reading_goal_${y}`)).toBe('24')
    expect(w.get('[data-test="rg-count"]').text().replace(/\s+/g, '')).toBe('1/24')
    expect(w.get('[data-test="rg-caption"]').text()).not.toContain('Поставь цель')
    expect(w.get('[data-test="rg-edit"]').text()).toBe('Изменить цель')
  })
  it('цель уже выполнена: подпись «Цель выполнена», кольцо заполнено', () => {
    localStorage.setItem(`reading_goal_${y}`, '1')
    const w = mount(ReadingGoalCard, { props: { books: [done(1), done(2)] } })
    expect(w.get('[data-test="rg-caption"]').text()).toBe('Цель выполнена')
    expect(w.get('[data-test="rg-ring"]').attributes('stroke-dashoffset')).toBe('0')
  })
  it('двенадцать столбиков по месяцам', () => {
    const w = mount(ReadingGoalCard, { props: { books: [done(3)] } })
    expect(w.get('[data-test="rg-months"]').element.children.length).toBe(12)
  })
})
