import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { delta, hasAnyTraining, monthlyVolumes, muscleBars, MUSCLE_BARS_LIMIT, periodCompare, periodRange, periodTotals, weekCompare, weeklyVolumes } from './lib/weekNumbers'
import WeekNumbers from './components/WeekNumbers.vue'
import type { Exercise, WorkoutEntry } from './lib/types'

// BACKLOG 69.14, срез 1: «Неделя в цифрах»
const TODAY = '2026-10-30' // пятница; неделя пн 26.10 – вс 01.11, прошлая 19.10–25.10
const ex = (id: string, name: string): Exercise => ({ id, user_id: 'u', name, category: null, tracks_weight: true, value_label: null, unit: 'кг', suggested_scheme: null, created_at: '2026-01-01' })
const exs = [ex('e1', 'Жим лёжа'), ex('e2', 'Приседания')]
const en = (id: string, exercise_id: string, date: string, sets: { reps: number; weight: number; type?: string }[]): WorkoutEntry =>
  ({ id, user_id: 'u', exercise_id, date, sets: sets.map((s) => ({ ...s, time: '18:00' })), notes: null, session_id: null }) as WorkoutEntry

describe('periodTotals', () => {
  it('дни, рабочие подходы и объём; разминка и пустые записи не считаются', () => {
    const e = [
      en('1', 'e1', '2026-10-26', [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 10, weight: 20, type: 'warmup' }]),
      en('2', 'e2', '2026-10-28', [{ reps: 5, weight: 100 }]),
      en('3', 'e1', '2026-10-28', []),
    ]
    expect(periodTotals(e, exs, '2026-10-26', '2026-11-01')).toEqual({ days: 2, sets: 3, volume: 60 * 8 * 2 + 500 })
  })
  it('границы включительно; чужие даты и удалённые упражнения не попадают', () => {
    const e = [en('1', 'e1', '2026-10-26', [{ reps: 1, weight: 10 }]), en('2', 'e1', '2026-11-01', [{ reps: 1, weight: 10 }]), en('3', 'e1', '2026-11-02', [{ reps: 1, weight: 10 }]), en('4', 'gone', '2026-10-27', [{ reps: 1, weight: 10 }])]
    expect(periodTotals(e, exs, '2026-10-26', '2026-11-01')).toMatchObject({ days: 2, sets: 2 })
  })
})

describe('weekCompare и delta', () => {
  it('текущая и прошлая недели по календарю пн–вс', () => {
    const e = [en('1', 'e1', '2026-10-27', [{ reps: 8, weight: 50 }]), en('2', 'e1', '2026-10-20', [{ reps: 8, weight: 40 }, { reps: 8, weight: 40 }]), en('3', 'e1', '2026-10-12', [{ reps: 1, weight: 1 }])]
    const c = weekCompare(e, exs, TODAY)
    expect([c.from, c.to]).toEqual(['2026-10-26', '2026-11-01'])
    expect(c.current).toMatchObject({ days: 1, sets: 1, volume: 400 })
    expect(c.previous).toMatchObject({ days: 1, sets: 2, volume: 640 })
  })
  it('delta: больше / меньше / так же / новое; процент считается от прошлого', () => {
    expect(delta(6, 4)).toEqual({ kind: 'up', diff: 2, pct: 50 })
    expect(delta(3, 4)).toEqual({ kind: 'down', diff: -1, pct: -25 })
    expect(delta(4, 4)).toEqual({ kind: 'same', diff: 0, pct: 0 })
    expect(delta(5, 0)).toEqual({ kind: 'new', diff: 5, pct: null })
    expect(delta(0, 0).kind).toBe('same')
  })
})

