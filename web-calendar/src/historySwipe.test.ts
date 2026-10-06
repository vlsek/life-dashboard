import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в calendarSwipe.test.ts).
import { readFileSync } from 'node:fs'

// BACKLOG раздел 27 (апд26, v2.67): свайп по сетке месяца «Истории» не выдвигает боковые плашки. «История» теперь живёт в календаре
// (`?view=history`, v3.42), а старая страница web-history стала редиректом — поэтому проверка перенесена сюда из web-history/src/historySwipe.test.ts.
// Левая шторка (AppShell.vue) пропускает жест, если палец лёг внутрь .no-edge-swipe; правая панель шапки (web-header, isSwipeBlockedTarget) — внутрь [data-no-swipe].
const view: string = readFileSync('src/components/HistoryView.vue', 'utf-8')
const app: string = readFileSync('src/App.vue', 'utf-8')
const shell: string = readFileSync('src/components/AppShell.vue', 'utf-8')

const tag = (testId: string): string => {
  const i = view.indexOf(`data-test="${testId}"`)
  expect(i, testId).toBeGreaterThan(-1)
  return view.slice(view.lastIndexOf('<div', i), view.indexOf('>', i) + 1)
}

describe('история в календаре: свайп не выдвигает боковые плашки', () => {
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

  it('страница целиком НЕ помечена: <main> не блокирует жесты, иначе края страницы перестали бы открывать шторки', () => {
    for (const src of [app, view]) {
      const i = src.indexOf('<main')
      if (i < 0) continue
      const main = src.slice(i, src.indexOf('>', i) + 1)
      expect(main).not.toContain('no-edge-swipe')
      expect(main).not.toContain('data-no-swipe')
    }
  })

  it('левая шторка действительно пропускает жест, начатый внутри .no-edge-swipe (иначе класс ничего не даёт)', () => {
    expect(shell).toMatch(/target\.closest\('\.no-edge-swipe'\)/)
  })

  it('кнопки месяца и выбор дня на месте (разметка не потеряла обработчики)', () => {
    expect(view).toContain('@click="shiftMonth(-1)"')
    expect(view).toContain('@click="shiftMonth(1)"')
    expect(view).toContain('@click="cell.dateStr && (selectedDate = cell.dateStr)"')
  })
})
