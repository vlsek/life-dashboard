import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GoalTemplatesModal from './GoalTemplatesModal.vue'
import { GOAL_TEMPLATES } from '../lib/goalTemplates'

describe('GoalTemplatesModal (76.8)', () => {
  it('показывает все шаблоны и отдаёт выбранный', async () => {
    const w = mount(GoalTemplatesModal, { props: { have: new Set<string>() } })
    expect(w.findAll('[data-test="goal-tpl-item"]')).toHaveLength(GOAL_TEMPLATES.length)
    await w.findAll('[data-test="goal-tpl-pick"]')[0].trigger('click')
    expect((w.emitted('pick')![0][0] as { id: string }).id).toBe(GOAL_TEMPLATES[0].id)
  })
  it('уже добавленная цель помечена и без кнопки', () => {
    const first = GOAL_TEMPLATES[0]
    const w = mount(GoalTemplatesModal, { props: { have: new Set([first.ru.name.toLowerCase()]) } })
    expect(w.findAll('[data-test="goal-tpl-have"]')).toHaveLength(1)
    expect(w.findAll('[data-test="goal-tpl-pick"]')).toHaveLength(GOAL_TEMPLATES.length - 1)
  })
  it('✕ и клик по фону закрывают', async () => {
    const w = mount(GoalTemplatesModal, { props: { have: new Set<string>() } })
    await w.find('[data-test="goal-tpl-close"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})