describe('weeklyVolumes', () => {
  it('8 недель от старой к новой, последняя — текущая; пустые недели — 0', () => {
    const e = [en('1', 'e1', '2026-10-27', [{ reps: 10, weight: 10 }]), en('2', 'e1', '2026-09-10', [{ reps: 10, weight: 20 }])]
    const w = weeklyVolumes(e, exs, TODAY)
    expect(w).toHaveLength(8)
    expect(w[7]).toMatchObject({ monday: '2026-10-26', volume: 100, current: true })
    expect(w.filter((x) => x.current)).toHaveLength(1)
    expect(w[0].monday < w[7].monday).toBe(true)
    expect(w.find((x) => x.monday === '2026-09-07')?.volume).toBe(200)
    expect(w[6].volume).toBe(0)
  })
  it('hasAnyTraining: только в окне восьми недель', () => {
    expect(hasAnyTraining([], exs, TODAY)).toBe(false)
    expect(hasAnyTraining([en('1', 'e1', '2026-10-27', [{ reps: 1, weight: 1 }])], exs, TODAY)).toBe(true)
    expect(hasAnyTraining([en('1', 'e1', '2026-03-01', [{ reps: 1, weight: 1 }])], exs, TODAY)).toBe(false)
  })
})

describe('WeekNumbers', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  const mk = (e: WorkoutEntry[]) => mount(WeekNumbers, { props: { entries: e, exercises: exs, today: TODAY } })
  const e = [
    en('1', 'e1', '2026-10-27', [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }]),
    en('2', 'e2', '2026-10-29', [{ reps: 5, weight: 100 }]),
    en('3', 'e1', '2026-10-20', [{ reps: 8, weight: 60 }]),
  ]
  it('три показателя недели и разница к прошлой', () => {
    const w = mk(e)
    const tile = (k: string) => w.get(`[data-testid="wk-tile-${k}"]`)
    expect(tile('days').get('[data-testid="wk-value"]').text()).toBe('2')
    expect(tile('sets').get('[data-testid="wk-value"]').text()).toBe('3')
    expect(tile('volume').get('[data-testid="wk-value"]').text()).toMatch(/1\s460/)
    expect(tile('days').get('[data-testid="wk-delta"]').text()).toContain('+1')
    expect(tile('sets').get('[data-testid="wk-delta"]').text()).toContain('+2')
    expect(tile('sets').get('[data-testid="wk-delta"]').text()).toContain('200 %')
  })
  it('8 столбиков, текущий выделен, высота по объёму', () => {
    const bars = mk(e).findAll('[data-testid="wk-bar"]')
    expect(bars).toHaveLength(8)
    expect(bars.filter((b) => b.attributes('data-current') === '1')).toHaveLength(1)
    expect(bars[7].attributes('style')).toContain('height: 100%') // текущая неделя — максимум
  })
  it('нет тренировок за 8 недель — блока нет', () => {
    expect(mk([]).find('[data-testid="week-numbers"]').exists()).toBe(false)
  })
})


