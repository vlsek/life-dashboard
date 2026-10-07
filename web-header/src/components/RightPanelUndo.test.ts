import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import RightPanel from './RightPanel.vue'

// BACKLOG «08:55 — отмена добавленной воды и в правой шторке»: в блоке воды правой панели есть «Отменить последнее», когда отменять есть что.
const base = { open: true, day: null, week: null, water: { todayMl: 700, normMl: 2000 }, savedTick: 0 }

describe('правая панель: отмена последнего добавления воды', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))

  it('кнопка показывается, только когда есть что отменять', () => {
    const none = mount(RightPanel, { props: { ...base, canUndoWater: false } })
    expect(none.find('[data-test="panel-undo"]').exists()).toBe(false)
    const unset = mount(RightPanel, { props: base }) // старое поведение: проп не передан
    expect(unset.find('[data-test="panel-undo"]').exists()).toBe(false)
    const some = mount(RightPanel, { props: { ...base, canUndoWater: true } })
    expect(some.find('[data-test="panel-undo"]').exists()).toBe(true)
    for (const w of [none, unset, some]) w.unmount()
  })

  it('клик отправляет undo-water, а «+200/+500» и «Подробнее» работают как раньше', async () => {
    const w = mount(RightPanel, { props: { ...base, canUndoWater: true } })
    await w.find('[data-test="panel-undo"]').trigger('click')
    expect(w.emitted('undo-water')).toHaveLength(1)
    await w.find('[data-test="panel-add-200"]').trigger('click')
    await w.find('[data-test="panel-add-500"]').trigger('click')
    await w.find('[data-test="panel-water-details"]').trigger('click')
    expect(w.emitted('add-water')).toEqual([[200], [500]])
    expect(w.emitted('open-water')).toHaveLength(1)
    w.unmount()
  })

  it('кнопка подписана по-русски и по-английски, с иконкой-стрелкой', () => {
    const ru = mount(RightPanel, { props: { ...base, canUndoWater: true } })
    expect(ru.find('[data-test="panel-undo"]').text()).toBe('Отменить последнее')
    expect(ru.find('[data-test="panel-undo"]').attributes('aria-label')).toBe('Отменить последнее добавление')
    expect(ru.find('[data-test="panel-undo"] svg').exists()).toBe(true)
    localStorage.setItem('site_lang', 'en')
    const en = mount(RightPanel, { props: { ...base, canUndoWater: true } })
    expect(en.find('[data-test="panel-undo"]').text()).toBe('Undo last')
    ru.unmount()
    en.unmount()
  })
})
