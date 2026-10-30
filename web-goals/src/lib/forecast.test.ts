import { describe, expect, it } from 'vitest'
import { forecastGoal } from './forecast'

const today = new Date('2026-10-30T12:00:00')
const g = (o = {}) => ({ stages: 10, current_stage: 0, done: false, deadline: '2026-11-27', created_at: '2026-10-02', ...o })

describe('forecastGoal (76.11)', () => {
  it('нет прогноза: простая цель, без срока, выполнена, просрочена, все этапы сделаны', () => {
    expect(forecastGoal(g({ stages: 1 }), today)).toBeNull()
    expect(forecastGoal(g({ deadline: null }), today)).toBeNull()
    expect(forecastGoal(g({ done: true }), today)).toBeNull()
    expect(forecastGoal(g({ deadline: '2026-10-20' }), today)).toBeNull()
    expect(forecastGoal(g({ current_stage: 10 }), today)).toBeNull()
  })
  it('нужно в неделю: 10 этапов за 28 дней = 2,5', () => {
    expect(forecastGoal(g(), today)?.needPerWeek).toBe(2.5)
  })
  it('срок сегодня считается как 1 день (без деления на ноль)', () => {
    const f = forecastGoal(g({ deadline: '2026-10-30', current_stage: 8 }), today)!
    expect(f.needPerWeek).toBe(14)
  })
  it('цели меньше 7 дней — темп не судим', () => {
    const f = forecastGoal(g({ created_at: '2026-10-26', current_stage: 3 }), today)!
    expect(f.status).toBe('unknown')
    expect(f.pacePerWeek).toBeNull()
  })
  it('успеваешь: темп не ниже нужного', () => {
    // создана 28 дней назад, сделано 6 → 1,5/нед; осталось 4 за 28 дней → 1/нед
    const f = forecastGoal(g({ current_stage: 6 }), today)!
    expect(f.pacePerWeek).toBe(1.5)
    expect(f.needPerWeek).toBe(1)
    expect(f.status).toBe('ontrack')
  })
  it('отстаёшь: темп ниже нужного или ни одного этапа за неделю+', () => {
    expect(forecastGoal(g({ current_stage: 1 }), today)!.status).toBe('behind')
    expect(forecastGoal(g({ current_stage: 0 }), today)!.status).toBe('behind')
  })
  it('битая дата создания не ломает расчёт', () => {
    expect(forecastGoal(g({ created_at: 'oops' }), today)!.status).toBe('unknown')
  })
})
