import { describe, expect, it } from 'vitest'
// @ts-ignore — node-модули нужны только тесту
import { readFileSync } from 'node:fs'
// @ts-ignore
import { join } from 'node:path'
declare const __dirname: string

// «Начал тренировку, хочу отжимания — там „значение“ и повторы. Что в значении? Доп. вес?» — да: у упражнений без учёта веса первая колонка —
// необязательный дополнительный вес (отягощение). Заголовок говорит это прямо и с единицей, а не «Значение».
const src = readFileSync(join(__dirname, 'lib', 'i18n.ts'), 'utf-8')
describe('активная тренировка: колонка у упражнений без веса', () => {
  it('в словарях нет слова «Значение»/«Value» для этой колонки', () => {
    expect(src).toMatch(/aw_value: 'Extra weight'/)
    expect(src).toMatch(/aw_value: 'Доп\. вес'/)
  })
  it('заголовок колонки приписывает единицу измерения', () => {
    const vue = readFileSync(join(__dirname, 'components', 'ActiveWorkout.vue'), 'utf-8')
    expect(vue).toMatch(/t\('aw_value'\) \+ ', ' \+ unitOf\(/)
  })
})
