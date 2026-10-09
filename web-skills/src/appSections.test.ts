import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import CollapsibleSection from './components/CollapsibleSection.vue'
import SkillCard from './components/SkillCard.vue'
import { filterSkills, sortSkills } from './lib/skillsView'
import type { Skill } from './lib/types'

// Страница целиком завязана на Supabase, поэтому проверяем связку «секция + карточки + поиск/сортировка» на тех же кусках.
const sk = (name: string, progress: number, created_at: string): Skill => ({ id: name, user_id: 'u', name, progress, mastered: false, step: 10, points: 10, created_at })

describe('секция «В процессе»: сворачивание не теряет карточки, поиск и сортировка работают на карточках', () => {
  beforeEach(() => localStorage.clear())
  it('поиск оставляет подходящие карточки, сворачивание прячет, но не удаляет их', async () => {
    const all = [sk('Гитара', 40, '2026-01-02'), sk('Шахматы', 70, '2026-01-04'), sk('Английский', 10, '2026-01-01')]
    const C = defineComponent({
      props: { q: { type: String, default: '' } },
      setup: (p) => () => h(CollapsibleSection, { id: 'active', title: 'В процессе', count: all.length }, () => sortSkills(filterSkills(all, p.q), 'progress').map((s) => h(SkillCard, { skill: s, key: s.id }))),
    })
    const w = mount(C)
    expect(w.findAll('[data-test="skill-name"]').map((n) => n.text())).toEqual(['Шахматы', 'Гитара', 'Английский'])
    await w.setProps({ q: 'гит' })
    expect(w.findAll('[data-test="skill-name"]').map((n) => n.text())).toEqual(['Гитара'])
    await w.find('button').trigger('click')
    expect(w.findAll('[data-test="skill-card"]')).toHaveLength(1)
    expect((w.find('[data-test="section-body-active"]').element as HTMLElement).style.display).toBe('none')
  })
})
