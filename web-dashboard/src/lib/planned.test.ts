import { describe, expect, it } from 'vitest'
import {
  addCustom, addGoal, appendCarried, carryOverCandidates, goalOptions, goalRowKind, normalizePlanned, removeAt, setCustomDone, stageLabel, toggleBonus,
  type PlanGoal, type PlannedEntry,
} from './planned'

const goal = (o: Partial<PlanGoal> & { name: string }): PlanGoal => ({ id: o.name, stages: null, done: false, current_stage: null, ...o })

describe('normalizePlanned', () => {
  it('старые записи-строки становятся целями, объекты сохраняются, мусор выбрасывается', () => {
    expect(normalizePlanned(['Выучить 10 слов', { type: 'custom', text: 'Позвонить', done: true, bonus: true }, null, 5, { nope: 1 }, { text: 'без типа' }])).toEqual([
      { type: 'goal', text: 'Выучить 10 слов' },
      { type: 'custom', text: 'Позвонить', done: true, bonus: true },
      { text: 'без типа' },
    ])
  })
  it('не массив / null → пустой план', () => {
    expect(normalizePlanned(null)).toEqual([])
    expect(normalizePlanned('x')).toEqual([])
    expect(normalizePlanned({})).toEqual([])
  })
  it('возвращает копии объектов — правка результата не задевает исходные данные', () => {
    const raw = [{ type: 'custom', text: 'A', done: false }]
    normalizePlanned(raw)[0].done = true
    expect(raw[0].done).toBe(false)
  })
})

describe('операции над планом не мутируют исходный массив', () => {
  const base: PlannedEntry[] = [{ type: 'goal', text: 'G' }, { type: 'custom', text: 'A', done: false }]
  it('addCustom: обрезает пробелы, пустое игнорирует (тот же массив)', () => {
    expect(addCustom(base, '  Новый  ')).toEqual([...base, { type: 'custom', text: 'Новый', done: false }])
    expect(addCustom(base, '   ')).toBe(base)
    expect(base).toHaveLength(2)
  })
  it('addGoal: не дублирует цель, уже стоящую в плане', () => {
    expect(addGoal(base, 'G')).toBe(base)
    expect(addGoal(base, 'H')).toEqual([...base, { type: 'goal', text: 'H' }])
    // пункт-custom с тем же текстом не мешает добавить одноимённую цель
    expect(addGoal([{ type: 'custom', text: 'H', done: false }], 'H')).toHaveLength(2)
  })
  it('removeAt / toggleBonus / setCustomDone работают по индексу', () => {
    expect(removeAt(base, 0)).toEqual([base[1]])
    expect(toggleBonus(base, 1)[1].bonus).toBe(true)
    expect(toggleBonus(toggleBonus(base, 1), 1)[1].bonus).toBe(false)
    expect(setCustomDone(base, 1, true)[1].done).toBe(true)
    expect(base[1]).toEqual({ type: 'custom', text: 'A', done: false })
  })
})

describe('goalOptions / goalRowKind / stageLabel', () => {
  const goals = [goal({ name: 'A' }), goal({ name: 'B', done: true }), goal({ name: 'C' }), goal({ name: 'D', stages: 3, current_stage: 2 })]
  it('в списке для добавления нет выполненных и уже запланированных целей', () => {
    expect(goalOptions(goals, [{ type: 'goal', text: 'C' }]).map((g) => g.name)).toEqual(['A', 'D'])
  })
  it('вид строки: удалённая / одноэтапная (stages null или 1) / многоэтапная', () => {
    expect(goalRowKind(undefined)).toBe('missing')
    expect(goalRowKind(goals[0])).toBe('single')
    expect(goalRowKind(goal({ name: 'x', stages: 1 }))).toBe('single')
    expect(goalRowKind(goals[3])).toBe('staged')
  })
  it('подпись этапов', () => {
    expect(stageLabel(goals[3])).toBe('2/3')
    expect(stageLabel(goal({ name: 'x', stages: 4, current_stage: null }))).toBe('0/4')
  })
})

describe('carryOverCandidates (сегодня 2026-09-28; окно — 7 суток назад включительно)', () => {
  const custom = (text: string, extra: Partial<PlannedEntry> = {}): PlannedEntry => ({ type: 'custom', text, done: false, ...extra })
  const notes = [
    { date: '2026-09-27', planned_goals: [custom('A'), custom('B', { done: true }), custom('C', { bonus: true }), { type: 'goal', text: 'G' }, 'Строка-цель'] },
    { date: '2026-09-26', planned_goals: [custom('A'), custom('D')] }, // A — дубль (берём свежий), D уже стоит в сегодняшнем плане
    { date: '2026-09-21', planned_goals: [custom('E')] }, // ровно 7 суток назад — входит
    { date: '2026-09-20', planned_goals: [custom('F')] }, // 8 суток — не входит
    { date: '2026-09-28', planned_goals: [custom('T')] }, // сегодня — не «прошлое»
    { date: '2026-09-29', planned_goals: [custom('U')] }, // будущее
  ]
  it('только невыполненные обычные пункты без бонусных, без дублей и без уже запланированных', () => {
    expect(carryOverCandidates(notes, '2026-09-28', [custom('D')])).toEqual([
      { text: 'A', date: '2026-09-27' },
      { text: 'E', date: '2026-09-21' },
    ])
  })
  it('порядок — от свежих дат к старым, независимо от порядка во входных данных', () => {
    const r = carryOverCandidates([...notes].reverse(), '2026-09-28', [])
    expect(r.map((c) => c.text)).toEqual(['A', 'D', 'E'])
  })
  it('пустые и битые заметки не ломают расчёт', () => {
    expect(carryOverCandidates([{ date: '2026-09-27', planned_goals: null }, { date: '2026-09-26', planned_goals: 'x' }], '2026-09-28', [])).toEqual([])
  })
  it('граница окна пересекает месяц/год (нет ошибок календарной арифметики)', () => {
    const r = carryOverCandidates([{ date: '2025-12-31', planned_goals: [custom('Y')] }, { date: '2025-12-24', planned_goals: [custom('Z')] }], '2026-01-01', [])
    expect(r.map((c) => c.text)).toEqual(['Y']) // 24.12 — 8 суток назад, не входит
  })
})

describe('appendCarried', () => {
  it('добавляет обычные невыполненные пункты; пустой список — тот же массив', () => {
    const base: PlannedEntry[] = [{ type: 'goal', text: 'G' }]
    expect(appendCarried(base, ['A', 'B'])).toEqual([...base, { type: 'custom', text: 'A', done: false }, { type: 'custom', text: 'B', done: false }])
    expect(appendCarried(base, [])).toBe(base)
  })
})
