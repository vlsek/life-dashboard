import type { HistoryContext } from './stats'
import { dayStats, weekStats } from './stats'
import type { Metric } from './types'

// Те же данные и ожидаемые значения, что были провалидированы вручную для history.js
// (см. чат: "пн 100%", "вт 87%", "ср 100%", "сегодня 0%", "неделя пн-чт 84%").
const mA: Metric = { id: 'A', name: 'Зарядка', icon: '🏃', type: 'boolean' }
const mB: Metric = { id: 'B', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, unit: 'мл' }
const mC: Metric = { id: 'C', name: 'Зал', icon: '🏋️', type: 'boolean', schedule: { type: 'days', days: [1, 3, 5] } }
const mD: Metric = { id: 'D', name: 'Чтение 3/нед', icon: '📚', type: 'boolean', schedule: { type: 'weekly', min: 3 } }

const ctx: HistoryContext = {
  metrics: [mA, mB, mC, mD],
  byDate: {
    '2026-09-21': { A: true, B: 2100, C: true },
    '2026-09-22': { A: true, B: 500 },
    '2026-09-23': { A: true, B: 2000, C: true, D: true },
    '2026-09-24': { A: false, B: 100 },
  },
  notesByDate: {
    '2026-09-22': {
      date: '2026-09-22',
      planned_goals: [
        { type: 'custom', text: 'Позвонить', done: true },
        { type: 'custom', text: 'Бонус', done: true, bonus: true },
      ],
    },
  },
  goals: [],
  settings: { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' },
  firstDate: '2026-09-21',
  today: '2026-09-24',
}

import { describe, expect, it } from 'vitest'

describe('dayStats/weekStats — сверка с эталонными значениями vanilla history.js', () => {
  it('пн 100% (D не сделан — не штрафует)', () => {
    expect(dayStats(ctx, '2026-09-21')).toEqual({ done: 3, total: 3, bonusPct: 0, pct: 100 })
  })
  it('вт 87% (2/3=67% + бонус 20)', () => {
    expect(dayStats(ctx, '2026-09-22')).toEqual({ done: 2, total: 3, bonusPct: 20, pct: 87 })
  })
  it('ср 100% (D сделан — учитывается)', () => {
    expect(dayStats(ctx, '2026-09-23')).toEqual({ done: 4, total: 4, bonusPct: 0, pct: 100 })
  })
  it('сегодня 0%', () => {
    expect(dayStats(ctx, '2026-09-24')).toEqual({ done: 0, total: 2, bonusPct: 0, pct: 0 })
  })
  it('неделя пн-чт 84%', () => {
    expect(weekStats(ctx, '2026-09-21')).toEqual({ done: 9, total: 14, bonusPct: 20, pct: 84 })
  })
  it('неделя до первых данных → null', () => {
    expect(weekStats(ctx, '2026-09-14')).toBeNull()
  })
})
