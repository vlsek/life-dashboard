import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { prepareChartSeries } from './chart'

// Копия проверки из web-dashboard: ось дат через сутки перехода на зимнее время
// (Вильнюс, 25 октября 2026 — 25-часовые сутки) без дублей и пропусков.
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env
let prevTz: string | undefined
beforeAll(() => {
  prevTz = env.TZ
  env.TZ = 'Europe/Vilnius'
})
afterAll(() => {
  if (prevTz === undefined) delete env.TZ
  else env.TZ = prevTz
})

describe('prepareChartSeries через переход времени', () => {
  it('20–30 октября 2026 → 11 подряд идущих дат без дублей', () => {
    const d = prepareChartSeries([{ date: '2026-10-20', y: 1 }, { date: '2026-10-30', y: 2 }], 100).map((p) => p.date)
    expect(d).toHaveLength(11)
    expect(new Set(d).size).toBe(11)
    expect(d[5]).toBe('2026-10-25')
    expect(d[6]).toBe('2026-10-26')
  })
})
