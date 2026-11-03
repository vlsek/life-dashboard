import { describe, expect, it } from 'vitest'
import { bestSet, countSets, entryRecord, journalDays, journalMonths, monthGrid, dayMinutes, todayItems } from './journal'
import type { Exercise, WorkoutEntry } from './types'

const ex = (id: string): Exercise => ({ id, name: id, category: 'upper', tracks_weight: true } as unknown as Exercise)
const en = (id: string, exercise_id: string, date: string, times: (string | null)[]): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id, date, notes: null, sets: times.map((time) => ({ reps: 5, weight: 10, time })) }) as unknown as WorkoutEntry

const exs = [ex('a'), ex('b')]

describe('journal', () => {
  it('сегодня: только записи дня, по времени первого подхода, удалённые упражнения пропущены', () => {
    const entries = [en('1', 'b', '2026-10-15', ['10:00']), en('2', 'a', '2026-10-15', ['09:00']), en('3', 'a', '2026-10-14', ['08:00']), en('4', 'gone', '2026-10-15', ['07:00'])]
    const items = todayItems(entries, exs, '2026-10-15')
    expect(items.map((i) => i.entry.id)).toEqual(['2', '1'])
  })
  it('подсчёт подходов', () => {
    const items = todayItems([en('1', 'a', 'd', ['1', '2', '3']), en('2', 'b', 'd', [null, null])], exs, 'd')
    expect(countSets(items)).toBe(5)
  })
  it('журнал: дни свежие сверху, лимит, пустые дни не попадают', () => {
    const entries = [en('1', 'a', '2026-10-10', ['1']), en('2', 'a', '2026-10-12', ['1', '2']), en('3', 'gone', '2026-10-14', ['1']), en('4', 'b', '2026-10-11', ['1'])]
    const days = journalDays(entries, exs)
    expect(days.map((d) => d.date)).toEqual(['2026-10-12', '2026-10-11', '2026-10-10'])
    expect(days[0].setCount).toBe(2)
    expect(journalDays(entries, exs, 2)).toHaveLength(2)
  })
})

const withSets = (id: string, exercise_id: string, date: string, sets: Record<string, unknown>[]): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id, date, notes: null, sets: sets.map((s) => ({ reps: null, weight: null, time: null, duration: null, side: null, ...s })) }) as unknown as WorkoutEntry

describe('лента истории: лучший подход и рекорд (69.11 срез 1)', () => {
  it('лучший подход — по оценке 1ПМ, разминка и невыполненные не считаются', () => {
    const b = bestSet([{ reps: 10, weight: 40 }, { reps: 5, weight: 60 }, { reps: 20, weight: 100, type: 'warmup' }, { reps: 1, weight: 200, done: false }] as never)
    expect(b).toMatchObject({ reps: 5, weight: 60 })
    expect(bestSet([{ reps: 12, weight: null }, { reps: 15, weight: null }] as never)).toMatchObject({ reps: 15 })
    expect(bestSet([{ duration: 30 }, { duration: 45 }] as never)).toMatchObject({ duration: 45 })
    expect(bestSet([])).toBeNull()
  })
  it('рекорд — против записей ДО этого дня; первая запись упражнения рекордом не считается', () => {
    const first = withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }])
    const second = withSets('2', 'a', '2026-10-08', [{ reps: 5, weight: 55 }])
    const third = withSets('3', 'a', '2026-10-15', [{ reps: 5, weight: 55 }])
    const all = [first, second, third]
    expect(entryRecord(first, all)).toBeNull()
    expect(entryRecord(second, all)).toBe('weight')
    expect(entryRecord(third, all)).toBeNull()
  })
  it('рекорд не берётся от более поздних записей и от других упражнений', () => {
    const early = withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }])
    const late = withSets('2', 'a', '2026-10-20', [{ reps: 5, weight: 100 }])
    const other = withSets('3', 'b', '2026-09-01', [{ reps: 5, weight: 500 }])
    expect(entryRecord(early, [early, late, other])).toBeNull()
    expect(entryRecord(late, [early, late, other])).toBe('weight')
  })
  it('journalDays проставляет best и record в элементы', () => {
    const e1 = withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }])
    const e2 = withSets('2', 'a', '2026-10-08', [{ reps: 6, weight: 50 }, { reps: 5, weight: 60 }])
    const days = journalDays([e1, e2], exs)
    expect(days[0].items[0].best).toMatchObject({ reps: 5, weight: 60 })
    expect(days[0].items[0].record).toBe('weight')
    expect(days[1].items[0].record).toBeNull()
  })
})