describe('периоды: неделя и месяц со сдвигом назад (69.14, срез 2)', () => {
  it('periodRange: неделя пн–вс, месяц календарный; сдвиг назад; в будущее не листается', () => {
    expect(periodRange('week', TODAY, 0)).toEqual({ from: '2026-10-26', to: '2026-11-01' })
    expect(periodRange('week', TODAY, -1)).toEqual({ from: '2026-10-19', to: '2026-10-25' })
    expect(periodRange('month', TODAY, 0)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(periodRange('month', TODAY, -1)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(periodRange('month', '2026-01-15', -1)).toEqual({ from: '2025-12-01', to: '2025-12-31' }) // через границу года
    expect(periodRange('month', '2026-03-31', -1)).toEqual({ from: '2026-02-01', to: '2026-02-28' }) // короткий месяц
    expect(periodRange('week', TODAY, 3)).toEqual(periodRange('week', TODAY, 0))
  })
  it('periodCompare: месяц против прошлого месяца; weekCompare = неделя со сдвигом 0', () => {
    const e = [en('1', 'e1', '2026-10-05', [{ reps: 10, weight: 10 }]), en('2', 'e1', '2026-10-20', [{ reps: 10, weight: 10 }, { reps: 10, weight: 10 }]), en('3', 'e1', '2026-09-10', [{ reps: 10, weight: 20 }])]
    const m = periodCompare(e, exs, 'month', TODAY, 0)
    expect(m.current).toMatchObject({ days: 2, sets: 3, volume: 300 })
    expect(m.previous).toMatchObject({ days: 1, sets: 1, volume: 200 })
    const earlier = periodCompare(e, exs, 'month', TODAY, -1) // сентябрь против августа
    expect(earlier.current.sets).toBe(1)
    expect(earlier.previous.sets).toBe(0)
    expect(weekCompare(e, exs, TODAY)).toEqual(periodCompare(e, exs, 'week', TODAY, 0))
  })
  it('monthlyVolumes: 6 месяцев от старого к новому, последний — выбранный', () => {
    const e = [en('1', 'e1', '2026-10-05', [{ reps: 10, weight: 10 }]), en('2', 'e1', '2026-05-10', [{ reps: 10, weight: 20 }])]
    const v = monthlyVolumes(e, exs, TODAY)
    expect(v).toHaveLength(6)
    expect(v[5]).toMatchObject({ monthStart: '2026-10-01', volume: 100, current: true })
    expect(v[0]).toMatchObject({ monthStart: '2026-05-01', volume: 200, current: false })
  })
})

describe('WeekNumbers: период (69.14, срез 2)', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  const e = [en('1', 'e1', '2026-10-27', [{ reps: 8, weight: 60 }]), en('2', 'e1', '2026-10-20', [{ reps: 8, weight: 60 }]), en('3', 'e1', '2026-10-06', [{ reps: 8, weight: 60 }]), en('4', 'e1', '2026-09-15', [{ reps: 8, weight: 60 }])]
  const mk = () => mount(WeekNumbers, { props: { entries: e, exercises: exs, today: TODAY } })
  it('по умолчанию неделя: заголовок — даты пн–вс; «вперёд» выключена', () => {
    const w = mk()
    expect(w.get('[data-testid="wk-title"]').text()).toBe('26.10 – 01.11')
    expect(w.get('[data-testid="wk-next"]').attributes('disabled')).toBeDefined()
    expect(w.get('[data-testid="wk-kind-week"]').attributes('aria-pressed')).toBe('true')
  })
  it('‹ листает на прошлую неделю: числа и заголовок меняются, › возвращает', async () => {
    const w = mk()
    await w.get('[data-testid="wk-prev"]').trigger('click')
    expect(w.get('[data-testid="wk-title"]').text()).toBe('19.10 – 25.10')
    expect(w.get('[data-testid="wk-tile-sets"] [data-testid="wk-value"]').text()).toBe('1')
    expect(w.get('[data-testid="wk-next"]').attributes('disabled')).toBeUndefined()
    await w.get('[data-testid="wk-next"]').trigger('click')
    expect(w.get('[data-testid="wk-title"]').text()).toBe('26.10 – 01.11')
  })
  it('«Месяц»: заголовок с названием месяца, числа за октябрь, 6 столбиков; смена вида сбрасывает сдвиг', async () => {
    const w = mk()
    await w.get('[data-testid="wk-prev"]').trigger('click')
    await w.get('[data-testid="wk-kind-month"]').trigger('click')
    expect(w.get('[data-testid="wk-title"]').text()).toMatch(/октябр|October/i)
    expect(w.get('[data-testid="wk-tile-sets"] [data-testid="wk-value"]').text()).toBe('3')
    expect(w.findAll('[data-testid="wk-bar"]')).toHaveLength(6)
    expect(w.get('[data-testid="wk-next"]').attributes('disabled')).toBeDefined()
    await w.get('[data-testid="wk-prev"]').trigger('click')
    expect(w.get('[data-testid="wk-title"]').text()).toMatch(/сентябр|September/i)
    expect(w.get('[data-testid="wk-tile-sets"] [data-testid="wk-value"]').text()).toBe('1')
  })
  it('на прошлой неделе столбики заканчиваются выбранной неделей, она выделена', async () => {
    const w = mk()
    await w.get('[data-testid="wk-prev"]').trigger('click')
    const bars = w.findAll('[data-testid="wk-bar"]')
    expect(bars).toHaveLength(8)
    expect(bars[7].attributes('data-current')).toBe('1')
    expect(bars[7].attributes('title')).toContain('19.10')
  })
})


describe('muscleBars: подходы по группам мышц (69.14, срез 3)', () => {
  const e = [
    en('1', 'e1', '2026-10-27', [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 10, weight: 20, type: 'warmup' }]),
    en('2', 'e2', '2026-10-28', [{ reps: 5, weight: 100 }]),
    en('3', 'e1', '2026-10-20', [{ reps: 8, weight: 60 }]), // прошлая неделя — в эту не попадает
  ]
  it('считает рабочие подходы по группам за период; разминка и другие недели не в счёт; сортировка по убыванию', () => {
    const bars = muscleBars(e, exs, '2026-10-26', '2026-11-01')
    const by = new Map(bars.map((b) => [b.muscle, b.sets]))
    expect(by.get('chest')).toBe(3)
    expect(by.get('quads')).toBe(1)
    expect(bars.map((b) => b.sets)).toEqual([...bars.map((b) => b.sets)].sort((a, b) => b - a))
  })
  it('цель: недельная по умолчанию, своя из настроек; у месяца цели нет', () => {
    const wk = muscleBars(e, exs, '2026-10-26', '2026-11-01', { chest: 14 })
    expect(wk.find((b) => b.muscle === 'chest')?.target).toBe(14)
    expect(wk.find((b) => b.muscle === 'quads')?.target).toBe(10)
    expect(muscleBars(e, exs, '2026-10-01', '2026-10-31', {}, false).every((b) => b.target === null)).toBe(true)
  })
  it('границы включительно, будущее после конца периода не считается; пусто — пустой список; не больше лимита', () => {
    expect(muscleBars(e, exs, '2026-10-29', '2026-10-31')).toEqual([])
    expect(muscleBars([], exs, '2026-10-26', '2026-11-01')).toEqual([])
    const many = Array.from({ length: 12 }, (_, i) => ex('x' + i, ['Жим лёжа', 'Приседания', 'Тяга штанги', 'Жим стоя', 'Подъём на бицепс', 'Французский жим', 'Становая тяга', 'Выпады', 'Подъём на носки', 'Скручивания', 'Тяга верхнего блока', 'Разведение гантелей'][i]))
    const ent = many.map((x, i) => en('m' + i, x.id, '2026-10-27', [{ reps: 8, weight: 10 }]))
    expect(muscleBars(ent, many, '2026-10-26', '2026-11-01').length).toBeLessThanOrEqual(MUSCLE_BARS_LIMIT)
  })
})

