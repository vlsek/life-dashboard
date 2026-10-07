import { describe, it, expect } from 'vitest'
import {
  newOptionDraft, draftsFromOptions, optionsFromDrafts, uniqueOptionKey, buildSchedule, scheduleSummary, fieldsEnabledForType, clearedForBoolean,
  emptyForm, formFromMetric, scheduleFields, streakImportFields, buildInsertRow, buildUpdateRow,
  nextPosition, categoryKeyFor, goalSummary, withoutWater,
  isTrackOnlyMetric, effectiveForm, fieldsEnabledForForm, countStreakFields,
} from './metricsManager'
import type { Metric } from './types'

function metric(o: Partial<Metric> = {}): Metric {
  return {
    id: 'm1', user_id: 'u1', name: 'Test', icon: null, type: 'number', unit: null, goal_value: null,
    goal_direction: null, schedule: null, category_id: null, position: 0, ...o,
  }
}

describe('варианты метрики списком: draftsFromOptions / optionsFromDrafts', () => {
  it('сохранённые варианты открываются в форме с подписями и своими ключами', () => {
    const d = draftsFromOptions([{ key: 'a', label: 'Alpha' }, { key: 'b', label: '' }])
    expect(d.map((x) => [x.key, x.label])).toEqual([['a', 'Alpha'], ['b', 'b']]) // нет подписи — показываем ключ
    expect(draftsFromOptions(null)).toEqual([])
    expect(new Set(d.map((x) => x.id)).size).toBe(2) // у каждой строки свой id (для v-for и перетаскивания)
  })
  it('у нового варианта ключ — сама подпись (как у «Подходов»), в базу уходит только { key, label }', () => {
    expect(optionsFromDrafts([newOptionDraft('Классические'), newOptionDraft('Алмазные')])).toEqual([
      { key: 'Классические', label: 'Классические' },
      { key: 'Алмазные', label: 'Алмазные' },
    ])
  })
  it('подпись с запятой и двоеточием работает (раньше ломала разбор строки «ключ:Метка, …»)', () => {
    expect(optionsFromDrafts([newOptionDraft('Утро, до еды: 1 таблетка')])).toEqual([{ key: 'Утро, до еды: 1 таблетка', label: 'Утро, до еды: 1 таблетка' }])
  })
  it('ключ сохранённого варианта НЕ меняется при правке подписи — записанные значения остаются на месте', () => {
    const d = draftsFromOptions([{ key: 'a', label: 'Alpha' }])
    d[0].label = 'Alpha plus'
    expect(optionsFromDrafts(d)).toEqual([{ key: 'a', label: 'Alpha plus' }])
  })
  it('пустые подписи отбрасываются, пробелы чистятся, порядок как в списке', () => {
    const d = [newOptionDraft('  Б  в '), newOptionDraft('   '), newOptionDraft(''), newOptionDraft('А')]
    expect(optionsFromDrafts(d)).toEqual([{ key: 'Б в', label: 'Б в' }, { key: 'А', label: 'А' }])
  })
  it('одинаковые подписи получают разные ключи; ключи сохранённых вариантов заняты в первую очередь', () => {
    expect(optionsFromDrafts([newOptionDraft('Да'), newOptionDraft('Да'), newOptionDraft('Да')]).map((o) => o.key)).toEqual(['Да', 'Да 2', 'Да 3'])
    const saved = newOptionDraft('Старый', 'Нов') // сохранённый вариант с ключом «Нов»
    expect(optionsFromDrafts([newOptionDraft('Нов'), saved]).map((o) => o.key)).toEqual(['Нов 2', 'Нов'])
    expect(uniqueOptionKey('x', new Set(['x', 'x 2']))).toBe('x 3')
    expect(uniqueOptionKey('y', new Set())).toBe('y')
  })
  it('пустой список и null → []', () => {
    expect(optionsFromDrafts([])).toEqual([])
    expect(optionsFromDrafts(null)).toEqual([])
  })
})

