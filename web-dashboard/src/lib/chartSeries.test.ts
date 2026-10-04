import { describe, expect, it } from 'vitest'
import { addableKeys, buildSeries, canEditValues, entryGoal, iconLabelText, moveEntry, parseEditedValue, parseKey, parseSavedEntries, removeEntry, resolveEntries, upsertPoint } from './chartSeries'
import type { BodyParam, BodyValue } from './profile'
import type { DailyValueRow, Metric } from './types'

const weight: BodyParam = { id: 'w', name: 'Вес', icon: 'svg:scale', unit: 'кг', position: 0 }
const fat: BodyParam = { id: 'f', name: 'Жир', icon: '🧈', unit: '%', position: 1 }
const waist: BodyParam = { id: 'x', name: 'Талия', icon: null, unit: 'см', position: 2 }
const bv = (parameter_id: string, date: string, value: number | null): BodyValue => ({ parameter_id, date, value })

const m = (o: Partial<Metric>): Metric => ({ id: 'm', user_id: 'u', name: 'M', icon: null, type: 'number', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o })
const water = m({ id: 'water', name: 'Вода', icon: '💧', unit: 'мл', goal_value: 2000, goal_direction: 'at_least' })
const pushups = m({ id: 'push', name: 'Отжимания', type: 'sets', goal_value: 20, goal_direction: 'at_least' })
const habit = m({ id: 'habit', name: 'Зарядка', type: 'boolean' })
const dv = (date: string, metric_id: string, value: DailyValueRow['value']): DailyValueRow => ({ date, metric_id, value })

describe('iconLabelText', () => {
  it('эмодзи — перед названием, svg-иконка и пустая — нет', () => {
    expect(iconLabelText('💧', 'Вода')).toBe('💧 Вода')
    expect(iconLabelText('svg:scale', 'Вес')).toBe('Вес')
    expect(iconLabelText(null, 'Талия')).toBe('Талия')
  })
})

describe('buildSeries', () => {
  const values = [bv('w', '2026-01-01', 80), bv('w', '2026-01-03', 79), bv('f', '2026-01-01', null), bv('f', '2026-01-02', 20)]
  const daily = [
    dv('2026-01-01', 'water', 2000), dv('2026-01-01', 'push', [{ reps: 10 }, { reps: 12 }]), dv('2026-01-01', 'habit', true),
    dv('2026-01-02', 'water', 1500), dv('2026-01-02', 'push', []), dv('2026-01-02', 'habit', false),
    dv('2026-01-03', 'habit', true),
  ]
  const s = buildSeries([weight, fat, waist], values, [water, pushups, habit], daily, 'Баллы')

  it('порядок ключей: параметры тела, баллы, метрики; boolean-метрики не попадают', () => {
    expect(Object.keys(s)).toEqual(['body:w', 'body:f', 'body:x', 'points', 'metric:water', 'metric:push'])
  })
  it('параметр тела: null-значения выкидываются, единица и подпись', () => {
    expect(s['body:w'].points).toEqual([{ date: '2026-01-01', y: 80 }, { date: '2026-01-03', y: 79 }])
    expect(s['body:f'].points).toEqual([{ date: '2026-01-02', y: 20 }])
    expect(s['body:f'].label).toBe('🧈 Жир')
    expect(s['body:f'].unit).toBe('%')
    expect(s['body:w'].unit).toBe(' кг')
    expect(s['body:x'].points).toEqual([])
  })
  it('серия несёт «чистое» имя и исходную иконку — заголовок графика рисует иконку сам (апд9: svg-иконка не терялась)', () => {
    expect(s['body:w']).toMatchObject({ name: 'Вес', icon: 'svg:scale', label: 'Вес' })
    expect(s['body:f']).toMatchObject({ name: 'Жир', icon: '🧈', label: '🧈 Жир' })
    const withSvg = buildSeries([], [], [m({ id: 'p2', name: 'Отжимания', type: 'sets', icon: 'svg:pushup' })], [], '')
    expect(withSvg['metric:p2']).toMatchObject({ name: 'Отжимания', icon: 'svg:pushup', label: 'Отжимания' })
    expect(s['metric:push']).toMatchObject({ name: 'Отжимания', icon: null })
  })
  it('баллы за день считаются по выполненным метрикам (вручную: 01.01 → 3, 02.01 → 0, 03.01 → 1)', () => {
    // 01.01: вода 2000>=2000 ✓, подходы 22>=20 ✓, зарядка ✓ = 3; 02.01: вода 1500<2000, подходы 0<20, зарядка ✗ = 0; 03.01: зарядка ✓ = 1
    expect(s['points'].points.map((p) => p.y)).toEqual([3, 0, 1])
    expect(s['points'].label).toBe('Баллы')
  })
  it('числовая метрика: единица, цель по умолчанию, только дни с записью', () => {
    expect(s['metric:water'].points).toEqual([{ date: '2026-01-01', y: 2000 }, { date: '2026-01-02', y: 1500 }])
    expect(s['metric:water'].unit).toBe(' мл')
    expect(s['metric:water'].defaultGoal).toBe(2000)
    expect(s['metric:water'].label).toBe('💧 Вода')
  })
  it('подходы: сумма повторений; пустой список даёт 0 (а не пропуск), тип запоминается', () => {
    // значение (y) — как и раньше; сверх него у точки подходов теперь доли по особенностям (BACKLOG 19, 11:41): без особенностей — одна доля «без особенности», пустой день — пусто
    expect(s['metric:push'].points.map((p) => ({ date: p.date, y: p.y }))).toEqual([{ date: '2026-01-01', y: 22 }, { date: '2026-01-02', y: 0 }])
    expect(s['metric:push'].points[1].shares).toEqual([])
    expect(s['metric:push'].type).toBe('sets')
  })
  it('битое значение подходов (не массив) пропускается, а не рисуется дырой', () => {
    const r = buildSeries([], [], [pushups], [dv('2026-01-01', 'push', 'oops' as any)], '')
    expect(r['metric:push'].points).toEqual([])
  })
})

