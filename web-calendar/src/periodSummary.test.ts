import { describe, expect, it } from 'vitest'
import type { HistoryContext } from './lib/historyStats'
import type { Metric, MetricValue } from './lib/historyTypes'
import { addDaysIso } from './lib/date'
import { compareMetrics, COVERAGE_MIN, isTrackedDay, periodRange, periodTotals, shiftPeriod, summarizePeriod } from './lib/periodSummary'

const water: Metric = { id: 'W', name: 'Вода', icon: '💧', type: 'number', goal_value: 2000, unit: 'мл' }
const gym: Metric = { id: 'G', name: 'Жим', icon: '🏋️', type: 'sets' }
const read: Metric = { id: 'R', name: 'Чтение', icon: '📖', type: 'number' } // без цели
const weekly: Metric = { id: 'X', name: 'Бег 3/нед', icon: '🏃', type: 'boolean', schedule: { type: 'weekly', min: 3 } }

function mk(over: Partial<HistoryContext> & { byDate?: Record<string, Record<string, MetricValue>> }): HistoryContext {
  return {
    metrics: [water],
    byDate: {},
    notesByDate: {},
    goals: [],
    settings: { enabled: true, includePlanned: true, includeMetrics: true, dayPlace: 'avatar', weekPlace: 'profile' },
    firstDate: '2026-08-01',
    today: '2026-10-28',
    ...over,
  }
}

// заполняет дни [from..to] значением воды
function fill(from: string, to: string, v: (d: string) => number): Record<string, Record<string, MetricValue>> {
  const out: Record<string, Record<string, MetricValue>> = {}
  for (let d = from; d <= to; d = addDaysIso(d, 1)) out[d] = { W: v(d) }
  return out
}

describe('periodRange / shiftPeriod', () => {
  it('неделя пн–вс', () => {
    expect(periodRange('week', '2026-10-28')).toEqual({ kind: 'week', start: '2026-10-26', end: '2026-11-01' })
  })
  it('месяц и год, высокосный февраль', () => {
    expect(periodRange('month', '2026-10-15')).toEqual({ kind: 'month', start: '2026-10-01', end: '2026-10-31' })
    expect(periodRange('month', '2028-02-10').end).toBe('2028-02-29')
    expect(periodRange('year', '2026-10-15')).toEqual({ kind: 'year', start: '2026-01-01', end: '2026-12-31' })
  })
  it('сдвиг через границу года и месяца', () => {
    expect(shiftPeriod(periodRange('month', '2026-01-10'), -1).start).toBe('2025-12-01')
    expect(shiftPeriod(periodRange('month', '2026-12-10'), 1).start).toBe('2027-01-01')
    expect(shiftPeriod(periodRange('week', '2026-10-28'), -1).start).toBe('2026-10-19')
    expect(shiftPeriod(periodRange('year', '2026-05-05'), -1).start).toBe('2025-01-01')
  })
})

describe('isTrackedDay', () => {
  it('пустой день и пустые значения — не отслежены; план — отслежен', () => {
    const c = mk({ byDate: { '2026-10-01': { W: null }, '2026-10-02': { W: 100 } }, notesByDate: { '2026-10-03': { date: '2026-10-03', planned_goals: [{ type: 'custom', text: 'x', done: false }] } } })
    expect(isTrackedDay(c, '2026-10-01')).toBe(false)
    expect(isTrackedDay(c, '2026-10-02')).toBe(true)
    expect(isTrackedDay(c, '2026-10-03')).toBe(true)
    expect(isTrackedDay(c, '2026-10-04')).toBe(false)
  })
})

describe('periodTotals', () => {
  it('считает средний %, идеальные дни и покрытие текущего периода только с первой записи', () => {
    const c = mk({ firstDate: '2026-10-05', byDate: fill('2026-10-05', '2026-10-10', (d) => (d <= '2026-10-07' ? 2500 : 500)) })
    const t = periodTotals(c, periodRange('month', '2026-10-20'), false)
    expect(t.tracked).toBe(6)
    expect(t.perfectDays).toBe(3)
    expect(t.possible).toBe(24) // 5..28 октября, будущее и дни до первой записи не в счёте
    expect(t.coverage).toBeCloseTo(6 / 24)
  })
  it('прошлый период берём целиком: данные с середины месяца дают низкое покрытие', () => {
    const c = mk({ firstDate: '2026-09-20', byDate: fill('2026-09-20', '2026-09-30', () => 2000) })
    const t = periodTotals(c, periodRange('month', '2026-09-10'), true)
    expect(t.possible).toBe(30)
    expect(t.tracked).toBe(11)
  })
  it('тренировочные дни и выполненные цели из планов', () => {
    const c = mk({
      metrics: [water, gym],
      byDate: { '2026-10-06': { G: [{ reps: 10 }] }, '2026-10-07': { G: [{ reps: 0 }] }, '2026-10-08': { G: [{ reps: 8 }, { reps: 8 }] } },
      notesByDate: { '2026-10-06': { date: '2026-10-06', planned_goals: [{ type: 'goal', text: 'Марафон', done: false }] } },
      goals: [{ name: 'Марафон', done: true } as never],
    })
    const t = periodTotals(c, periodRange('month', '2026-10-10'), false)
    expect(t.workoutDays).toBe(2)
    expect(t.planGoalsDone).toBe(1)
  })
})