describe('buildSchedule', () => {
  const base = { scheduleKind: 'daily' as const, days: [1, 2, 3], weeklyMin: 3, atMostMax: 2 }
  it('daily → null', () => expect(buildSchedule(base)).toBeNull())
  it('days → sorted days; 0 or 7 selected days → null (every day)', () => {
    expect(buildSchedule({ ...base, scheduleKind: 'days', days: [5, 0, 1] })).toEqual({ type: 'days', days: [0, 1, 5] })
    expect(buildSchedule({ ...base, scheduleKind: 'days', days: [] })).toBeNull()
    expect(buildSchedule({ ...base, scheduleKind: 'days', days: [0, 1, 2, 3, 4, 5, 6] })).toBeNull()
  })
  it('weekly clamps to 1..7, at_most clamps to 0..7', () => {
    expect(buildSchedule({ ...base, scheduleKind: 'weekly', weeklyMin: 99 })).toEqual({ type: 'weekly', min: 7 })
    expect(buildSchedule({ ...base, scheduleKind: 'weekly', weeklyMin: 0 })).toEqual({ type: 'weekly', min: 1 })
    expect(buildSchedule({ ...base, scheduleKind: 'at_most', atMostMax: -3 })).toEqual({ type: 'at_most', max: 0 })
    expect(buildSchedule({ ...base, scheduleKind: 'at_most', atMostMax: 9 })).toEqual({ type: 'at_most', max: 7 })
  })
})

describe('scheduleSummary', () => {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  it('lists days in Mon-first order (Sunday last)', () => {
    expect(scheduleSummary({ type: 'days', days: [0, 1, 3] }, names, '/w', 'max')).toBe('Mon Wed Sun')
  })
  it('formats weekly and at_most, null for no schedule', () => {
    expect(scheduleSummary({ type: 'weekly', min: 3 }, names, '/w', 'max')).toBe('3/w')
    expect(scheduleSummary({ type: 'at_most', max: 2 }, names, '/w', 'max')).toBe('max 2/w')
    expect(scheduleSummary(null, names, '/w', 'max')).toBeNull()
  })
})

describe('fieldsEnabledForType / clearedForBoolean', () => {
  it('enables the right fields per type', () => {
    expect(fieldsEnabledForType('number')).toEqual({ goal: true, inputMode: true, options: false })
    expect(fieldsEnabledForType('boolean')).toEqual({ goal: false, inputMode: false, options: false })
    expect(fieldsEnabledForType('multiselect')).toEqual({ goal: false, inputMode: false, options: true })
    expect(fieldsEnabledForType('sets')).toEqual({ goal: true, inputMode: false, options: true })
  })
  it('clears goal/unit/options when switching to boolean', () => {
    const f = { ...emptyForm(), goalValue: 5, unit: 'km', options: [newOptionDraft('b', 'a')] }
    expect(clearedForBoolean(f)).toMatchObject({ goalValue: 0, unit: '', options: [] })
  })
})

describe('formFromMetric', () => {
  it('maps a metric with a weekly schedule and imported streak', () => {
    const f = formFromMetric(metric({ name: 'Run', type: 'number', goal_value: 5, unit: 'km', goal_direction: 'at_most',
      schedule: { type: 'weekly', min: 4 }, streak_import_days: 10, category_id: 'c1', input_mode: 'add' }))
    expect(f).toMatchObject({ name: 'Run', goalValue: 5, unit: 'km', goalDirection: 'at_most', scheduleKind: 'weekly',
      weeklyMin: 4, streakImportDays: '10', categoryId: 'c1', inputMode: 'add', icon: 'svg:pin' })
  })
  it('defaults for a bare metric', () => {
    expect(formFromMetric(metric())).toMatchObject({ scheduleKind: 'daily', days: [1, 2, 3, 4, 5], streakImportDays: '', inputMode: 'set' })
  })
})

describe('scheduleFields', () => {
  const f = { ...emptyForm(), scheduleKind: 'daily' as const }
  it('omits schedule for a new daily metric, writes null when the column already exists', () => {
    expect(scheduleFields(f, null)).toEqual({})
    expect(scheduleFields(f, metric({ schedule: null }))).toEqual({ schedule: null })
  })
  it('writes a real schedule always', () => {
    expect(scheduleFields({ ...f, scheduleKind: 'weekly', weeklyMin: 2 }, null)).toEqual({ schedule: { type: 'weekly', min: 2 } })
  })
})

describe('streakImportFields', () => {
  const today = '2026-09-28'
  const f = (v: string) => ({ ...emptyForm(), streakImportDays: v })
  it('resets import when cleared and the column exists; nothing when the migration is missing', () => {
    expect(streakImportFields(f(''), metric({ streak_import_days: 5 }), today)).toEqual({ streak_import_days: null, streak_import_date: null })
    expect(streakImportFields(f('0'), metric(), today)).toEqual({})
  })
  it('does nothing when migration 026 is not applied (column absent)', () => {
    expect(streakImportFields(f('7'), metric(), today)).toEqual({})
  })
  it('sets today as the import date only when the number changed', () => {
    const ex = metric({ streak_import_days: 7, streak_import_date: '2026-09-01' })
    expect(streakImportFields(f('7'), ex, today)).toEqual({ streak_import_days: 7, streak_import_date: '2026-09-01' })
    expect(streakImportFields(f('9'), ex, today)).toEqual({ streak_import_days: 9, streak_import_date: today })
  })
})

