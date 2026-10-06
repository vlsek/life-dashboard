import { describe, expect, it } from 'vitest'
import { buildMonthGrid, groupDeadlines, openDeadlines } from './calendar'
import type { CalendarCell } from './types'
// @ts-ignore — в проекте нет типов node, vitest выполняется в node
import { readFileSync } from 'node:fs'

// BACKLOG 940, часть 1: срок цели (goals.deadline) показывается в календаре на этот день.
describe('groupDeadlines', () => {
  it('группирует по дате срока, пропускает цели без срока, сохраняет порядок', () => {
    const r = groupDeadlines([
      { id: '1', name: 'A', done: false, deadline: '2026-10-10' },
      { id: '2', name: 'B', done: true, deadline: '2026-10-10' },
      { id: '3', name: 'C', done: false, deadline: null },
      { id: '4', name: 'D', done: null, deadline: '2026-10-12' },
    ])
    expect(Object.keys(r)).toEqual(['2026-10-10', '2026-10-12'])
    expect(r['2026-10-10'].map((g) => g.name)).toEqual(['A', 'B'])
    expect(r['2026-10-12'][0].done).toBe(false)
  })
  it('пустой и null вход — пустая карта', () => {
    expect(groupDeadlines(null)).toEqual({})
    expect(groupDeadlines([])).toEqual({})
  })
})

describe('openDeadlines', () => {
  it('считает только невыполненные', () => {
    expect(openDeadlines([{ id: '1', name: 'A', done: true }, { id: '2', name: 'B', done: false }])).toBe(1)
    expect(openDeadlines([])).toBe(0)
  })
})

describe('buildMonthGrid + сроки целей', () => {
  const deadlines = { '2026-10-10': [{ id: '1', name: 'A', done: false }] }
  it('цель попадает в ячейку своего дня, в остальных deadlines пуст', () => {
    const cells = buildMonthGrid(2026, 9, {}, '2026-10-06', deadlines).filter(Boolean) as CalendarCell[]
    expect(cells.find((c) => c.dateStr === '2026-10-10')!.deadlines).toHaveLength(1)
    expect(cells.filter((c) => c.dateStr !== '2026-10-10').every((c) => c.deadlines.length === 0)).toBe(true)
  })
  it('без пятого аргумента (старые вызовы) у всех ячеек deadlines пуст', () => {
    const cells = buildMonthGrid(2026, 9, {}, '2026-10-06').filter(Boolean) as CalendarCell[]
    expect(cells.every((c) => Array.isArray(c.deadlines) && c.deadlines.length === 0)).toBe(true)
  })
})

describe('разметка', () => {
  const app: string = readFileSync('src/App.vue', 'utf-8')
  const modal: string = readFileSync('src/components/DayModal.vue', 'utf-8')
  const loader: string = readFileSync('src/lib/useCalendar.ts', 'utf-8')
  it('ячейка с целями получает маркер; выполненные — приглушённый класс', () => {
    expect(app).toContain('data-test="cal-deadline"')
    expect(app).toContain('cal-deadline-done')
  })
  it('окно дня показывает цели со сроком только для чтения (без чекбоксов и кнопок)', () => {
    const i = modal.indexOf('data-test="day-deadlines"')
    const block = modal.slice(i, modal.indexOf('</div>\n\n', i))
    expect(i).toBeGreaterThan(-1)
    expect(block).not.toContain('<input')
    expect(block).not.toContain('<button')
  })
  it('цели читаются по сроку внутри месяца; сбой чтения целей календарь не ломает', () => {
    expect(loader).toContain(".gte('deadline', from).lte('deadline', to)")
    expect(loader).toContain('goalsRes.error ? {}')
  })
})
