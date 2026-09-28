import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { computeStreakItemsPure } from './streaks'
import { prepareChartSeries } from './chart'
import { addDays } from './date'

// Дни перехода на летнее/зимнее время — не 24 часа. Раньше «вчера» и «N дней назад» считались
// вычитанием/прибавлением 86400000 мс и в такие сутки давали соседнюю дату. Часовой пояс
// пользователя (Вильнюс, EET/EEST): в 2026 часы переводят 29 марта (весной) и 25 октября (осенью).
// process нет в типах браузерного tsconfig — берём через globalThis
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

const metric: any = { id: 'a', name: 'A', icon: null, type: 'boolean', schedule: null }
const done = (...days: string[]) => Object.fromEntries(days.map((d) => [d, { a: true }]))

describe('addDays — календарная арифметика', () => {
  it('переходит через сутки перехода времени ровно на календарный день', () => {
    // 29 марта 2026 — 23-часовые сутки; 25 октября 2026 — 25-часовые
    expect(addDays(new Date(2026, 2, 30, 0, 30), -1).getDate()).toBe(29)
    expect(addDays(new Date(2026, 9, 26, 0, 30), -1).getDate()).toBe(25)
    expect(addDays(new Date(2026, 9, 1), 25).getMonth()).toBe(9)
    expect(addDays(new Date(2026, 9, 1), 25).getDate()).toBe(26)
  })
})

describe('стрик считается со вчера в ночь после перехода времени', () => {
  it('весна: 30 марта 00:30, сегодня ещё не заполнено, вчера/позавчера/до того выполнены → 3', () => {
    const items = computeStreakItemsPure([metric], done('2026-03-29', '2026-03-28', '2026-03-27'), new Set(), new Date(2026, 2, 30, 0, 30))
    expect(items.find((i) => i.kind === 'metric')!.streak).toBe(3)
  })
  it('осень: 26 октября 00:30 → 3', () => {
    const items = computeStreakItemsPure([metric], done('2026-10-25', '2026-10-24', '2026-10-23'), new Set(), new Date(2026, 9, 26, 0, 30))
    expect(items.find((i) => i.kind === 'metric')!.streak).toBe(3)
  })
  it('импортированный стрик: сдвиг даты начала серии тоже не ломается на переходе времени', () => {
    // выполнено 27–29 марта (3 дня), сегодня 30-е 00:30 не заполнено; импорт зафиксирован 27 марта
    const m = { ...metric, streak_import_days: 10, streak_import_date: '2026-03-27' }
    const items = computeStreakItemsPure([m], done('2026-03-29', '2026-03-28', '2026-03-27'), new Set(), new Date(2026, 2, 30, 0, 30))
    expect(items.find((i) => i.kind === 'metric')!.streak).toBe(13) // 3 посчитанных + 10 импортированных
  })
})

describe('prepareChartSeries: ось дат без дублей и пропусков через сутки перехода времени', () => {
  const dates = (from: string, to: string) => prepareChartSeries([{ date: from, y: 1 }, { date: to, y: 2 }], 100).map((p) => p.date)
  it('осень 2026 (25 октября): 20–30 октября → 11 подряд идущих дат', () => {
    const d = dates('2026-10-20', '2026-10-30')
    expect(d).toHaveLength(11)
    expect(new Set(d).size).toBe(11)
    expect(d[5]).toBe('2026-10-25')
    expect(d[6]).toBe('2026-10-26')
  })
  it('длинный диапазон через осень: 1 октября → 31 октября, ровно 31 день без дублей', () => {
    const d = dates('2026-10-01', '2026-10-31')
    expect(d).toHaveLength(31)
    expect(new Set(d).size).toBe(31)
    expect(d[30]).toBe('2026-10-31')
  })
  it('весна 2026 (29 марта): 25 марта → 2 апреля, 9 дат подряд', () => {
    const d = dates('2026-03-25', '2026-04-02')
    expect(d).toHaveLength(9)
    expect(new Set(d).size).toBe(9)
    expect(d[4]).toBe('2026-03-29')
  })
})
