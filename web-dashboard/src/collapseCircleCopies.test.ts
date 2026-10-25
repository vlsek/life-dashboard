import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node; vitest выполняется в node (как в newGoalCopy.test.ts).
import { readFileSync } from 'node:fs'

// «Стрелка в кружке» (collapse_circle, вид `circle`) должна быть нарисована везде, где маркер сворачивания применяется: шеврон Дашборда и «Тренировок»,
// превью в «Кастомизации», и описана одинаково в трёх копиях collapseStyle.ts. Поворот у неё общий (вправо в свёрнутом виде) — в исключения «без поворота» её нет.
const read = (p: string): string => readFileSync(p, 'utf-8')

describe('маркер «Стрелка в кружке» во всех местах', () => {
  for (const pilot of ['web-dashboard', 'web-workouts']) {
    it(pilot + ': шеврон рисует кружок со стрелкой и поворачивается как базовый', () => {
      expect(read(`../${pilot}/src/components/CollapseChevron.vue`)).toContain("collapseStyle === 'circle'")
      const none = read(`../${pilot}/src/style.css`).split('\n').find((l) => l.includes('[data-marker="ring"][data-collapsed="true"]') && l.includes('transform: none'))!
      expect(none).not.toContain('[data-marker="circle"]')
    })
  }
  it('превью рисует маркер в трёх строках; три копии collapseStyle.ts одинаковы и знают предмет', () => {
    expect((read('../web-customization/src/components/CollapsePreview.vue').match(/variant === 'circle'/g) ?? []).length).toBe(3)
    const copies = ['web-customization', 'web-dashboard', 'web-workouts'].map((p) => read(`../${p}/src/lib/collapseStyle.ts`))
    for (const c of copies) expect(c).toContain("collapse_circle: 'circle'")
    expect(new Set(copies).size).toBe(1)
  })
})
