import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SkillCard from './SkillCard.vue'
import type { Skill } from '../lib/types'

const skill = (o: Partial<Skill> = {}): Skill =>
  ({ id: 's1', user_id: 'u', name: 'Handstand', progress: 40, step: 10, points: 15, mastered: false, ...o }) as Skill
const card = (o: Partial<Skill> = {}) => mount(SkillCard, { props: { skill: skill(o) } })

describe('SkillCard', () => {
  it('shows the name, points with the coin icon (no emoji) and the percentage', () => {
    const w = card()
    expect(w.find('[data-test="skill-name"]').text()).toBe('Handstand')
    expect(w.find('[data-test="skill-points"]').text()).toContain('15')
    expect(w.find('[data-test="skill-points"] svg.coin-icon').exists()).toBe(true)
    expect(w.text()).not.toContain('⭐')
    expect(w.find('[data-test="skill-percent"]').text()).toBe('40%')
  })
  it('draws a modern progress bar: role, aria values and a width equal to the progress', () => {
    const w = card({ progress: 40 })
    const bar = w.find('[data-test="skill-bar"]')
    expect(bar.attributes('role')).toBe('progressbar')
    expect(bar.attributes('aria-valuenow')).toBe('40')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('100')
    const fill = w.find('[data-test="skill-bar-fill"]').attributes('style') ?? ''
    expect(fill).toContain('width: 40%')
    expect(fill).toContain('var(--accent)')
    expect(fill).toContain('transition')
    expect(w.text()).not.toMatch(/[█░]/)
  })
  it('clamps and defaults the progress (empty → 0, 140 → 100)', () => {
    expect(card({ progress: null as unknown as number }).find('[data-test="skill-percent"]').text()).toBe('0%')
    const over = card({ progress: 140 })
    expect(over.find('[data-test="skill-percent"]').text()).toBe('100%')
    expect(over.find('[data-test="skill-bar-fill"]').attributes('style')).toContain('width: 100%')
  })
  it('defaults the points to 10', () => {
    expect(card({ points: null as unknown as number }).find('[data-test="skill-points"]').text()).toContain('10')
  })
  it('step buttons show the skill step and emit the direction', async () => {
    const w = card({ step: 25 })
    expect(w.find('[data-test="skill-down"]').text()).toBe('−25%')
    expect(w.find('[data-test="skill-up"]').text()).toBe('+25%')
    await w.find('[data-test="skill-up"]').trigger('click')
    await w.find('[data-test="skill-down"]').trigger('click')
    expect(w.emitted('bump')!.map((e) => e[0])).toEqual([1, -1])
  })
  it('defaults the step to 10', () => {
    expect(card({ step: null as unknown as number }).find('[data-test="skill-up"]').text()).toBe('+10%')
  })
  it('the round check marks the skill mastered', async () => {
    const w = card()
    const check = w.find('[data-test="skill-mastered"]')
    expect(check.attributes('role')).toBe('checkbox')
    expect(check.attributes('aria-checked')).toBe('false')
    await check.trigger('click')
    expect(w.emitted('mastered')).toHaveLength(1)
  })
  it('edit and delete are labelled icon buttons, not text glyphs', async () => {
    const w = card()
    const edit = w.find('[data-test="skill-edit"]')
    const del = w.find('[data-test="skill-delete"]')
    expect(edit.attributes('aria-label')).toBeTruthy()
    expect(del.attributes('aria-label')).toBeTruthy()
    expect(edit.find('svg').exists() && del.find('svg').exists()).toBe(true)
    expect(edit.text() + del.text()).toBe('')
    await edit.trigger('click')
    await del.trigger('click')
    expect(w.emitted('edit')).toHaveLength(1)
    expect(w.emitted('delete')).toHaveLength(1)
  })
})
