import { afterEach, describe, expect, it } from 'vitest'
import { daysUntil } from './goals'

// Node подхватывает смену TZ на лету; глобал `process` типизирован не везде, поэтому берём env через globalThis.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env

const originalTz = env.TZ
afterEach(() => {
  if (originalTz === undefined) delete env.TZ
  else env.TZ = originalTz
})

// BACKLOG 7.3: «дней до срока» — целое число календарных дней в любом поясе, в том числе за сутки перехода DST.
describe.each(['Europe/Moscow', 'Europe/Vilnius', 'America/New_York', 'Pacific/Auckland'])('daysUntil in %s', (tz) => {
  it('counts whole calendar days over DST switches, at any time of day', () => {
    env.TZ = tz
    for (const [today, target, expected] of [
      [new Date(2026, 9, 24, 0, 5), '2026-10-27', 3],
      [new Date(2026, 9, 24, 23, 55), '2026-10-27', 3],
      [new Date(2026, 2, 7, 12, 0), '2026-03-10', 3],
      [new Date(2026, 10, 1, 12, 0), '2026-11-01', 0],
      [new Date(2026, 9, 25, 12, 0), '2026-10-24', -1],
    ] as [Date, string, number][]) {
      expect(daysUntil(target, today)).toBe(expected)
    }
  })
})
