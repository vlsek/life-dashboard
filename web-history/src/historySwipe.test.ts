import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в calendarSwipe.test.ts пилота Календаря).
import { readFileSync } from 'node:fs'

// История переехала в календарь (v3.42, коммит f123135): эта страница только перенаправляет на /calendar/?view=history. Прежняя проверка свайпа по
// сетке месяца (BACKLOG раздел 27, v2.67) относилась к сетке, которой здесь больше нет, — она перенесена в web-calendar/src/historySwipe.test.ts.
const app: string = readFileSync('src/App.vue', 'utf-8')

describe('история: страница — только перенаправление в календарь', () => {
  it('ведёт на /calendar/ с view=history и не рисует собственной сетки', () => {
    expect(app).toContain("new URL('/calendar/', window.location.origin)")
    expect(app).toContain("searchParams.set('view', 'history')")
    expect(app).toContain('window.location.replace(')
    expect(app).not.toContain('hist-grid')
  })
})
