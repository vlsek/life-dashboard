import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в StreakFlameTheme.test.ts пилота Дашборда).
import { readFileSync } from 'node:fs'

// BACKLOG 25, «07:38 — свайп по календарю: чтобы не вылезали плашки слева и справа». Левая шторка (AppShell.vue) пропускает жест,
// если палец лёг внутрь .no-edge-swipe; правая панель шапки (web-header, isSwipeBlockedTarget) — внутрь [data-no-swipe].
const app: string = readFileSync('src/App.vue', 'utf-8')
const shell: string = readFileSync('src/components/AppShell.vue', 'utf-8')

const tag = (testId: string): string => {
  const i = app.indexOf(`data-test="${testId}"`)
  expect(i, testId).toBeGreaterThan(-1)
  return app.slice(app.lastIndexOf('<div', i), app.indexOf('>', i) + 1)
}

describe('календарь: свайп не выдвигает боковые плашки', () => {
  it('сетка месяца помечена и для левой шторки (.no-edge-swipe), и для правой панели (data-no-swipe)', () => {
    const grid = tag('cal-grid')
    expect(grid).toContain('no-edge-swipe')
    expect(grid).toContain('data-no-swipe')
    expect(grid).toContain('cal-grid')
  })

  it('строка выбора месяца (‹ месяц ›) помечена так же — свайп по ней тоже не открывает плашки', () => {
    const head = tag('cal-head')
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

  it('поведение: жест, начатый внутри размеченной сетки, ловится closest(.no-edge-swipe) и [data-no-swipe]; снаружи — нет', () => {
    document.body.innerHTML = '<main><div class="cal-grid no-edge-swipe" data-no-swipe><div class="cal-cell"><span id="in">1</span></div></div><p id="out">вне календаря</p></main>'
    const inside = document.getElementById('in') as Element
    const outside = document.getElementById('out') as Element
    expect(inside.closest('.no-edge-swipe')).not.toBeNull()
    expect(inside.closest('[data-no-swipe]')).not.toBeNull()
    expect(outside.closest('.no-edge-swipe')).toBeNull()
    expect(outside.closest('[data-no-swipe]')).toBeNull()
  })

  it('клик по дню и кнопки месяца на месте (разметка не потеряла обработчики)', () => {
    expect(app).toContain('@click="openDay(cell.dateStr)"')
    expect(app).toContain('@click="prevMonth"')
    expect(app).toContain('@click="nextMonth"')
  })
})
