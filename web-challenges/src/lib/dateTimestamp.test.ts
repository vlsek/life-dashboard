import { afterEach, describe, expect, it } from 'vitest'
import { localDateOfTimestamp } from './date'
import { daysBetween } from './challenges'

// Node подхватывает смену TZ на лету; глобал `process` типизирован не везде, поэтому берём env через globalThis.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env

const originalTz = env.TZ
afterEach(() => {
  if (originalTz === undefined) delete env.TZ
  else env.TZ = originalTz
})

describe('localDateOfTimestamp (completed_at is UTC in the DB)', () => {
  it('Moscow: 22:30 UTC on the 14th is already the 15th locally', () => {
    env.TZ = 'Europe/Moscow'
    expect(localDateOfTimestamp('2026-06-14T22:30:00.000Z')).toBe('2026-06-15')
    expect('2026-06-14T22:30:00.000Z'.slice(0, 10)).toBe('2026-06-14') // старое поведение
  })
  it('New York: 02:30 UTC on the 15th is still the 14th locally', () => {
    env.TZ = 'America/New_York'
    expect(localDateOfTimestamp('2026-06-15T02:30:00.000Z')).toBe('2026-06-14')
  })
  it('Vilnius (DST): 21:30 UTC on 2026-10-24 (before the switch) is 00:30 on the 25th locally', () => {
    env.TZ = 'Europe/Vilnius'
    expect(localDateOfTimestamp('2026-10-24T21:30:00.000Z')).toBe('2026-10-25')
  })
})

describe('daysBetween across DST in every zone', () => {
  it.each(['Europe/Moscow', 'Europe/Vilnius', 'America/New_York', 'Pacific/Auckland'])('%s', (tz) => {
    env.TZ = tz
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2)
  })
})
