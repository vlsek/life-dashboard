import { describe, expect, it } from 'vitest'
import { currentStreak } from './challenges'

type D = { done: boolean; isFuture: boolean; isToday: boolean }
// строка: d — выполнен, x — пропущен, T — сегодня (ещё не выполнен), D — сегодня выполнен, f — будущий
const days = (s: string): D[] => [...s].map((c) => ({ done: c === 'd' || c === 'D', isFuture: c === 'f', isToday: c === 'T' || c === 'D' }))

describe('currentStreak', () => {
  it('считает выполненные дни подряд, сегодняшний выполненный входит в серию', () => {
    expect(currentStreak(days('dddDfff'))).toBe(4)
    expect(currentStreak(days('xddDfff'))).toBe(3)
  })
  it('невыполненный сегодня день серию не рвёт — считаем от вчера', () => {
    expect(currentStreak(days('ddTfff'))).toBe(2)
    expect(currentStreak(days('xdTfff'))).toBe(1)
  })
  it('пропуск вчера обнуляет серию', () => {
    expect(currentStreak(days('dxTfff'))).toBe(0)
    expect(currentStreak(days('Tfff'))).toBe(0)
  })
  it('челлендж закончился (сегодня нет в списке): считаем от последнего дня', () => {
    expect(currentStreak(days('xddd'))).toBe(3)
    expect(currentStreak(days('dddx'))).toBe(0)
  })
  it('пустой список', () => {
    expect(currentStreak([])).toBe(0)
  })
})
