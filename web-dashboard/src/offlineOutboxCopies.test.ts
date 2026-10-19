import { describe, expect, it } from 'vitest'
// @ts-ignore — нет типов node (как в bodyModelCopies.test.ts).
import { readFileSync } from 'node:fs'

// «Страж» (BACKLOG 66.1): очередь офлайн-записей лежит в трёх пилотах, копии обязаны совпадать.
const read = (p: string): string => readFileSync(p, 'utf-8')
describe('offlineOutbox: копии одинаковы', () => {
  for (const d of ['web-header', 'web-workouts']) {
    it(`${d}/src/lib/offlineOutbox.ts == web-dashboard`, () => {
      expect(read(`../${d}/src/lib/offlineOutbox.ts`)).toBe(read('src/lib/offlineOutbox.ts'))
    })
  }
})
