import { describe, expect, it } from 'vitest'
import { graceStreak } from './challenges'

type D = { done: boolean; isFuture: boolean; isToday: boolean }
// d — выполнен, x — пропущен, T — сегодня (ещё не выполнен), D — сегодня выполнен, f — будущий
const days = (s: string): D[] => [...s].map((c) => ({ done: c === 'd' || c === 'D', isFuture: c === 'f', isToday: c === 'T' || c === 'D' }))

describe('graceStreak (76.12)', () => {
  it('без пропусков — как обычная серия, страховка не тратится', () => {
    expect(graceStreak(days('dddDfff'))).toEqual({ streak: 4, forgiven: false })
  })
  it('один пропуск внутри серии прощается и в счёт не идёт', () => {
    expect(graceStreak(days('ddxdDfff'))).toEqual({ streak: 4, forgiven: true })
    expect(graceStreak(days('dxTfff'))).toEqual({ streak: 1, forgiven: true }) // вчера пропуск, сегодня ещё не отмечено
  })
  it('второй пропуск (глубже) серию обрывает', () => {
    expect(graceStreak(days('dxddxdDfff'))).toEqual({ streak: 4, forgiven: true })
  })
  it('два пропуска подряд не прощаются; пропуск в самом начале — тоже', () => {
    expect(graceStreak(days('ddxxdDfff'))).toEqual({ streak: 2, forgiven: false })
    expect(graceStreak(days('xddDfff'))).toEqual({ streak: 3, forgiven: false })
  })
  it('пустой список и «сегодня ещё не отмечено» без истории — ноль', () => {
    expect(graceStreak([])).toEqual({ streak: 0, forgiven: false })
    expect(graceStreak(days('Tfff'))).toEqual({ streak: 0, forgiven: false })
  })
})
