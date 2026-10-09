import { beforeEach, describe, expect, it } from 'vitest'
import { SKIP_OFF_KEY, doneDaysOf, shouldShowSkipPrompt, skipPromptEnabled, skipSupported, skippableYesterday, withSkippedDay } from './skipYesterday'
import { addDays, fmtDate } from './date'
import type { Metric } from './types'

// Окно «вчерашние невыполненные» (BACKLOG 47.3): кто попадает в список, «может прервать серию», раз в день, поддержка миграции 061.
const today = new Date(2026, 9, 8)
const yesterday = addDays(today, -1)
const d = (offset: number) => fmtDate(addDays(today, offset))
const metric = (id: string, over: Partial<Metric> = {}): Metric =>
  ({ id, user_id: 'u', name: id, icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...over }) as Metric
const done = (...days: number[]) => new Set(days.map(d))

describe('skippableYesterday', () => {
  it('в список попадают метрики, не выполненные вчера; выполненные — нет', () => {
    const ms = [metric('a'), metric('b')]
    const res = skippableYesterday(ms, { b: true }, { a: done(), b: done(-1) }, yesterday)
    expect(res.map((r) => r.metric.id)).toEqual(['a'])
  })

  it('«может прервать серию»: серия шла до вчера (позавчера выполнено) — такие первыми, с числом дней', () => {
    const ms = [metric('plain'), metric('risky')]
    const res = skippableYesterday(ms, {}, { plain: done(-5), risky: done(-2, -3, -4) }, yesterday)
    expect(res.map((r) => r.metric.id)).toEqual(['risky', 'plain'])
    expect(res[0]).toMatchObject({ breaksStreak: true, streakBefore: 3 })
    expect(res[1]).toMatchObject({ breaksStreak: false, streakBefore: 0 })
  })

  it('метрики «N раз в неделю», «не чаще N», с выключенной серией и уже пропущенный вчерашний день — не предлагаются', () => {
    const ms = [
      metric('weekly', { schedule: { type: 'weekly', min: 3 } as never }),
      metric('atmost', { schedule: { type: 'at_most', max: 2 } as never }),
      metric('nostreak', { count_streak: false } as never),
      metric('skipped', { skipped_days: [d(-1)] }),
      metric('ok'),
    ]
    const res = skippableYesterday(ms, {}, {}, yesterday)
    expect(res.map((r) => r.metric.id)).toEqual(['ok'])
  })

  it('метрика по дням недели, не нужная вчера, не предлагается', () => {
    const wd = (date: string) => new Date(date + 'T00:00:00').getDay()
    const notYesterday = (wd(d(-1)) + 1) % 7
    const res = skippableYesterday([metric('a', { schedule: { type: 'days', days: [notYesterday] } as never })], {}, {}, yesterday)
    expect(res).toEqual([])
  })

  it('серия «со скипами»: пропущенный позавчера день не рвёт «серию до вчера»', () => {
    const m = metric('a', { skipped_days: [d(-2)] })
    const res = skippableYesterday([m], {}, { a: done(-3, -4) }, yesterday)
    expect(res[0]).toMatchObject({ breaksStreak: true, streakBefore: 2 })
  })
})

describe('shouldShowSkipPrompt', () => {
  it('включено, есть что показать, сегодня ещё не показывали', () => {
    expect(shouldShowSkipPrompt(true, 2, null, '2026-10-08')).toBe(true)
    expect(shouldShowSkipPrompt(true, 2, '2026-10-07', '2026-10-08')).toBe(true)
  })
  it('уже показывали сегодня / выключено / пусто — нет', () => {
    expect(shouldShowSkipPrompt(true, 2, '2026-10-08', '2026-10-08')).toBe(false)
    expect(shouldShowSkipPrompt(false, 2, null, '2026-10-08')).toBe(false)
    expect(shouldShowSkipPrompt(true, 0, null, '2026-10-08')).toBe(false)
  })
})

describe('skipPromptEnabled (выключатель в «Глобальных настройках»)', () => {
  beforeEach(() => localStorage.clear())
  it('по умолчанию включено; «1» выключает', () => {
    expect(skipPromptEnabled()).toBe(true)
    localStorage.setItem(SKIP_OFF_KEY, '1')
    expect(skipPromptEnabled()).toBe(false)
    localStorage.setItem(SKIP_OFF_KEY, '0')
    expect(skipPromptEnabled()).toBe(true)
  })
})

describe('withSkippedDay / skipSupported / doneDaysOf', () => {
  it('дата добавляется без повторов, по возрастанию, старые не вычищаются', () => {
    expect(withSkippedDay({ skipped_days: ['2026-10-01', '2026-10-07'] }, '2026-10-07')).toEqual(['2026-10-01', '2026-10-07'])
    expect(withSkippedDay({ skipped_days: ['2026-10-07'] }, '2026-10-06')).toEqual(['2026-10-06', '2026-10-07'])
    expect(withSkippedDay({ skipped_days: null }, '2026-10-07')).toEqual(['2026-10-07'])
    expect(withSkippedDay({}, '2026-10-07')).toEqual(['2026-10-07'])
  })
  it('миграция применена, если колонка пришла вместе с метрикой', () => {
    expect(skipSupported([{ id: 'a', skipped_days: [] }])).toBe(true)
    expect(skipSupported([{ id: 'a' }])).toBe(false)
    expect(skipSupported([])).toBe(false)
  })
  it('выполненные даты по строкам значений', () => {
    const m = metric('a')
    expect([...doneDaysOf(m, [{ date: '2026-10-07', value: true }, { date: '2026-10-06', value: false }])]).toEqual(['2026-10-07'])
  })
})
