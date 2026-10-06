import { describe, expect, it } from 'vitest'
import { calcBalance } from './balance'
import { buildPointsLog, type LogBonus } from './pointsLog'

// BACKLOG раздел 37: бонусные монеты за достижения (миграция 051). Баланс = накоплено + бонус − потрачено; бонус НЕ входит в «накоплено» (total).
const noMetrics: Parameters<typeof calcBalance> = [[], [], [], [], [], []]
const withBonus = (bonus: (number | null)[], spent: (number | null)[] = [], goals = [{ points: 10 }]) =>
  calcBalance([], [], goals, [], [], spent, bonus)

describe('calcBalance с бонусными монетами', () => {
  it('бонус увеличивает баланс, но не «накоплено» (total) — иначе награда сама открывала бы значки «100/500/1000 баллов»', () => {
    const r = withBonus([20, 50])
    expect(r.total).toBe(10) // только цель
    expect(r.bonus).toBe(70)
    expect(r.balance).toBe(80) // 10 + 70
  })
  it('бонус сразу покрывает покупку: накоплено 10, бонус 50, потрачено 40 → баланс 20', () => {
    expect(withBonus([50], [40]).balance).toBe(20)
  })
  it('суммы в десятых долях точны: 0,1 + 0,2 + 0,3 — ровно 0,6, а не 0,6000000000000001', () => {
    const r = calcBalance([], [], [], [], [], [], [0.1, 0.2, 0.3])
    expect(r.bonus).toBe(0.6)
    expect(r.balance).toBe(0.6)
  })
  it('пустые и null-значения бонуса считаются нулём; без аргумента бонуса — как раньше', () => {
    expect(withBonus([null, 0]).bonus).toBe(0)
    const r = calcBalance(...noMetrics)
    expect(r).toEqual({ total: 0, spent: 0, bonus: 0, balance: 0 })
  })
  it('бонус не влияет на total при любых источниках; баланс может уйти в минус только от покупок', () => {
    expect(withBonus([500], [], []).total).toBe(0)
    expect(withBonus([], [30], []).balance).toBe(-30)
  })
})

describe('журнал баллов: строки «награда за достижение»', () => {
  const day = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 30).toISOString() // местное время → местная дата
  const bonus = (key: string, coins: LogBonus['coins'], iso: string): LogBonus => ({ key, coins, granted_at: iso })
  const log = (bonuses: LogBonus[]) => buildPointsLog('2026-10-05', [], [], [], [], [], 7, bonuses)

  it('бонус попадает в день выдачи (по местной дате) как начисление и входит в «заработано»', () => {
    const l = log([bonus('words_10', 20, day(2026, 10, 5)), bonus('words_25', 50, day(2026, 10, 3))])
    expect(l.days[0].entries).toEqual([{ kind: 'bonus', label: 'words_10', icon: null, points: 20 }])
    expect(l.days[2].entries.map((e) => e.points)).toEqual([50])
    expect(l.earnedToday).toBe(20)
    expect(l.earnedWeek).toBe(70)
    expect(l.spentWeek).toBe(0)
  })
  it('выдача около полуночи относится к МЕСТНОЙ дате, а не к UTC', () => {
    const l = log([bonus('a', 10, day(2026, 10, 5, 23)), bonus('b', 10, day(2026, 10, 4, 0))])
    expect(l.days[0].entries).toHaveLength(1) // 5 октября 23:30 местного
    expect(l.days[1].entries).toHaveLength(1) // 4 октября 00:30 местного
  })
  it('строки вне окна, с нулём, отрицательным и мусорным количеством монет не показываются', () => {
    const l = log([bonus('old', 20, day(2026, 9, 1)), bonus('zero', 0, day(2026, 10, 5)), bonus('neg', -5, day(2026, 10, 5)), bonus('nan', 'x', day(2026, 10, 5)), bonus('nul', null, day(2026, 10, 5))])
    expect(l.days.flatMap((d) => d.entries)).toEqual([])
  })
  it('монеты приходят из базы строкой (numeric) — читаются как число; дробные работают', () => {
    const l = log([bonus('k', '0.5', day(2026, 10, 5)), bonus('m', '20.0', day(2026, 10, 5))])
    expect(l.earnedToday).toBe(20.5)
  })
  it('без бонусов журнал такой же, как раньше (параметр необязателен)', () => {
    expect(buildPointsLog('2026-10-05', [], [], [], [], []).days.every((d) => d.entries.length === 0)).toBe(true)
  })
})
