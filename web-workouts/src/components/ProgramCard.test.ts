import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgramCard from './ProgramCard.vue'
import { workoutTemplates } from '../lib/templates'
import { startProgram } from '../lib/program'

const tpl = workoutTemplates('ru').find((x) => x.id === 'pushups_6w')!

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
})

describe('ProgramCard: активная программа', () => {
  it('в первую неделю показывает «Неделя 1 из 6», схему недели и отмечает её в списке как текущую', () => {
    const w = mount(ProgramCard, { props: { program: startProgram('pushups_6w', '2026-10-03'), template: tpl, today: '2026-10-05' } })
    expect(w.find('[data-testid="program-current"]').text()).toContain('Неделя 1 из 6')
    expect(w.find('[data-testid="program-current"]').text()).toContain('3×8')
    expect(w.find('[data-testid="program-current"]').text()).toContain('Дней до следующей недели: 5')
    const lis = w.findAll('li')
    expect(lis).toHaveLength(6)
    expect(lis[0].attributes('data-current')).toBe('true')
    expect(lis[1].attributes('data-current')).toBeUndefined()
  })

  it('по дате старта подсказывает нужную неделю (день 15 → неделя 3, схема 4×10)', () => {
    const w = mount(ProgramCard, { props: { program: startProgram('pushups_6w', '2026-10-03'), template: tpl, today: '2026-10-18' } })
    expect(w.find('[data-testid="program-current"]').text()).toContain('Неделя 3 из 6')
    expect(w.find('[data-testid="program-current"]').text()).toContain('4×10')
    expect(w.findAll('li')[2].attributes('data-current')).toBe('true')
  })

  it('отметка недели шлёт toggle-week с номером с нуля; прогресс считает отмеченные', async () => {
    const program = { ...startProgram('pushups_6w', '2026-10-03'), doneWeeks: [0] }
    const w = mount(ProgramCard, { props: { program, template: tpl, today: '2026-10-12' } })
    expect((w.find('[data-testid="program-week-0"]').element as HTMLInputElement).checked).toBe(true)
    expect((w.find('[data-testid="program-week-1"]').element as HTMLInputElement).checked).toBe(false)
    expect(w.text()).toContain('Пройдено недель: 1 из 6')
    await w.find('[data-testid="program-week-1"]').trigger('change')
    expect(w.emitted('toggle-week')![0]).toEqual([1])
  })

  it('календарь вышел — «Программа пройдена», текущей недели нет', () => {
    const w = mount(ProgramCard, { props: { program: startProgram('pushups_6w', '2026-10-03'), template: tpl, today: '2026-11-20' } })
    expect(w.find('[data-testid="program-finished"]').exists()).toBe(true)
    expect(w.find('[data-testid="program-current"]').exists()).toBe(false)
    expect(w.findAll('li').every((li) => li.attributes('data-current') === undefined)).toBe(true)
  })

  it('завершение — в два шага без системного confirm: сначала вопрос, событие finish только после «Да»', async () => {
    const w = mount(ProgramCard, { props: { program: startProgram('pushups_6w', '2026-10-03'), template: tpl, today: '2026-10-05' } })
    expect(w.find('[data-testid="program-finish-ask"]').exists()).toBe(false)
    await w.find('[data-testid="program-finish"]').trigger('click')
    expect(w.find('[data-testid="program-finish-ask"]').exists()).toBe(true)
    expect(w.emitted('finish')).toBeUndefined()
    await w.find('[data-testid="program-finish-yes"]').trigger('click')
    expect(w.emitted('finish')).toHaveLength(1)
  })

  it('«Продолжить» закрывает вопрос и ничего не завершает', async () => {
    const w = mount(ProgramCard, { props: { program: startProgram('pushups_6w', '2026-10-03'), template: tpl, today: '2026-10-05' } })
    await w.find('[data-testid="program-finish"]').trigger('click')
    await w.findAll('button').find((b) => b.text() === 'Продолжить')!.trigger('click')
    expect(w.find('[data-testid="program-finish-ask"]').exists()).toBe(false)
    expect(w.emitted('finish')).toBeUndefined()
  })
})

describe('ProgramCard: программа из нескольких упражнений', () => {
  const multi = workoutTemplates('ru').find((x) => x.id === 'bodyweight_6w')!

  it('текущая неделя показывает схему каждого упражнения', () => {
    const w = mount(ProgramCard, { props: { program: startProgram('bodyweight_6w', '2026-10-03'), template: multi, today: '2026-10-05' } })
    const box = w.find('[data-testid="program-items"]')
    expect(box.text()).toContain('Отжимания')
    expect(box.text()).toContain('3×8')
    expect(box.text()).toContain('Приседания')
    expect(box.text()).toContain('3×15')
    expect(box.text()).toContain('Планка')
    // вторая неделя (8 дней от старта) — другие числа
    const w2 = mount(ProgramCard, { props: { program: startProgram('bodyweight_6w', '2026-10-03'), template: multi, today: '2026-10-11' } })
    expect(w2.find('[data-testid="program-current"]').text()).toContain('Неделя 2 из 6')
    expect(w2.find('[data-testid="program-items"]').text()).toContain('3×18')
    expect(w2.findAll('li')).toHaveLength(6)
  })

  it('у программы из одного упражнения блока по упражнениям нет', () => {
    const w = mount(ProgramCard, { props: { program: startProgram('pushups_6w', '2026-10-03'), template: tpl, today: '2026-10-05' } })
    expect(w.find('[data-testid="program-items"]').exists()).toBe(false)
  })
})
