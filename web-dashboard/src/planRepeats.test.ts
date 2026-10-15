import { describe, expect, it } from 'vitest'
import { buildRepeatSchedule, normalizeRepeatSchedule, repeatKindOf, repeatsDueOn, repeatSummary, toPlanRepeat, weekDoneCount, type PlanRepeat } from './lib/planRepeats'
import { addCustom, type PlannedEntry } from './lib/planned'

// BACKLOG 1054: повторяющиеся пункты плана — «каждый день», «по дням недели», «N раз в неделю».
// 2026-10-12 — понедельник; 2026-10-14 — среда; 2026-10-18 — воскресенье.
const R = (id: string, schedule: PlanRepeat['schedule']): PlanRepeat => ({ id, text: 'Зарядка ' + id, time: null, schedule })
const done = (repeat: string): PlannedEntry => ({ type: 'custom', text: 'x', done: true, repeat })

describe('расписание', () => {
  it('normalize: мусор — каждый день; дни чистятся и сортируются; все 7 дней = каждый день; N ограничено 1–7', () => {
    expect(normalizeRepeatSchedule(null)).toBeNull()
    expect(normalizeRepeatSchedule('x')).toBeNull()
    expect(normalizeRepeatSchedule({ type: 'days', days: [5, 1, 1, 9, -1] })).toEqual({ type: 'days', days: [1, 5] })
    expect(normalizeRepeatSchedule({ type: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBeNull()
    expect(normalizeRepeatSchedule({ type: 'days', days: [] })).toBeNull()
    expect(normalizeRepeatSchedule({ type: 'weekly', min: 12 })).toEqual({ type: 'weekly', min: 7 })
    expect(normalizeRepeatSchedule({ type: 'weekly', min: 0 })).toBeNull()
  })
  it('build: по форме; at_most из метрик не поддерживается', () => {
    expect(buildRepeatSchedule('daily', [1], 3)).toBeNull()
    expect(buildRepeatSchedule('days', [3, 1], 3)).toEqual({ type: 'days', days: [1, 3] })
    expect(buildRepeatSchedule('weekly', [], 3)).toEqual({ type: 'weekly', min: 3 })
    expect(buildRepeatSchedule('weekly', [], 0)).toEqual({ type: 'weekly', min: 1 })
    expect(repeatKindOf({ type: 'weekly', min: 2 })).toBe('weekly')
    expect(normalizeRepeatSchedule({ type: 'at_most', max: 2 })).toBeNull()
  })
  it('подпись: каждый день / дни с понедельника / N раз в неделю', () => {
    const names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    const per = (n: number) => `${n} р/нед`
    expect(repeatSummary(null, names, 'каждый день', per)).toBe('каждый день')
    expect(repeatSummary({ type: 'days', days: [0, 5, 1] }, names, 'e', per)).toBe('Пн Пт Вс')
    expect(repeatSummary({ type: 'weekly', min: 3 }, names, 'e', per)).toBe('3 р/нед')
  })
  it('toPlanRepeat: строка из базы с мусорным расписанием не роняет', () => {
    expect(toPlanRepeat({ id: 'a', text: 'T', schedule: { type: 'zzz' } })).toEqual({ id: 'a', text: 'T', time: null, schedule: null })
  })
})

describe('repeatsDueOn', () => {
  it('каждый день — всегда; по дням — только в свои дни', () => {
    const rs = [R('d', null), R('w', { type: 'days', days: [1, 3] })]
    expect(repeatsDueOn(rs, '2026-10-12', [], []).map((r) => r.id)).toEqual(['d', 'w']) // пн
    expect(repeatsDueOn(rs, '2026-10-13', [], []).map((r) => r.id)).toEqual(['d']) // вт
    expect(repeatsDueOn(rs, '2026-10-14', [], []).map((r) => r.id)).toEqual(['d', 'w']) // ср
  })
  it('пункт, уже стоящий в плане дня (по repeat), второй раз не предлагается', () => {
    expect(repeatsDueOn([R('d', null)], '2026-10-12', [done('d')], [])).toEqual([])
  })
  it('N раз в неделю: предлагается, пока за неделю (пн–вс) отмечено меньше N; прошлая неделя не считается', () => {
    const r = R('k', { type: 'weekly', min: 2 })
    const notes = [
      { date: '2026-10-12', entries: [done('k')] }, // пн этой недели
      { date: '2026-10-11', entries: [done('k'), done('k')] }, // вс ПРОШЛОЙ недели — не в счёт
    ]
    expect(weekDoneCount('k', '2026-10-14', [], notes)).toBe(1)
    expect(repeatsDueOn([r], '2026-10-14', [], notes)).toHaveLength(1) // 1 из 2 — ещё нужно
    const notes2 = [...notes, { date: '2026-10-13', entries: [done('k')] }]
    expect(repeatsDueOn([r], '2026-10-14', [], notes2)).toEqual([]) // 2 из 2 — достаточно
    expect(weekDoneCount('k', '2026-10-18', [], notes2)).toBe(2) // воскресенье той же недели
  })
  it('отметка в плане самого дня считается один раз, а не дважды (заметка этого дня из базы игнорируется)', () => {
    const notes = [{ date: '2026-10-14', entries: [done('k')] }]
    expect(weekDoneCount('k', '2026-10-14', [done('k')], notes)).toBe(1)
  })
})

describe('addCustom с repeat', () => {
  it('пункт получает repeat; без него поля нет', () => {
    expect(addCustom([], 'Зарядка', null, true, 'r1')[0]).toMatchObject({ type: 'custom', done: true, repeat: 'r1' })
    expect(addCustom([], 'Зарядка')[0]).not.toHaveProperty('repeat')
  })
})