describe('buildInsertRow / buildUpdateRow', () => {
  it('builds an insert row with trimmed name, parsed options, position and active', () => {
    const form = { ...emptyForm(), name: '  Water ', type: 'multiselect' as const, options: [newOptionDraft('A', 'a'), newOptionDraft('B', 'b')], unit: 'ml' }
    const row = buildInsertRow(form, 'u1', 3, 'cat1')
    expect(row).toMatchObject({ user_id: 'u1', name: 'Water', type: 'multiselect', position: 3, active: true,
      category_id: 'cat1', options: [{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }] })
    expect('schedule' in row).toBe(false)
  })
  it('builds an update row without user_id/position/active', () => {
    const row = buildUpdateRow({ ...emptyForm(), name: 'X' }, metric({ schedule: null }), null)
    expect(row).toMatchObject({ name: 'X', category_id: null, schedule: null })
    expect('user_id' in row).toBe(false)
    expect('position' in row).toBe(false)
  })
})

describe('nextPosition / categoryKeyFor / goalSummary', () => {
  it('nextPosition is max+1, 0 when empty', () => {
    expect(nextPosition([])).toBe(0)
    expect(nextPosition([{ position: 2 }, { position: 5 }])).toBe(6)
  })
  it('categoryKeyFor slugifies, caps at 30 chars and appends a base36 timestamp', () => {
    // как в оригинале: хвостовой символ даёт '_', плюс разделитель перед timestamp → двойное подчёркивание
    expect(categoryKeyFor('Мой Спорт!', 36)).toBe('мой_спорт__10')
    expect(categoryKeyFor('x'.repeat(50), 0)).toBe('x'.repeat(30) + '_0')
  })
  it('goalSummary formats number goals by direction, and the other types', () => {
    expect(goalSummary(metric({ goal_direction: 'at_most', goal_value: 3, unit: 'h' }), 'yes/no', 'multi')).toBe('< 3 h')
    expect(goalSummary(metric({ goal_value: 5, unit: 'km' }), 'yes/no', 'multi')).toBe('≥ 5 km')
    expect(goalSummary(metric({ type: 'boolean' }), 'yes/no', 'multi')).toBe('yes/no')
    expect(goalSummary(metric({ type: 'sets' }), 'yes/no', 'multi')).toBe('multi')
  })
})

describe('withoutWater', () => {
  it('hides the water metric found by the droplet icon', () => {
    const water = metric({ id: 'w', name: 'Hydration', icon: '💧' })
    const other = metric({ id: 'o', name: 'Steps' })
    expect(withoutWater([other, water])).toEqual([other])
  })
  it('hides the water metric found by name (RU/EN) when there is no icon', () => {
    expect(withoutWater([metric({ id: 'a', name: 'Вода' }), metric({ id: 'b', name: 'Steps' })]).map((m) => m.id)).toEqual(['b'])
    expect(withoutWater([metric({ id: 'a', name: 'Water' })])).toEqual([])
  })
  it('hides only the one metric the dashboard treats as water', () => {
    const first = metric({ id: 'a', name: 'Вода' })
    const second = metric({ id: 'b', name: 'Не пить воду', type: 'boolean' })
    expect(withoutWater([first, second]).map((m) => m.id)).toEqual(['b'])
  })
  it('returns the list untouched when there is no water metric', () => {
    const list = [metric({ id: 'a', name: 'Steps' })]
    expect(withoutWater(list)).toBe(list)
  })
})