describe('parseSavedEntries / resolveEntries', () => {
  const series = { 'body:a': {} as any, 'body:b': {} as any, 'body:c': {} as any, points: {} as any, 'metric:m': {} as any }
  it('старый формат (строки) и новый ({key, goal}) понимаются оба', () => {
    expect(parseSavedEntries(['points', { key: 'body:a', goal: 70 }, { key: 'metric:m' }])).toEqual([
      { key: 'points', goal: null }, { key: 'body:a', goal: 70 }, { key: 'metric:m', goal: null },
    ])
  })
  it('пусто / не массив — null; мусорные элементы пропускаются', () => {
    expect(parseSavedEntries(null)).toBeNull()
    expect(parseSavedEntries([])).toBeNull()
    expect(parseSavedEntries('x')).toBeNull()
    expect(parseSavedEntries([1, null, { nokey: 1 }, 'points'])).toEqual([{ key: 'points', goal: null }])
  })
  it('по умолчанию: первые два параметра тела + баллы', () => {
    expect(resolveEntries(null, series).map((e) => e.key)).toEqual(['body:a', 'body:b', 'points'])
  })
  it('по умолчанию без параметров тела — только баллы', () => {
    expect(resolveEntries(null, { points: {} as any }).map((e) => e.key)).toEqual(['points'])
  })
  it('сохранённый выбор фильтруется по существующим сериям, порядок сохраняется', () => {
    expect(resolveEntries(['metric:m', 'metric:gone', 'body:c'], series).map((e) => e.key)).toEqual(['metric:m', 'body:c'])
  })
  it('сохранённый выбор, целиком состоящий из удалённого, остаётся пустым (а не подменяется дефолтом)', () => {
    expect(resolveEntries(['metric:gone'], series)).toEqual([])
  })
})

describe('цели, ключи, порядок', () => {
  it('своя цель побеждает цель метрики; 0 — тоже своя цель', () => {
    expect(entryGoal({ key: 'k', goal: 5 }, { defaultGoal: 9 } as any)).toBe(5)
    expect(entryGoal({ key: 'k', goal: 0 }, { defaultGoal: 9 } as any)).toBe(0)
    expect(entryGoal({ key: 'k', goal: null }, { defaultGoal: 9 } as any)).toBe(9)
    expect(entryGoal({ key: 'k', goal: null }, {} as any)).toBeNull()
  })
  it('parseKey делит по первому двоеточию (в id могут быть двоеточия)', () => {
    expect(parseKey('metric:abc')).toEqual({ prefix: 'metric', id: 'abc' })
    expect(parseKey('body:a:b')).toEqual({ prefix: 'body', id: 'a:b' })
    expect(parseKey('points')).toEqual({ prefix: 'points', id: '' })
  })
  it('правка значений: метрики-числа и параметры тела да; баллы и подходы нет', () => {
    expect(canEditValues('metric:x', 'number')).toBe(true)
    expect(canEditValues('body:x')).toBe(true)
    expect(canEditValues('points')).toBe(false)
    expect(canEditValues('metric:x', 'sets')).toBe(false)
  })
  it('moveEntry/removeEntry не мутируют и держат границы', () => {
    const o = [{ key: 'a', goal: null }, { key: 'b', goal: null }, { key: 'c', goal: null }]
    expect(moveEntry(o, 1, -1).map((e) => e.key)).toEqual(['b', 'a', 'c'])
    expect(moveEntry(o, 1, 1).map((e) => e.key)).toEqual(['a', 'c', 'b'])
    expect(moveEntry(o, 0, -1)).toBe(o)
    expect(moveEntry(o, 2, 1)).toBe(o)
    expect(o.map((e) => e.key)).toEqual(['a', 'b', 'c'])
    expect(removeEntry(o, 'b').map((e) => e.key)).toEqual(['a', 'c'])
  })
  it('addableKeys — серии, которых ещё нет в списке', () => {
    expect(addableKeys({ a: {} as any, b: {} as any, c: {} as any }, [{ key: 'b', goal: null }])).toEqual(['a', 'c'])
  })
})

