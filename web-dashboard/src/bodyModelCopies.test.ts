import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в themeDefaultAllPilots.test.ts).
import { readFileSync } from 'node:fs'

// «Страж» (BACKLOG 54.5; 59.2 — третья копия в web-customization): модель тела для карты мышц: эталон лежит в shared/body-picker (с BACKLOG 762 срез 2, вариант Б; у web-workouts — реэкспорт), копии — в web-header (мини-карта) и web-customization.
// Копии обязаны совпадать, иначе мини-карта в правой панели покажет другой силуэт, чем «Тренировки».
const read = (p: string): string => readFileSync(p, 'utf-8')
describe('модель тела: копии одинаковы', () => {
  for (const f of ['bodyModel.ts', 'muscleShapes.ts']) {
    it(`web-customization/src/lib/${f} == shared/body-picker/${f}`, () => {
      expect(read(`../web-customization/src/lib/${f}`)).toBe(read(`../shared/body-picker/${f}`))
    })
    it(`web-header/src/lib/${f} == shared/body-picker/${f}`, () => {
      expect(read(`../web-header/src/lib/${f}`)).toBe(read(`../shared/body-picker/${f}`))
    })
  }
  it('web-customization/src/lib/muscles.ts == web-header/src/lib/muscles.ts (урезанный справочник, нужен только тип MuscleId)', () => {
    expect(read('../web-customization/src/lib/muscles.ts')).toBe(read('../web-header/src/lib/muscles.ts'))
  })
})
