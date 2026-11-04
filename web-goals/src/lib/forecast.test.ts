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
  // Часовой пояс (73.5): created_at в базе — МОМЕНТ времени с часами, а «сегодня» — локальная полночь. Возраст цели — календарные дни в ЛОКАЛЬНОМ поясе,
  // а не «прошедшие сутки от момента создания»; иначе он занижался на день, темп завышался, а «рано судить» длилось на день дольше.
  const localDaysAgo = (n: number, h: number, mi = 0): string => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    d.setHours(h, mi, 0, 0)
    return d.toISOString()
  }
  it('создана днём 28 дней назад (момент с часами) — возраст ровно 28 дней, темп 1,5/нед в любом часовом поясе', () => {
    const f = forecastGoal(g({ created_at: localDaysAgo(28, 14, 33), current_stage: 6 }), today)!
    expect(f.pacePerWeek).toBe(1.5)
    expect(f.status).toBe('ontrack')
  })
  it('создана поздно вечером ровно 7 дней назад — темп уже судим (не «unknown»)', () => {
    const f = forecastGoal(g({ created_at: localDaysAgo(7, 23, 59), current_stage: 2 }), today)!
    expect(f.pacePerWeek).toBe(2)
    expect(f.status).not.toBe('unknown')
  })
  it('создана рано утром 6 дней назад — темп ещё не судим', () => {
    expect(forecastGoal(g({ created_at: localDaysAgo(6, 0, 5), current_stage: 2 }), today)!.status).toBe('unknown')
  })
  // два этапа за 14 календарных дней = 1/нед; если считать «сутки по 24 часа» (floor) — получится 13 дней и 1,1/нед. Окно с переходом на летнее время:
  // Европа (29.03.2026) и США (08.03.2026) — какой из поясов запущен, тот и проверяется; в UTC перехода нет, и тест просто подтверждает базовый случай.
  it.each([['2026-04-05T12:00:00', 'Европа'], ['2026-03-15T12:00:00', 'США']])('через переход на летнее время (сутки по 23 часа) возраст — целые календарные дни: 14 дней, 2 этапа = 1/нед (%s, %s)', (now) => {
    const t = new Date(now)
    const c = new Date(t)
    c.setDate(c.getDate() - 14)
    c.setHours(9, 0, 0, 0)
    const f = forecastGoal(g({ created_at: c.toISOString(), current_stage: 2, deadline: '2026-05-10' }), t)!
    expect(f.pacePerWeek).toBe(1)
  })
  it('битая дата создания не ломает расчёт', () => {
    expect(forecastGoal(g({ created_at: 'oops' }), today)!.status).toBe('unknown')
  })
})
