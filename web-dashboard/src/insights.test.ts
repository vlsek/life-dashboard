import { describe, expect, it } from 'vitest'
import { moodInsight } from './lib/insights'

const day = (i: number) => '2026-10-' + String((i % 28) + 1).padStart(2, '0') + (i >= 28 ? 'b' : '')
function build(n: number, moodFor: (done: boolean) => number, doneEvery = 2) {
  const mood: Record<string, number> = {}
  const done = new Set<string>()
  for (let i = 0; i < n; i++) {
    const d = day(i)
    const isDone = i % doneEvery === 0
    mood[d] = moodFor(isDone)
    if (isDone) done.add(d)
  }
  return { mood, done }
}

describe('moodInsight', () => {
  it('достаточно данных и заметная разница → инсайт', () => {
    const { mood, done } = build(40, (d) => (d ? 4 : 3))
    expect(moodInsight(mood, done)).toEqual({ withAvg: 4, withoutAvg: 3, nWith: 20, nWithout: 20, diff: 1 })
  })
  it('меньше 30 дней оценок → null', () => {
    const { mood, done } = build(29, (d) => (d ? 5 : 1))
    expect(moodInsight(mood, done)).toBeNull()
  })
  it('в одной из групп меньше 7 дней → null', () => {
    const { mood, done } = build(40, (d) => (d ? 5 : 1), 10) // условие выполнено 4 дня из 40
    expect(moodInsight(mood, done)).toBeNull()
  })
  it('разница меньше 0.5 → null; в минус тоже считается', () => {
    const a = build(40, (d) => (d ? 3.2 : 3))
    expect(moodInsight(a.mood, a.done)).toBeNull()
    const b = build(40, (d) => (d ? 2 : 4))
    expect(moodInsight(b.mood, b.done)?.diff).toBe(-2)
  })
})
