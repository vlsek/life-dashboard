import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в themeDefaultAllPilots.test.ts).
import { readFileSync } from 'node:fs'

// «Страж» (BACKLOG 54.5): модель тела для карты мышц живёт в двух пилотах (web-workouts — эталон, web-header — копия для мини-карты).
// Копии обязаны совпадать, иначе мини-карта в правой панели покажет другой силуэт, чем «Тренировки».
const read = (p: string): string => readFileSync(p, 'utf-8')
describe('модель тела: копии одинаковы', () => {
  for (const f of ['bodyModel.ts', 'muscleShapes.ts']) {
    it(`web-header/src/lib/${f} == web-workouts/src/lib/${f}`, () => {
      expect(read(`../web-header/src/lib/${f}`)).toBe(read(`../web-workouts/src/lib/${f}`))
    })
  }
})