// BACKLOG 14 (11:15): «нужно ли считать стрик у метрики» + «просто записывать значение»
describe('track-only mode / count_streak', () => {
  const weight = () => metric({ id: 'w', name: 'Weight', unit: 'kg', goal_value: 0, goal_direction: 'at_least', count_streak: false })

  it('detects a track-only metric from the stored fields', () => {
    expect(isTrackOnlyMetric(weight())).toBe(true)
    expect(isTrackOnlyMetric(metric({ count_streak: false, goal_value: null }))).toBe(true)
  })
  it('is not track-only when the streak is on, the goal is real, there is a schedule, or the type is not number', () => {
    expect(isTrackOnlyMetric(metric({ goal_value: 0 }))).toBe(false)
    expect(isTrackOnlyMetric(metric({ count_streak: false, goal_value: 5 }))).toBe(false)
    expect(isTrackOnlyMetric(metric({ count_streak: false, goal_value: 0, schedule: { type: 'days', days: [1] } }))).toBe(false)
    expect(isTrackOnlyMetric(metric({ count_streak: false, goal_value: 0, type: 'boolean' }))).toBe(false)
  })
  it('formFromMetric restores the switches (and defaults to counting a streak)', () => {
    expect(formFromMetric(weight())).toMatchObject({ trackOnly: true, countStreak: false })
    expect(formFromMetric(metric())).toMatchObject({ trackOnly: false, countStreak: true })
    expect(emptyForm()).toMatchObject({ trackOnly: false, countStreak: true })
  })
  it('effectiveForm neutralises goal, schedule, streak import and streak in track-only mode', () => {
    const f = { ...emptyForm(), name: 'W', goalValue: 80, goalDirection: 'at_most' as const, scheduleKind: 'weekly' as const, streakImportDays: '12', trackOnly: true }
    expect(effectiveForm(f)).toMatchObject({ goalValue: 0, goalDirection: 'at_least', scheduleKind: 'daily', streakImportDays: '', countStreak: false })
  })
  it('track-only does not apply to other types', () => {
    const f = { ...emptyForm(), type: 'boolean' as const, trackOnly: true, countStreak: true }
    expect(effectiveForm(f)).toMatchObject({ trackOnly: false, countStreak: true })
  })
  it('effectiveForm leaves an ordinary form untouched', () => {
    const f = { ...emptyForm(), goalValue: 8, scheduleKind: 'weekly' as const }
    expect(effectiveForm(f)).toBe(f)
  })
  it('fieldsEnabledForForm turns off goal, schedule, streak and import in track-only mode, but keeps the unit', () => {
    const on = fieldsEnabledForForm({ type: 'number', trackOnly: true })
    expect(on).toMatchObject({ trackOnlyAvailable: true, goal: false, unit: true, schedule: false, countStreak: false, streakImport: false })
    const off = fieldsEnabledForForm({ type: 'number', trackOnly: false })
    expect(off).toMatchObject({ goal: true, unit: true, schedule: true, countStreak: true, streakImport: true })
    expect(fieldsEnabledForForm({ type: 'boolean', trackOnly: false })).toMatchObject({ trackOnlyAvailable: false, goal: false, unit: false, schedule: true })
  })
  it('countStreakFields: written when off, or when the column already exists; skipped when on without the column', () => {
    const f = emptyForm()
    expect(countStreakFields(f, null)).toEqual({})
    expect(countStreakFields({ ...f, countStreak: false }, null)).toEqual({ count_streak: false })
    expect(countStreakFields(f, metric({ count_streak: true }))).toEqual({ count_streak: true })
    expect(countStreakFields(f, metric())).toEqual({}) // миграция 031 ещё не применена
    expect(countStreakFields({ ...f, trackOnly: true }, null)).toEqual({ count_streak: false })
  })
  it('buildInsertRow in track-only mode saves a neutral metric with the streak off', () => {
    const f = { ...emptyForm(), name: ' Weight ', unit: 'kg', goalValue: 70, scheduleKind: 'weekly' as const, trackOnly: true }
    const row = buildInsertRow(f, 'u1', 3, null)
    expect(row).toMatchObject({ name: 'Weight', unit: 'kg', goal_value: 0, goal_direction: 'at_least', count_streak: false })
    expect('schedule' in row).toBe(false)
  })
  it('buildUpdateRow clears schedule and streak import of an existing metric when switched to track-only', () => {
    const existing = metric({ schedule: { type: 'weekly', min: 3 }, streak_import_days: 40, streak_import_date: '2026-09-01', count_streak: true })
    const row = buildUpdateRow({ ...formFromMetric(existing), trackOnly: true }, existing, null)
    expect(row).toMatchObject({ count_streak: false, goal_value: 0, schedule: null, streak_import_days: null, streak_import_date: null })
  })
  it('buildUpdateRow turns the streak back on when track-only is switched off', () => {
    const existing = weekly()
    function weekly() { return metric({ id: 'w', name: 'Weight', goal_value: 0, count_streak: false }) }
    const row = buildUpdateRow({ ...formFromMetric(existing), trackOnly: false, countStreak: true }, existing, null)
    expect(row).toMatchObject({ count_streak: true })
  })
  it('goalSummary shows "value only" instead of "≥ 0 kg" for a track-only metric', () => {
    expect(goalSummary(weight(), 'yes', 'multi', 'value only')).toBe('value only, kg')
    expect(goalSummary(metric({ goal_value: 5, goal_direction: 'at_least', unit: 'km' }), 'yes', 'multi', 'value only')).toBe('≥ 5 km')
    expect(goalSummary(weight(), 'yes', 'multi')).toBe('≥ 0 kg') // без подписи — как раньше
  })
})
