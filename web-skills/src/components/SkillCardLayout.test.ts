import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SkillCard from './SkillCard.vue'
import cardSource from './SkillCard.vue?raw'
import appSource from '../App.vue?raw'
import type { Skill } from '../lib/types'

// BACKLOG 576 (аудит оформления, обход стендом с данными): заголовок навыка был зажат плашкой баллов и двумя кнопками (2–4 строки), полоса
// прогресса короче карточки, а в таблицах «Освоенные» и «Книги» баллы висели посередине. Решение то же, что у карточки цели (58.8).
const skill = (o: Partial<Skill> = {}): Skill => ({ id: 's1', user_id: 'u', name: 'Handstand', progress: 40, step: 10, points: 15, mastered: false, created_at: '2026-10-01', ...o }) as Skill

describe('SkillCard: раскладка (аудит 576)', () => {
  it('баллы — в нижней строке рядом с «−/+», не рядом с заголовком', () => {
    const w = mount(SkillCard, { props: { skill: skill() } })
    expect(w.find('[data-test="skill-footer"] [data-test="skill-points"]').exists()).toBe(true)
    expect(w.find('[data-test="skill-footer"] [data-test="skill-down"]').exists()).toBe(true)
    expect(w.find('[data-test="skill-name"]').element.querySelector('[data-test="skill-points"]')).toBe(null)
    expect(w.find('[data-test="skill-footer"]').element.lastElementChild).toBe(w.find('[data-test="skill-points"]').element)
  })
  it('кнопки действий в углу карточки, заголовку оставлено место под них', () => {
    const w = mount(SkillCard, { props: { skill: skill() } })
    expect(w.find('article').classes()).toContain('relative')
    expect(w.find('[data-test="skill-actions"] [data-test="skill-edit"]').exists()).toBe(true)
    expect(w.find('[data-test="skill-actions"] [data-test="skill-delete"]').exists()).toBe(true)
    expect(cardSource).toMatch(/\.skill-actions \{[^}]*position: absolute[^}]*top: 0\.75rem[^}]*right: 0\.75rem/s)
    expect(cardSource).toMatch(/\.skill-title \{[^}]*padding-right: 4\.4rem[^}]*min-height: 1\.9rem/s)
  })
})

describe('таблицы «Освоенные» и «Книги»: колонки (аудит 576)', () => {
  const rows = [...appSource.matchAll(/<tr v-for="[^"]+" :key="[^"]+" class="align-top">([\s\S]*?)<\/tr>/g)].map((m) => m[1])
  it('найдены три таблицы (освоенные, книги «хочу прочитать», «прочитано»)', () => expect(rows).toHaveLength(3))
  it('в каждой название занимает всё свободное место, баллы и кнопки — узкие колонки по центру строки', () => {
    for (const r of rows) {
      expect(r).toMatch(/<td class="[^"]*w-full[^"]*">/)
      expect(r).toMatch(/w-px[^"]*align-middle[^"]*text-xs">\{\{ [sb]\.points \?\? 10 \}\}/)
      expect(r).toMatch(/<td class="w-px whitespace-nowrap py-1\.5 text-right align-middle">/)
    }
  })
})
