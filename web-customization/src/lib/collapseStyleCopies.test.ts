import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 498: логика «вид сворачивания» живёт ОДИНАКОВЫМИ копиями в пилотах, которые её применяют (изоляция пилотов).
// collapseStyle.ts — чистый разбор значения и кэш (customization, dashboard, workouts);
// useCollapseStyle.ts — реактивный стиль, «шина» аккордеона и загрузка из профиля (dashboard, workouts).
const read = (p: string): string => readFileSync(p, 'utf-8')

describe('collapseStyle: копии в пилотах', () => {
  it('collapseStyle.ts одинаков в web-customization, web-dashboard и web-workouts (менять вместе)', () => {
    const base = read('src/lib/collapseStyle.ts')
    expect(read('../web-dashboard/src/lib/collapseStyle.ts')).toBe(base)
    expect(read('../web-workouts/src/lib/collapseStyle.ts')).toBe(base)
  })
  it('useCollapseStyle.ts одинаков в web-dashboard и web-workouts (менять вместе)', () => {
    expect(read('../web-workouts/src/lib/useCollapseStyle.ts')).toBe(read('../web-dashboard/src/lib/useCollapseStyle.ts'))
  })
  it('CollapseSummary.vue («карточка со сводкой») одинаков в web-dashboard и web-workouts', () => {
    expect(read('../web-workouts/src/components/CollapseSummary.vue')).toBe(read('../web-dashboard/src/components/CollapseSummary.vue'))
  })
  it('CSS-правило .collapse-summary одинаково в style.css обоих пилотов (от своего комментария до конца самого правила — чужие дописки ниже не мешают)', () => {
    const block = (p: string): string => {
      const css = read(p)
      const i = css.indexOf('/* Вид сворачивания «карточка со сводкой»')
      expect(i, p + ': нет блока').toBeGreaterThan(-1)
      const start = css.indexOf('.collapse-summary {', i)
      const end = css.indexOf('\n}\n', start)
      expect(end, p + ': нет конца правила').toBeGreaterThan(start)
      return css.slice(i, end + 3)
    }
    expect(block('../web-workouts/src/style.css')).toBe(block('../web-dashboard/src/style.css'))
  })
})
