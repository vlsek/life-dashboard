import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import GoalCard from './GoalCard.vue'
import type { Goal } from '../lib/types'

const goal = (o: Partial<Goal> = {}): Goal => ({
  id: 'g1', user_id: 'u', name: 'Run a marathon', points: 20, category: 'Sport', stages: 1, current_stage: 0,
  done: false, done_date: null, deadline: null, difficulty: null, created_at: '2026-09-01', ...o,
})
const mountCard = (o: Partial<Goal> = {}) => mount(GoalCard, { props: { goal: goal(o) } })

describe('GoalCard: simple goal', () => {
  it('shows name, points and a round check that emits toggle', async () => {
    const w = mountCard()
    expect(w.find('[data-test="goal-name"]').text()).toBe('Run a marathon')
    expect(w.find('[data-test="goal-points"]').text()).toContain('20')
    const check = w.find('[data-test="goal-check"]')
    expect(check.attributes('role')).toBe('checkbox')
    expect(check.attributes('aria-checked')).toBe('false')
    await check.trigger('click')
    expect(w.emitted('toggle')).toHaveLength(1)
    expect(w.find('[data-test="goal-progress"]').exists()).toBe(false)
    expect(w.find('[data-test="goal-expand"]').exists()).toBe(false)
  })
  it('defaults the points to 5 when empty', () => {
    const w = mountCard({ points: null as unknown as number })
    expect(w.find('[data-test="goal-points"]').text()).toContain('5')
  })
  it('edit and delete buttons emit', async () => {
    const w = mountCard()
    await w.find('[data-test="goal-edit"]').trigger('click')
    await w.find('[data-test="goal-delete"]').trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
    expect(w.emitted('delete')).toHaveLength(1)
  })
})

describe('GoalCard: multi-stage goal', () => {
  it('shows one segment per stage with the completed ones filled, the count and the percentage', () => {
    const w = mountCard({ stages: 5, current_stage: 2 })
    const segs = w.findAll('[data-test="goal-seg"]')
    expect(segs).toHaveLength(5)
    expect(segs.filter((s) => s.classes().includes('goal-seg-on'))).toHaveLength(2)
    expect(w.find('[data-test="goal-count"]').text()).toBe('2/5')
    expect(w.find('[data-test="goal-percent"]').text()).toBe('40%')
    expect(w.find('[data-test="goal-check"]').exists()).toBe(false)
  })
  it('switches to a solid bar when there are too many stages for segments', () => {
    const w = mountCard({ stages: 20, current_stage: 5 })
    expect(w.findAll('[data-test="goal-seg"]')).toHaveLength(0)
    expect(w.find('[data-test="goal-bar-fill"]').attributes('style')).toContain('width: 25%')
  })
  it('the "+" button completes the next stage', async () => {
    const w = mountCard({ stages: 5, current_stage: 2 })
    await w.find('[data-test="goal-next"]').trigger('click')
    expect(w.emitted('stage')![0]).toEqual([3])
  })
  it('the stage list is collapsed by default and opens on demand', async () => {
    const w = mountCard({ stages: 3, current_stage: 1 })
    expect(w.find('[data-test="goal-stages"]').exists()).toBe(false)
    const toggle = w.find('[data-test="goal-expand"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    await nextTick()
    expect(w.findAll('[data-test="goal-stage"]')).toHaveLength(3)
    expect(w.find('[data-test="goal-expand"]').attributes('aria-expanded')).toBe('true')
  })
  it('tapping a stage sets progress up to it; tapping the last completed one undoes it', async () => {
    const w = mountCard({ stages: 4, current_stage: 2 })
    await w.find('[data-test="goal-expand"]').trigger('click')
    await nextTick()
    const stages = w.findAll('[data-test="goal-stage"]')
    await stages[3].trigger('click') // этап 4
    await stages[1].trigger('click') // этап 2 — он последний выполненный → откат на 1
    await stages[0].trigger('click') // этап 1 при прогрессе 2 → выставить 1
    expect(w.emitted('stage')!.map((e) => e[0])).toEqual([4, 1, 1])
  })
  it('marks completed stages in the list and labels them for screen readers', async () => {
    const w = mountCard({ stages: 3, current_stage: 2 })
    await w.find('[data-test="goal-expand"]').trigger('click')
    await nextTick()
    const stages = w.findAll('[data-test="goal-stage"]')
    expect(stages.map((s) => s.classes().includes('goal-stage-on'))).toEqual([true, true, false])
    expect(stages[0].attributes('aria-label')).toContain('1')
    expect(stages[2].attributes('aria-label')).not.toBe(stages[0].attributes('aria-label'))
  })
  it('a finished goal has no "+" button', () => {
    const w = mountCard({ stages: 3, current_stage: 3, done: true })
    expect(w.find('[data-test="goal-next"]').exists()).toBe(false)
    expect(w.find('[data-test="goal-name"]').classes()).toContain('line-through')
  })
})

describe('GoalCard: chips', () => {
  it('shows the difficulty chip', () => {
    const w = mountCard({ difficulty: 'hard' })
    expect(w.find('[data-test="goal-diff"]').exists()).toBe(true)
  })
  it('shows an overdue deadline in red and hides the deadline of a finished goal', () => {
    const w = mountCard({ deadline: '2020-01-01' })
    expect(w.find('[data-test="goal-deadline"]').attributes('style')).toContain('#d6336c')
    const d = mountCard({ deadline: '2020-01-01', done: true })
    expect(d.find('[data-test="goal-deadline"]').exists()).toBe(false)
  })
  it('shows no chips row when there is nothing to show', () => {
    const w = mountCard()
    expect(w.find('[data-test="goal-diff"]').exists()).toBe(false)
    expect(w.find('[data-test="goal-deadline"]').exists()).toBe(false)
  })
})
