import { describe, expect, it } from 'vitest'
import { buildNextRow, canRepeat, nextDeadline, normalizeRepeat, nthDeadline } from './repeatGoal'
import { buildInsertRow, buildUpdateRow } from './goals'
import type { Goal } from './types'

const goal = (over: Partial<Goal> = {}): Goal =>
  ({ id: 'g1', user_id: 'u', name: 'Оплатить квартиру', points: 10, category: 'Дом', stages: 1, current_stage: 1, done: true, done_date: '2026-11-05', deadline: '2026-11-05', difficulty: 'medium', horizon: 'day', repeat_every: 'month', created_at: '2026-01-01', ...over }) as Goal

describe('nthDeadline / nextDeadline', () => {
  it('неделя, месяц, год', () => {
    expect(nthDeadline('2026-11-05', 'week', 1)).toBe('2026-11-12')
    expect(nthDeadline('2026-11-28', 'week', 1)).toBe('2026-12-05')
    expect(nthDeadline('2026-11-05', 'month', 1)).toBe('2026-12-05')
    expect(nthDeadline('2026-12-05', 'month', 1)).toBe('2027-01-05')
    expect(nthDeadline('2026-11-05', 'year', 1)).toBe('2027-11-05')
  })
  it('31-е в коротком месяце — последний день, но день не «съезжает»', () => {
    expect(nthDeadline('2026-01-31', 'month', 1)).toBe('2026-02-28')
    expect(nthDeadline('2026-01-31', 'month', 2)).toBe('2026-03-31')
    expect(nthDeadline('2024-02-29', 'year', 1)).toBe('2025-02-28')
  })
  it('опоздали больше периода — ближайший будущий срок, а не прошлый', () => {
    expect(nextDeadline({ deadline: '2026-09-05' }, 'month', '2026-11-20')).toBe('2026-12-05')
    expect(nextDeadline({ deadline: '2026-11-05' }, 'month', '2026-11-05')).toBe('2026-12-05')
    expect(nextDeadline({ deadline: null }, 'week', '2026-11-06')).toBe('2026-11-13')
  })
})

describe('buildNextRow', () => {
  it('копия без прогресса, срок через период, повтор сохранён', () => {
    const r = buildNextRow(goal(), '2026-11-06')
    expect(r).toMatchObject({ name: 'Оплатить квартиру', points: 10, category: 'Дом', stages: 1, current_stage: 0, done: false, deadline: '2026-12-05', repeat_every: 'month', difficulty: 'medium', horizon: 'day' })
    expect(r).not.toHaveProperty('id')
    expect(r).not.toHaveProperty('done_date')
  })
  it('без повтора — ошибка; цель на вес не повторяется', () => {
    expect(() => buildNextRow(goal({ repeat_every: null }), '2026-11-06')).toThrow()
    expect(canRepeat(goal({ weight_mode: 'lose' } as Partial<Goal>))).toBe(false)
    expect(canRepeat(goal())).toBe(true)
  })
  it('normalizeRepeat отсекает мусор', () => {
    expect(normalizeRepeat('month')).toBe('month')
    expect(normalizeRepeat('day')).toBeNull()
    expect(normalizeRepeat(undefined)).toBeNull()
  })
})

describe('запись повтора в базу', () => {
  const res = { name: 'Счета', category: '', stages: 1, difficulty: 'easy' as const, deadline: '2026-11-05', horizon: 'day' as const, repeat: 'month' as const }
  it('колонки нет — repeat_every не пишем', () => {
    expect(buildInsertRow(res, 'Без категории')).not.toHaveProperty('repeat_every')
  })
  it('колонка есть — пишем; без срока или у цели на вес повтор сбрасывается', () => {
    expect(buildInsertRow(res, 'Без категории', { repeatColumn: true })).toMatchObject({ repeat_every: 'month' })
    expect(buildInsertRow({ ...res, deadline: '' }, 'Без категории', { repeatColumn: true })).toMatchObject({ repeat_every: null })
    expect(buildInsertRow({ ...res, weightMode: 'lose', weightStart: 80, weightTarget: 75 }, 'Без категории', { repeatColumn: true })).toMatchObject({ repeat_every: null })
    expect(buildUpdateRow({ ...res, repeat: null }, goal(), 'Без категории', { repeatColumn: true })).toMatchObject({ repeat_every: null })
  })
})
