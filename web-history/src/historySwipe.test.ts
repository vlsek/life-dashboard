import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в calendarSwipe.test.ts пилота Календаря).
import { readFileSync } from 'node:fs'

// BACKLOG раздел 27 (апд26): «аналогично с фиксом Свайпа в календаре надо сделать такой же для раздела история».
// Левая шторка (AppShell.vue) пропускает жест, если палец лёг внутрь .no-edge-swipe; правая панель шапки (web-header,
// isSwipeBlockedTarget) — внутрь [data-no-swipe]. До v2.67 в Истории было только первое: правая панель всё равно выезжала.
const app: string = readFileSync('src/App.vue', 'utf-8')
const shell: string = readFileSync('src/components/AppShell.vue', 'utf-8')

const tag = (testId: string): string => {
  const i = app.indexOf(`data-test="${testId}"`)
  expect(i, testId).toBeGreaterThan(-1)
  return app.slice(app.lastIndexOf('<div', i), app.indexOf('>', i) + 1)
}

describe('история: свайп не выдвигает боковые плашки', () => {
  it('сетка месяца помечена и для левой шторки (.no-edge-swipe), и для правой панели (data-no-swipe)', () => {
    const grid = tag('hist-grid')
    expect(grid).toContain('no-edge-swipe')
    expect(grid).toContain('data-no-swipe')
  })

  it('смена месяца свайпом по сетке сохранилась (обработчики на месте)', () => {
    const grid = tag('hist-grid')
    expect(grid).toContain('@touchstart="onTouchStart"')
    expect(grid).toContain('@touchend="onTouchEnd"')
  })

  it('строка выбора месяца (‹ месяц › сегодня) помечена так же', () => {
    const head = tag('hist-head')
    expect(head).toContain('no-edge-swipe')
    expect(head).toContain('data-no-swipe')
  })

  it('остальная страница НЕ помечена: <main> целиком не блокирует жесты, иначе края страницы перестали бы открывать шторки', () => {
    const main = app.slice(app.indexOf('<main'), app.indexOf('>', app.indexOf('<main')) + 1)
    expect(main).not.toContain('no-edge-swipe')
    expect(main).not.toContain('data-no-swipe')
  })

  it('левая шторка действительно пропускает жест, начатый внутри .no-edge-swipe (иначе класс ничего не даёт)', () => {
    expect(shell).toMatch(/target\.closest\('\.no-edge-swipe'\)/)
  })

  it('кнопки месяца и выбор дня на месте (разметка не потеряла обработчики)', () => {
    expect(app).toContain('@click="shiftMonth(-1)"')
    expect(app).toContain('@click="shiftMonth(1)"')
    expect(app).toContain('@click="cell.dateStr && (selectedDate = cell.dateStr)"')
  })
})