describe('upsertPoint / parseEditedValue', () => {
  it('заменяет существующую точку, не трогая остальные', () => {
    const pts = [{ date: '2026-01-01', y: 1 }, { date: '2026-01-02', y: 2 }]
    expect(upsertPoint(pts, '2026-01-02', 9)).toEqual([{ date: '2026-01-01', y: 1 }, { date: '2026-01-02', y: 9 }])
    expect(pts[1].y).toBe(2)
  })
  it('вставляет новую точку с сохранением порядка по дате', () => {
    expect(upsertPoint([{ date: '2026-01-01', y: 1 }, { date: '2026-01-03', y: 3 }], '2026-01-02', 2).map((p) => p.date)).toEqual(['2026-01-01', '2026-01-02', '2026-01-03'])
  })
  it('значение из поля: пусто → null, число → число, мусор → 0', () => {
    expect(parseEditedValue('')).toBeNull()
    expect(parseEditedValue('12.5')).toBe(12.5)
    expect(parseEditedValue('abc')).toBe(0)
  })
})

// BACKLOG 19 (11:41): метрики-подходы несут доли по особенностям и стабильный порядок
describe('buildSeries: sets variations', () => {
  const set = (reps: number, variation: string | null) => ({ reps, variation, time: null })
  const dv = (date: string, value: unknown): DailyValueRow => ({ date, metric_id: 'push', value } as DailyValueRow)
  const rows = [
    dv('2026-09-02', [set(30, 'diamond'), set(20, 'classic')]),
    dv('2026-09-01', [set(50, 'classic')]),
    dv('2026-09-03', [set(10, null)]),
  ]
  it('adds per-day shares and the variation order to a sets series', () => {
    const s = buildSeries([], [], [pushups], rows)['metric:push']
    expect(s.variations).toEqual(['classic', 'diamond']) // classic появилась раньше
    expect(s.points.map((p) => p.y)).toEqual([50, 50, 10])
    expect(s.points[1].shares).toEqual([{ label: 'classic', reps: 20 }, { label: 'diamond', reps: 30 }])
    expect(s.points[2].shares).toEqual([{ label: null, reps: 10 }])
  })
  it('does not add shares or variations to number metrics', () => {
    const s = buildSeries([], [], [water], [{ date: '2026-09-01', metric_id: 'water', value: 1500 } as DailyValueRow])['metric:water']
    expect(s.variations).toBeUndefined()
    expect(s.points[0].shares).toBeUndefined()
  })
  it('the order is built from the whole history, not from the shown period', () => {
    const s = buildSeries([], [], [pushups], rows)['metric:push']
    // «diamond» появилась 02.09 — даже если в окне графика только 03.09, цвета определяются по всей истории
    expect(s.variations!.indexOf('diamond')).toBe(1)
  })
  // BACKLOG 952: рекорд за один подход по каждой особенности — за всю историю, а не сумма за день
  it('adds the single-set record per variation over the whole history', () => {
    const s = buildSeries([], [], [pushups], rows)['metric:push']
    expect(s.variationRecords).toEqual([
      { label: 'classic', y: 50, date: '2026-09-01' },
      { label: 'diamond', y: 30, date: '2026-09-02' },
      { label: null, y: 10, date: '2026-09-03' },
    ])
  })
  it('does not add variationRecords to number metrics or to sets without any reps', () => {
    const n = buildSeries([], [], [water], [{ date: '2026-09-01', metric_id: 'water', value: 1500 } as DailyValueRow])['metric:water']
    expect(n.variationRecords).toBeUndefined()
    const empty = buildSeries([], [], [pushups], [dv('2026-09-01', [set(0, 'classic')])])['metric:push']
    expect(empty.variationRecords).toBeUndefined()
  })
})
