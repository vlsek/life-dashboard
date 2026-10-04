import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AppShell from './components/AppShell.vue'
import ExerciseCard from './components/ExerciseCard.vue'
import ExerciseForm from './components/ExerciseForm.vue'
import EntryForm from './components/EntryForm.vue'
import TemplatesModal from './components/TemplatesModal.vue'
import type { Exercise, WorkoutEntry } from './lib/types'

const exercise: Exercise = {
  id: 'ex1',
  user_id: 'u1',
  name: 'Bench press',
  category: 'upper',
  tracks_weight: true,
  value_label: 'Reps',
  unit: 'kg',
  suggested_scheme: '3×8',
  created_at: '2026-01-01',
}
const entry: WorkoutEntry = {
  id: 'en1',
  user_id: 'u1',
  exercise_id: 'ex1',
  date: '2026-01-05',
  sets: [{ reps: 8, weight: 80, time: null, duration: null, side: null }],
  notes: 'felt good',
}

describe('AppShell (workouts pilot)', () => {
  it('links to itself at /workouts/', () => {
    const wrapper = mount(AppShell, { props: { userEmail: null } })
    expect(wrapper.html()).toContain('/workouts/')
    wrapper.unmount()
  })
})

describe('ExerciseCard', () => {
  it('shows name, suggested scheme, best-set record and the entry row', () => {
    const wrapper = mount(ExerciseCard, { props: { exercise, entries: [entry] } })
    const text = wrapper.text()
    expect(text).toContain('Bench press')
    expect(text).toContain('3×8')
    expect(text).toContain('8×80kg')
    expect(text).toContain('05.01.2026')
    expect(text).toContain('felt good')
    wrapper.unmount()
  })

  it('shows the empty-state text when there are no entries', () => {
    const wrapper = mount(ExerciseCard, { props: { exercise, entries: [] } })
    expect(wrapper.findAll('table').length).toBe(0)
    wrapper.unmount()
  })

  it('emits deleteEntry / editEntry with the entry', async () => {
    const wrapper = mount(ExerciseCard, { props: { exercise, entries: [entry] } })
    const rowButtons = wrapper.findAll('tbody button')
    await rowButtons[0].trigger('click')
    await rowButtons[1].trigger('click')
    expect(wrapper.emitted('editEntry')?.[0]).toEqual([entry])
    expect(wrapper.emitted('deleteEntry')?.[0]).toEqual([entry])
    wrapper.unmount()
  })
})

describe('ExerciseForm', () => {
  it('does not save with an empty name', async () => {
    const wrapper = mount(ExerciseForm, { props: { existing: null } })
    await wrapper.find('form').trigger('submit.prevent')
    expect(wrapper.emitted('save')).toBeUndefined()
    wrapper.unmount()
  })

  it('emits save with entered name and default tracks_weight yes', async () => {
    const wrapper = mount(ExerciseForm, { props: { existing: null } })
    await wrapper.find('input[type="text"]').setValue('Squat')
    await wrapper.find('form').trigger('submit.prevent')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { name: string; tracks_weight: string }
    expect(saved.name).toBe('Squat')
    expect(saved.tracks_weight).toBe('yes')
    wrapper.unmount()
  })

  it('preselects "add my own category" for a legacy free-text category', () => {
    const wrapper = mount(ExerciseForm, { props: { existing: { ...exercise, category: 'Push Day' } } })
    expect((wrapper.find('[data-testid="category-select"]').element as HTMLSelectElement).value).toBe('__new__') // первым в форме может быть список разновидностей (BACKLOG 585)
    wrapper.unmount()
  })
})

describe('EntryForm', () => {
  it('starts with one blank set, add/remove keeps at least one', async () => {
    const wrapper = mount(EntryForm, { props: { exercise, existing: null } })
    expect(wrapper.findAll('input[type="number"]').length).toBe(2) // reps + weight
    const buttons = wrapper.findAll('button[type="button"]')
    // last two "button" types are cancel and add-set order: remove(x), add set, cancel
    const addSet = buttons.find((b) => b.text().includes('Add set') || b.text().includes('Добавить подход'))!
    await addSet.trigger('click')
    expect(wrapper.findAll('input[type="number"]').length).toBe(4)
    wrapper.unmount()
  })

  it('emits save with cleaned sets (blank rows dropped)', async () => {
    const wrapper = mount(EntryForm, { props: { exercise, existing: null } })
    const [reps, weight] = wrapper.findAll('input[type="number"]')
    await reps.setValue(10)
    await weight.setValue(60)
    await wrapper.find('form').trigger('submit.prevent')
    const saved = wrapper.emitted('save')?.[0]?.[0] as { sets: { reps: number; weight: number }[] }
    expect(saved.sets.length).toBe(1)
    expect(saved.sets[0].reps).toBe(10)
    expect(saved.sets[0].weight).toBe(60)
    wrapper.unmount()
  })

  it('shows the L/R toggle only for bilateral exercises', () => {
    const plain = mount(EntryForm, { props: { exercise, existing: null } })
    expect(plain.text()).not.toMatch(/(^|\s)L(\s|$)/)
    plain.unmount()
    const bi = mount(EntryForm, { props: { exercise: { ...exercise, bilateral: true }, existing: null } })
    expect(bi.html()).toContain('rounded-lg border')
    bi.unmount()
  })
})

describe('TemplatesModal', () => {
  it('lists templates, previews one on click, and emits apply', async () => {
    const wrapper = mount(TemplatesModal)
    const cards = wrapper.findAll('.cursor-pointer')
    expect(cards.length).toBe(6)
    await cards[0].trigger('click')
    const applyBtn = wrapper.findAll('button').find((b) => /Add to my exercises|Добавить в мои упражнения/.test(b.text()))!
    await applyBtn.trigger('click')
    expect(wrapper.emitted('apply')?.[0]?.[0]).toMatchObject({ id: 'full_body_beginner' })
    wrapper.unmount()
  })
})
