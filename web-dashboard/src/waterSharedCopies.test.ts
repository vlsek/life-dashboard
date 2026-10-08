import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в newGoalCopy.test.ts).
import { readFileSync } from 'node:fs'

// Чистая логика воды лежит в двух пилотах (бандлы независимы): Дашборд (окно воды на странице) и шапка web-header (окно воды и правая шторка на ВСЕХ
// страницах). В комментариях файлов написано «менять в ОБОИХ» — эта сверка падает, если копии разошлись (например, «крестик» у записи журнала, BACKLOG 23:17,
// или шкала отмены): тогда одно и то же действие вело бы себя по-разному на главной и на остальных страницах.
const read = (p: string): string => readFileSync(p, 'utf-8')

describe('общий код воды совпадает между web-dashboard и web-header', () => {
  it.each(['waterUndo.ts', 'waterLog.ts', 'water.ts', 'waterTracking.ts'])('lib/%s — файл в файл', (name: string) => {
    expect(read(`src/lib/${name}`)).toBe(read(`../web-header/src/lib/${name}`))
  })
  it('тесты общей логики журнала воды тоже одинаковые (иначе одну из копий перестали бы проверять)', () => {
    expect(read('src/lib/waterRemoveEntry.test.ts')).toBe(read('../web-header/src/lib/waterRemoveEntry.test.ts'))
    expect(read('src/lib/waterTracking.test.ts')).toBe(read('../web-header/src/lib/waterTracking.test.ts'))
    expect(read('src/components/WaterModalRemove.test.ts')).toBe(read('../web-header/src/components/WaterModalRemove.test.ts'))
  })
})