describe('summarizePeriod — состояния и правило покрытия', () => {
  it('нет данных → empty; 2 дня → few', () => {
    expect(summarizePeriod(mk({ firstDate: null }), periodRange('month', '2026-10-10')).state).toBe('empty')
    const few = mk({ byDate: fill('2026-10-01', '2026-10-02', () => 2000) })
    expect(summarizePeriod(few, periodRange('month', '2026-10-10')).state).toBe('few')
  })
  it('в прошлом периоде нет записей → no_prev', () => {
    const c = mk({ byDate: fill('2026-10-01', '2026-10-20', () => 2000) })
    const s = summarizePeriod(c, periodRange('month', '2026-10-10'))
    expect(s.state).toBe('ok')
    expect(s.compare).toBe(false)
    expect(s.compareBlock).toBe('no_prev')
  })
  it('покрытие ниже порога → coverage, на пороге сравниваем', () => {
    // сентябрь: 17 из 30 дней (57% < 60%) → нельзя
    const low = mk({ byDate: { ...fill('2026-09-01', '2026-09-17', () => 2000), ...fill('2026-10-01', '2026-10-28', () => 2000) } })
    expect(summarizePeriod(low, periodRange('month', '2026-10-10')).compareBlock).toBe('coverage')
    // 18 из 30 = ровно 60% → можно
    const ok = mk({ byDate: { ...fill('2026-09-01', '2026-09-18', () => 2000), ...fill('2026-10-01', '2026-10-28', () => 2000) } })
    expect(COVERAGE_MIN).toBe(0.6)
    expect(summarizePeriod(ok, periodRange('month', '2026-10-10')).compare).toBe(true)
  })
})

describe('compareMetrics', () => {
  const sep = periodRange('month', '2026-09-10')
  const oct = periodRange('month', '2026-10-10')
  it('доля дней с целью: лучше / хуже / без изменений, пороги', () => {
    const better = mk({ byDate: { ...fill('2026-09-01', '2026-09-30', (d) => (d <= '2026-09-15' ? 2500 : 500)), ...fill('2026-10-01', '2026-10-28', () => 2500) } })
    const r = compareMetrics(better, oct, sep)
    expect(r.better).toHaveLength(1)
    expect(r.better[0]).toMatchObject({ id: 'W', direction: 'up', tone: 'good', kind: 'share' })
    expect(r.better[0].delta).toBeCloseTo(0.5, 1)
    const worse = mk({ byDate: { ...fill('2026-09-01', '2026-09-30', () => 2500), ...fill('2026-10-01', '2026-10-28', (d) => (d <= '2026-10-10' ? 2500 : 500)) } })
    expect(compareMetrics(worse, oct, sep).worse[0]).toMatchObject({ direction: 'down', tone: 'bad' })
    const same = mk({ byDate: { ...fill('2026-09-01', '2026-09-30', () => 2500), ...fill('2026-10-01', '2026-10-28', () => 2500) } })
    const rs = compareMetrics(same, oct, sep)
    expect(rs.same).toHaveLength(1)
    expect(rs.better.length + rs.worse.length).toBe(0)
  })
  it('метрика без цели — нейтральная стрелка, не «лучше/хуже»', () => {
    const fillR = (a: string, b: string, v: number) => {
      const o: Record<string, Record<string, MetricValue>> = {}
      for (let d = a; d <= b; d = addDaysIso(d, 1)) o[d] = { R: v }
      return o
    }
    const c = mk({ metrics: [read], byDate: { ...fillR('2026-09-01', '2026-09-30', 20), ...fillR('2026-10-01', '2026-10-28', 30) } })
    const r = compareMetrics(c, oct, sep)
    expect(r.better).toHaveLength(0)
    expect(r.neutral[0]).toMatchObject({ id: 'R', tone: 'neutral', direction: 'up', kind: 'avg' })
    expect(r.neutral[0].delta).toBeCloseTo(0.5)
  })
  it('мало дней у метрики → «мало данных»; недельные метрики не сравниваются', () => {
    const c = mk({ metrics: [water, weekly], byDate: { ...fill('2026-09-01', '2026-09-30', () => 2500), '2026-10-01': { W: 2500 }, '2026-10-02': { W: 2500 } } })
    const r = compareMetrics(c, oct, sep)
    expect(r.insufficient.map((x) => x.id)).toEqual(['W'])
  })
  it('пропущенный день не считается невыполненным', () => {
    const skipped: Metric = { ...water, skipped_days: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'] }
    const vals = fill('2026-10-01', '2026-10-28', (d) => (d >= '2026-10-05' && d <= '2026-10-08' ? 0 : 2500))
    const c = mk({ metrics: [skipped], byDate: { ...fill('2026-09-01', '2026-09-30', () => 2500), ...vals } })
    const r = compareMetrics(c, oct, sep)
    expect(r.worse).toHaveLength(0)
    expect(r.same).toHaveLength(1)
  })
})
