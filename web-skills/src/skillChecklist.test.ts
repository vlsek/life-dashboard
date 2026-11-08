import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { allDone, checklistFromText, checklistPercent, checklistToText, normalizeChecklist, toggleItem } from './lib/skillChecklist'
import { buildSkillRow } from './lib/skills'
import SkillCard from './components/SkillCard.vue'
import SkillForm from './components/SkillForm.vue'
import type { Skill } from './lib/types'

// BACKLOG 77.12: этапы навыка вместо ручного процента (миграция 122).
const db = vi.hoisted(() => ({ updates: [] as { id: string; patch: Record<string, unknown> }[] }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => ({
      update: (patch: Record<string, unknown>) => ({
        eq: async (_c: string, id: string) => {
          db.updates.push({ id, patch })
          return { error: null }
        },
      }),
    }),
    auth: { getSession: async () => ({ data: { session: null } }) },
  },
}))
import { useSkills } from './lib/useSkills'

const skill = (over: Partial<Skill> = {}): Skill =>
  ({ id: 's1', user_id: 'u', name: 'Гитара', progress: 0, mastered: false, step: 10, points: 10, checklist: [{ name: 'Аккорды', done: false }, { name: 'Бой', done: false }, { name: 'Песня', done: false }], created_at: '2026-01-01', ...over }) as Skill
beforeEach(() => {
  localStorage.setItem('site_lang', 'ru')
  db.updates = []
})

describe('чистая логика', () => {
  it('normalize: пустые и мусор отбрасываются, длина и число ограничены', () => {
    expect(normalizeChecklist([{ name: ' A ', done: true }, { name: '  ' }, null, { name: 'B', done: 'yes' }])).toEqual([{ name: 'A', done: true }, { name: 'B', done: false }])
    expect(normalizeChecklist(Array.from({ length: 30 }, (_, i) => ({ name: 'x' + i })))).toHaveLength(20)
    expect(normalizeChecklist('нет')).toEqual([])
  })
  it('процент по выполненным; пустой список — null', () => {
    expect(checklistPercent([])).toBeNull()
    expect(checklistPercent([{ name: 'a', done: true }, { name: 'b', done: false }, { name: 'c', done: false }])).toBe(33)
    expect(checklistPercent(allDone([{ name: 'a', done: false }]))).toBe(100)
  })
  it('правка списка сохраняет выполненные пункты с тем же названием', () => {
    const prev = [{ name: 'Аккорды', done: true }, { name: 'Бой', done: false }]
    expect(checklistFromText('Аккорды\nБой\nПесня', prev)).toEqual([{ name: 'Аккорды', done: true }, { name: 'Бой', done: false }, { name: 'Песня', done: false }])
    expect(checklistToText(prev)).toBe('Аккорды\nБой')
    expect(toggleItem(prev, 1)[1].done).toBe(true)
  })
  it('buildSkillRow: колонки нет — не пишем; есть — пишем, пусто — null', () => {
    expect(buildSkillRow({ name: 'Г', step: 10, points: 10, checklistText: 'A\nB' })).not.toHaveProperty('checklist')
    expect(buildSkillRow({ name: 'Г', step: 10, points: 10, checklistText: 'A\nB' }, { checklistColumn: true }).checklist).toEqual([{ name: 'A', done: false }, { name: 'B', done: false }])
    expect(buildSkillRow({ name: 'Г', step: 10, points: 10, checklistText: '' }, { checklistColumn: true }).checklist).toBeNull()
  })
})

describe('отметка этапа', () => {
  it('процент и «освоен» следуют за списком', async () => {
    const { toggleChecklistItem } = useSkills()
    await toggleChecklistItem(skill(), 0)
    expect(db.updates[0].patch).toMatchObject({ progress: 33, mastered: false })
    const almost = skill({ checklist: [{ name: 'A', done: true }, { name: 'B', done: false }] })
    await toggleChecklistItem(almost, 1)
    expect(db.updates[1].patch).toMatchObject({ progress: 100, mastered: true })
  })
  it('«освоено» отмечает все этапы; снятие не оставляет 100% по списку', async () => {
    const { toggleMastered } = useSkills()
    await toggleMastered(skill())
    expect((db.updates[0].patch.checklist as { done: boolean }[]).every((i) => i.done)).toBe(true)
    await toggleMastered(skill({ mastered: true, progress: 100, checklist: allDone(skill().checklist!) }))
    expect(db.updates[1].patch).toMatchObject({ mastered: false, progress: 67 })
  })
})

describe('карточка и форма', () => {
  it('с этапами: список вместо кнопок −/+, тап отдаёт индекс', async () => {
    const w = mount(SkillCard, { props: { skill: skill({ progress: 33, checklist: [{ name: 'Аккорды', done: true }, { name: 'Бой', done: false }, { name: 'Песня', done: false }] }) } })
    expect(w.findAll('[data-test="skill-checklist-item"]')).toHaveLength(3)
    expect(w.find('[data-test="skill-up"]').exists()).toBe(false)
    await w.findAll('[data-test="skill-checklist-item"]')[1].trigger('click')
    expect(w.emitted('item')![0]).toEqual([1])
  })
  it('без этапов — прежние кнопки', () => {
    const w = mount(SkillCard, { props: { skill: skill({ checklist: null }) } })
    expect(w.find('[data-test="skill-up"]').exists()).toBe(true)
    expect(w.find('[data-test="skill-checklist"]').exists()).toBe(false)
  })
  it('форма: поле этапов только с колонкой; текст уходит в save; шаг скрывается', async () => {
    const off = mount(SkillForm, { props: { isEdit: false, initial: { name: 'Г', step: 10, points: 10 } } })
    expect(off.find('[data-test="skill-checklist"]').exists()).toBe(false)
    const w = mount(SkillForm, { props: { isEdit: false, initial: { name: 'Г', step: 10, points: 10 }, checklistEnabled: true } })
    expect(w.find('input[type="number"]').exists()).toBe(true)
    await w.get('[data-test="skill-checklist"]').setValue('A\nB')
    expect(w.findAll('input[type="number"]')).toHaveLength(1) // остались только баллы, шаг скрыт
    await w.get('form').trigger('submit')
    expect(w.emitted('save')![0][0]).toMatchObject({ checklistText: 'A\nB' })
  })
})