describe('лента истории: объём дня и фильтр по месяцу (69.11 срез 2)', () => {
  const e1 = withSets('1', 'a', '2026-09-30', [{ reps: 5, weight: 50 }])
  const e2 = withSets('2', 'a', '2026-10-08', [{ reps: 5, weight: 60 }, { reps: 10, weight: 20 }, { reps: 10, weight: 100, type: 'warmup' }, { reps: 3, weight: 200, done: false }])
  it('объём дня — только рабочие подходы', () => {
    const days = journalDays([e1, e2], exs)
    expect(days[0].volume).toBe(5 * 60 + 10 * 20)
    expect(days[1].volume).toBe(250)
  })
  it('месяцы свежие сверху; фильтр оставляет дни месяца, лимит считается после фильтра', () => {
    expect(journalMonths([e1, e2])).toEqual(['2026-10', '2026-09'])
    expect(journalDays([e1, e2], exs, 30, '2026-09').map((d) => d.date)).toEqual(['2026-09-30'])
    expect(journalDays([e1, e2], exs, 30, null)).toHaveLength(2)
  })
})

describe('лента истории: поиск (69.11 срез 3)', () => {
  const exn = (id: string, name: string): Exercise => ({ id, name, category: 'upper', tracks_weight: true } as unknown as Exercise)
  const list = [exn('a', 'Жим лёжа'), exn('b', 'Присед')]
  const entries = [withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }]), withSets('2', 'b', '2026-10-01', [{ reps: 5, weight: 80 }]), withSets('3', 'b', '2026-10-02', [{ reps: 5, weight: 85 }])]
  it('оставляет подходящие упражнения, регистр и пробелы по краям не важны, пересчитывает подходы', () => {
    const d = journalDays(entries, list, 30, null, '  ЖИМ ')
    expect(d).toHaveLength(1)
    expect(d[0].items.map((i) => i.exercise.id)).toEqual(['a'])
    expect(d[0].setCount).toBe(1)
  })
  it('дни без совпадений пропускаются, пустой запрос — всё', () => {
    expect(journalDays(entries, list, 30, null, 'присед').map((x) => x.date)).toEqual(['2026-10-02', '2026-10-01'])
    expect(journalDays(entries, list, 30, null, '')).toHaveLength(2)
    expect(journalDays(entries, list, 30, null, 'нет такого')).toHaveLength(0)
  })
})

describe('лента истории: календарь месяца (69.11 срез 4)', () => {
  it('сетка: недели с понедельника, пустые клетки по краям, активные дни помечены', () => {
    const g = monthGrid('2026-11', new Set(['2026-11-03', '2026-11-30']))
    expect(g.every((w) => w.length === 7)).toBe(true)
    expect(g[0].filter((c) => c.date === null)).toHaveLength(6) // 1 ноября 2026 — воскресенье
    expect(g[0][6]).toMatchObject({ date: '2026-11-01', day: 1, active: false })
    const flat = g.flat().filter((c) => c.date)
    expect(flat).toHaveLength(30)
    expect(flat.filter((c) => c.active).map((c) => c.date)).toEqual(['2026-11-03', '2026-11-30'])
  })
  it('февраль високосного года и месяц, начинающийся с понедельника', () => {
    expect(monthGrid('2028-02', new Set()).flat().filter((c) => c.date)).toHaveLength(29)
    expect(monthGrid('2026-06', new Set())[0][0]).toMatchObject({ date: '2026-06-01' }) // понедельник
  })
  it('фильтр по одному дню', () => {
    const e1 = withSets('1', 'a', '2026-10-01', [{ reps: 5, weight: 50 }])
    const e2 = withSets('2', 'a', '2026-10-08', [{ reps: 5, weight: 55 }])
    expect(journalDays([e1, e2], exs, 30, null, '', '2026-10-08').map((d) => d.date)).toEqual(['2026-10-08'])
    expect(journalDays([e1, e2], exs, 30, null, '', null)).toHaveLength(2)
  })
})

describe('лента истории: длительность дня (69.11 срез 5)', () => {
  const sess = (id: string, date: string, start: string, end: string | null) => ({ id, user_id: 'u', name: null, date, started_at: start, finished_at: end, routine_id: null, notes: null, source: 'live' as const })
  it('сумма завершённых сессий даты в минутах; идущая, чужая дата и обратный порядок времени не считаются', () => {
    const list = [
      sess('1', '2026-10-08', '2026-10-08T10:00:00Z', '2026-10-08T10:52:00Z'),
      sess('2', '2026-10-08', '2026-10-08T18:00:00Z', '2026-10-08T18:08:00Z'),
      sess('3', '2026-10-08', '2026-10-08T20:00:00Z', null),
      sess('4', '2026-10-09', '2026-10-09T10:00:00Z', '2026-10-09T11:00:00Z'),
      sess('5', '2026-10-08', '2026-10-08T22:00:00Z', '2026-10-08T21:00:00Z'),
    ]
    expect(dayMinutes(list, '2026-10-08')).toBe(60)
    expect(dayMinutes(list, '2026-10-09')).toBe(60)
    expect(dayMinutes(list, '2026-10-10')).toBe(0)
    expect(dayMinutes([], '2026-10-08')).toBe(0)
  })
})
