import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import TemplatesModal from './TemplatesModal.vue'

describe('TemplatesModal: progressive programs', () => {
  it('shows the week-by-week table for a progressive program and not for a plain template', async () => {
    const w = mount(TemplatesModal)
    const cards = w.findAll('.cursor-pointer')
    const plain = cards.find((c) => !/6 (недель|weeks)|Отжимания|Подтягивания|Push-ups|Pull-ups/.test(c.text()))!
    await plain.trigger('click')
    expect(w.find('[data-testid="template-weeks"]').exists()).toBe(false)

    await w.findAll('button').find((b) => b.text().startsWith('←'))!.trigger('click')
    const push = w.findAll('.cursor-pointer').find((c) => /Отжимания: 6|Push-ups: 6/.test(c.text()))!
    await push.trigger('click')
    const weeks = w.find('[data-testid="template-weeks"]')
    expect(weeks.exists()).toBe(true)
    expect(weeks.findAll('li')).toHaveLength(6)
  })

  it('applies with the template object so week 1 becomes the exercise scheme', async () => {
    const w = mount(TemplatesModal)
    await w.findAll('.cursor-pointer').find((c) => /Подтягивания: 6|Pull-ups: 6/.test(c.text()))!.trigger('click')
    await w.findAll('button').find((b) => /Добавить в мои упражнения|Add to my exercises/.test(b.text()))!.trigger('click')
    const tpl = w.emitted('apply')![0][0] as { id: string; days: { exercises: { scheme: string }[] }[] }
    expect(tpl.id).toBe('pullups_6w')
    expect(tpl.days[0].exercises[0].scheme).toBe('4×2')
  })
})
