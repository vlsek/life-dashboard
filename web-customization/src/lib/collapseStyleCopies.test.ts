import { describe, expect, it } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'

// BACKLOG 498: чистая логика «вид сворачивания» живёт одинаковой копией в пилотах, которые её применяют (изоляция пилотов).
// Срез 2 добавит web-workouts в этот список.
describe('collapseStyle: копии в пилотах', () => {
  it('web-customization и web-dashboard держат ОДИНАКОВЫЙ файл (менять вместе)', () => {
    const base: string = readFileSync('src/lib/collapseStyle.ts', 'utf-8')
    expect(readFileSync('../web-dashboard/src/lib/collapseStyle.ts', 'utf-8')).toBe(base)
  })
})