describe('WeekNumbers: столбики по группам (69.14, срез 3)', () => {
  beforeEach(() => localStorage.setItem('site_lang', 'ru'))
  const e = [en('1', 'e1', '2026-10-27', Array.from({ length: 12 }, () => ({ reps: 8, weight: 60 }))), en('2', 'e2', '2026-10-28', [{ reps: 5, weight: 100 }]), en('3', 'e1', '2026-10-06', [{ reps: 8, weight: 60 }])]
  const mk = () => mount(WeekNumbers, { props: { entries: e, exercises: exs, today: TODAY } })
  it('строки по группам: число подходов и цель; выполненная цель окрашена иначе', () => {
    const w = mk()
    const rows = w.findAll('[data-testid="wk-muscle-row"]')
    expect(rows.length).toBeGreaterThan(0)
    const chest = rows.find((r) => /Грудь|Chest/.test(r.text()))!
    expect(chest.get('[data-testid="wk-muscle-num"]').text()).toBe('12/10')
    expect(chest.get('[data-testid="wk-muscle-fill"]').attributes('style')).toContain('var(--success)')
    const quads = rows.find((r) => /Квадрицепс|Quads/.test(r.text()))!
    expect(quads.get('[data-testid="wk-muscle-num"]').text()).toBe('1/10')
    expect(quads.get('[data-testid="wk-muscle-fill"]').attributes('style')).toContain('var(--accent)')
  })
  it('месяц: те же группы без цели (число без «/»), за октябрь больше', async () => {
    const w = mk()
    await w.get('[data-testid="wk-kind-month"]').trigger('click')
    const chest = w.findAll('[data-testid="wk-muscle-row"]').find((r) => /Грудь|Chest/.test(r.text()))!
    expect(chest.get('[data-testid="wk-muscle-num"]').text()).toBe('13')
  })
  it('листание на неделю без подходов — блока групп нет', async () => {
    const w = mk()
    await w.get('[data-testid="wk-prev"]').trigger('click')
    await w.get('[data-testid="wk-prev"]').trigger('click')
    expect(w.find('[data-testid="wk-muscles"]').exists()).toBe(false)
  })
})
