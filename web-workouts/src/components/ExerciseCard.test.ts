import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ExerciseCard from './ExerciseCard.vue'
import type { Exercise } from '../lib/types'

const exercise = { id: 'ex1', user_id: 'u', name: 'Pull-ups', category: 'upper', tracks_weight: false, unit: null, value_label: null, suggested_scheme: '3x8', created_at: '' } as unknown as Exercise
const body = (w: ReturnType<typeof mount>) => w.find('[data-testid="exercise-body"]')

describe('ExerciseCard collapse', () => {
  beforeEach(() => localStorage.clear())

  it('is expanded by default and collapses on toggle, keeping the header', async () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: [] } })
    expect((body(w).element as HTMLElement).style.display).not.toBe('none')
    await w.find('[data-testid="exercise-toggle"]').trigger('click')
    expect((body(w).element as HTMLElement).style.display).toBe('none')
    expect(w.text()).toContain('Pull-ups')
    expect(localStorage.getItem('workouts_ex_collapsed:ex1')).toBe('1')
  })

  it('starts collapsed when the state was saved earlier, and expands back', async () => {
    localStorage.setItem('workouts_ex_collapsed:ex1', '1')
    const w = mount(ExerciseCard, { props: { exercise, entries: [] } })
    expect((body(w).element as HTMLElement).style.display).toBe('none')
    await w.find('[data-testid="exercise-toggle"]').trigger('click')
    expect((body(w).element as HTMLElement).style.display).not.toBe('none')
    expect(localStorage.getItem('workouts_ex_collapsed:ex1')).toBeNull()
  })

  it('toggle button shows a chevron (no text arrow) that turns with the state, and exposes aria-expanded', async () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: [] } })
    const toggle = w.find('[data-testid="exercise-toggle"]')
    const chevron = () => toggle.find('.collapse-chevron').attributes('data-collapsed')
    expect(toggle.text()).toBe('')
    expect(chevron()).toBe('false')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(chevron()).toBe('true')
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })
})

// BACKLOG 590: «+ подход» / «− подход» прямо в таблице записей
describe('ExerciseCard: быстрые подходы', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })
  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const sets = (n: number) => Array.from({ length: n }, (_, i) => ({ reps: 10 + i, weight: null, time: '10:00', duration: null, side: null }))
  const entry = (over: Record<string, unknown> = {}) => ({ id: 'n1', user_id: 'u', exercise_id: 'ex1', date: today, sets: sets(1), notes: null, ...over }) as never

  it('кнопки только у сегодняшней записи с подходами; «−» — когда подходов больше одного', () => {
    const w = mount(ExerciseCard, { props: { exercise, entries: [entry({ id: 'a' }), entry({ id: 'b', date: '2020-01-01', sets: sets(3) })] } })
    expect(w.findAll('[data-testid="quick-add-set"]')).toHaveLength(1)
    expect(w.findAll('[data-testid="quick-remove-set"]')).toHaveLength(0)
    w.unmount()
    const two = mount(ExerciseCard, { props: { exercise, entries: [entry({ sets: sets(2) })] } })
    expect(two.find('[data-testid="quick-remove-set"]').exists()).toBe(true)
    two.unmount()
  })

  it('тап по кнопкам отправляет события с записью; пока запись сохраняется — кнопки отключены', async () => {
    const e = entry({ sets: sets(2) })
    const w = mount(ExerciseCard, { props: { exercise, entries: [e] } })
    await w.find('[data-testid="quick-add-set"]').trigger('click')
    await w.find('[data-testid="quick-remove-set"]').trigger('click')
    expect(w.emitted('addSet')![0][0]).toEqual(e)
    expect(w.emitted('removeLastSet')![0][0]).toEqual(e)
    await w.setProps({ busyEntryId: 'n1' })
    expect(w.find('[data-testid="quick-add-set"]').attributes('disabled')).toBeDefined()
    expect(w.find('[data-testid="quick-remove-set"]').attributes('disabled')).toBeDefined()
    w.unmount()
  })

  it('подписи для скринридера и английский текст кнопок', () => {
    localStorage.setItem('site_lang', 'en')
    const w = mount(ExerciseCard, { props: { exercise, entries: [entry({ sets: sets(2) })] } })
    expect(w.find('[data-testid="quick-add-set"]').text()).toBe('+ set')
    expect(w.find('[data-testid="quick-add-set"]').attributes('aria-label')).toContain('copies the last')
    expect(w.find('[data-testid="quick-remove-set"]').attributes('aria-label')).toContain('Remove the last set')
    w.unmount()
  })
})
