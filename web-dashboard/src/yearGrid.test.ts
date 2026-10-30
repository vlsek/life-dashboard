import { describe, expect, it } from 'vitest'
import { PERFECT_MODE, buildYearGrid, gridMetrics } from './lib/yearGrid'
import { addDaysIso } from './lib/date'
import type { Metric } from './lib/types'

// Год-сетка (BACKLOG 75.8): состояния дней и честность по 73.5.
function metric(o: Partial<Metric> = {}): Metric {
  return { id: 'm1', user_id: 'u1', name: 'Зарядка', icon: null, type: 'boolean', unit: null, goal_value: null, goal_direction: null, schedule: null, category_id: null, position: 0, ...o }
}
const TODAY = new Date(2026, 9, 29) // четверг
const T = '2026-10-29'
const day = (back: number) => addDaysIso(T, -back)
const flat = (g: ReturnType<typeof buildYearGrid>) => g.weeks.flat()
const at = (g: ReturnType<typeof buildYearGrid>, d: string) => flat(g).find((c) => c.date === d)!

describe('buildYearGrid: форма', () => {
  it('столбцы-недели по 7 дней, начиная с понедельника; последний столбец содержит сегодня', () => {
    const g = buildYearGrid([metric()], {}, 'm1', TODAY)
    expect(g.weeks.every((w) => w.length === 7)).toBe(true)
    expect(new Date(g.weeks[0][0].date + 'T12:00:00').getDay()).toBe(1) // понедельник
    expect(g.weeks[g.weeks.length - 1].some((c) => c.date === T)).toBe(true)
    expect(g.weeks.length).toBeGreaterThanOrEqual(52)
    expect(g.weeks.length).toBeLessThanOrEqual(54)
  })
  it('дни после сегодня в последней неделе — future', () => {
    const g = buildYearGrid([metric()], {}, 'm1', TODAY)
    expect(at(g, '2026-10-30').state).toBe('future') // пятница
    expect(at(g, '2026-11-01').state).toBe('future')
  })
})

describe('buildYearGrid: режим метрики', () => {
  const m = metric()
  const byDay = { [day(5)]: { m1: true }, [day(4)]: { m1: false }, [day(2)]: { m1: true } }

  it('до первой записи — «нет данных», а не пропуск (правило 73.5)', () => {
    const g = buildYearGrid([m], byDay, 'm1', TODAY)
    expect(at(g, day(30)).state).toBe('none')
    expect(at(g, day(6)).state).toBe('none')
  })
  it('выполнено / пропущено / сегодня ещё идёт', () => {
    const g = buildYearGrid([m], byDay, 'm1', TODAY)
    expect(at(g, day(5)).state).toBe('done')
    expect(at(g, day(4)).state).toBe('missed')
    expect(at(g, day(3)).state).toBe('missed') // записи нет, а метрика нужна
    expect(at(g, T).state).toBe('pending')
    expect(at(g, T).state).not.toBe('missed')
  })
  it('выполненный сегодня день — done', () => {
    const g = buildYearGrid([m], { ...byDay, [T]: { m1: true } }, 'm1', TODAY)
    expect(at(g, T).state).toBe('done')
  })
  it('счётчик: выполнено из учтённых (выходные, «нет данных» и сегодняшний день не считаются)', () => {
    const g = buildYearGrid([m], byDay, 'm1', TODAY)
    // дни day(5)…day(1): done, missed, missed, done, missed → 2 из 5
    expect(g.doneDays).toBe(2)
    expect(g.countedDays).toBe(5)
    expect(g.first).toBe(day(5))
  })
  it('день вне расписания — rest, а не пропуск', () => {
    const wed = metric({ id: 'w', schedule: { type: 'days', days: [3] } }) // только среды
    const g = buildYearGrid([wed], { [day(10)]: { w: true } }, 'w', TODAY)
    const sat = flat(g).find((c) => c.date > day(10) && c.date < T && new Date(c.date + 'T12:00:00').getDay() === 6)!
    expect(sat.state).toBe('rest')
  })
  it('числовая метрика несёт значение', () => {
    const n = metric({ id: 'n', type: 'number', goal_value: 8 })
    const g = buildYearGrid([n], { [day(2)]: { n: 8 }, [day(1)]: { n: 3 } }, 'n', TODAY)
    expect(at(g, day(2))).toMatchObject({ state: 'done', value: 8 })
    expect(at(g, day(1))).toMatchObject({ state: 'missed', value: 3 })
  })
  it('неизвестная метрика — как «идеальные дни»', () => {
    const a = buildYearGrid([m], byDay, 'нет-такой', TODAY)
    const b = buildYearGrid([m], byDay, PERFECT_MODE, TODAY)
    expect(flat(a).map((c) => c.state)).toEqual(flat(b).map((c) => c.state))
  })
})

describe('buildYearGrid: идеальные дни', () => {
  const a = metric({ id: 'a' })
  const b = metric({ id: 'b', position: 1 })
  it('идеальный день — выполнены все нужные; иначе пропущен, с частью done/total', () => {
    const byDay = { [day(3)]: { a: true, b: true }, [day(2)]: { a: true, b: false }, [day(1)]: { a: true, b: true } }
    const g = buildYearGrid([a, b], byDay, PERFECT_MODE, TODAY)
    expect(at(g, day(3)).state).toBe('done')
    expect(at(g, day(2))).toMatchObject({ state: 'missed', done: 1, total: 2 })
    expect(at(g, day(1)).state).toBe('done')
  })
  it('день без нужных по расписанию метрик — rest', () => {
    const onlyMon = metric({ id: 'a', schedule: { type: 'days', days: [1] } })
    const g = buildYearGrid([onlyMon], { [day(10)]: { a: true } }, PERFECT_MODE, TODAY)
    const tue = flat(g).find((c) => c.date > day(10) && new Date(c.date + 'T12:00:00').getDay() === 2)!
    expect(tue.state).toBe('rest')
  })
  it('метрики с выключенным «считать серию» в идеальный день не входят (как в серии)', () => {
    const weight = metric({ id: 'w', count_streak: false })
    const g = buildYearGrid([a, weight], { [day(2)]: { a: true } }, PERFECT_MODE, TODAY)
    expect(at(g, day(2)).state).toBe('done')
  })
})

describe('gridMetrics', () => {
  it('оставляет ежедневные метрики и дни недели; «N раз в неделю», «не больше N» и числа-лимиты не берёт', () => {
    const ms = [
      metric({ id: 'ok' }),
      metric({ id: 'days', schedule: { type: 'days', days: [1, 3] } }),
      metric({ id: 'weekly', schedule: { type: 'weekly', min: 3 } }),
      metric({ id: 'atmost', schedule: { type: 'at_most', max: 2 } }),
      metric({ id: 'limit', type: 'number', goal_value: 2, goal_direction: 'at_most' }),
    ]
    expect(gridMetrics(ms).map((m) => m.id)).toEqual(['ok', 'days'])
  })
})

// ── Компонент YearGrid ──
import { beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import YearGrid from './components/YearGrid.vue'
import type { YearGridData } from './lib/yearGrid'

describe('YearGrid.vue', () => {
  const m = metric({ id: 'a', name: 'Зарядка' })
  const water = metric({ id: 'w', name: 'Вода', type: 'number', goal_value: 8, unit: 'ст.', position: 1 })
  const data = (): YearGridData => ({
    metrics: [m, water],
    byDay: { [day(3)]: { a: true, w: 8 }, [day(2)]: { a: true, w: 3 }, [day(1)]: { a: false } },
    notes: { [day(3)]: ['Прогулка', 'Книга'] },
    today: TODAY,
  })
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('site_lang', 'ru')
  })

  it('пока данных нет совсем — сообщение, а не пустая сетка', () => {
    const w = mount(YearGrid, { props: { data: { metrics: [m], byDay: {}, notes: {}, today: TODAY } } })
    expect(w.find('[data-test="yg-empty"]').exists()).toBe(true)
    expect(w.find('[data-test="yg-grid"]').exists()).toBe(false)
  })

  it('рисует сетку, сводку «из учтённых дней» и легенду с подписями (не только цвет)', () => {
    const w = mount(YearGrid, { props: { data: data() } })
    expect(w.findAll('[role="gridcell"]').length).toBeGreaterThan(300)
    expect(w.get('[data-test="yg-summary"]').text()).toMatch(/Выполнено \d+ из \d+ учтённых дней/)
    const legend = w.get('[data-test="yg-legend"]').text()
    for (const word of ['Выполнено', 'Пропущено', 'Выходной', 'Сегодня']) expect(legend).toContain(word)
    // у каждой клетки есть текстовая подпись состояния
    const cell = w.get(`[data-date="${day(3)}"]`)
    expect(cell.attributes('aria-label')).toContain('Выполнено')
    expect(w.get(`[data-date="${day(1)}"]`).attributes('aria-label')).toContain('Пропущено')
  })

  it('тап по дню показывает состояние и заметки дня', async () => {
    const w = mount(YearGrid, { props: { data: data() } })
    await w.get(`[data-date="${day(3)}"]`).trigger('click')
    const d = w.get('[data-test="yg-detail"]').text()
    expect(d).toContain('Выполнено')
    expect(d).toContain('Прогулка; Книга')
    expect(d).toContain('2 из 2') // режим «идеальные дни»: обе метрики выполнены
  })

  it('режим метрики: значение числовой метрики и выбор запоминается', async () => {
    const w = mount(YearGrid, { props: { data: data() } })
    await w.get('[data-test="yg-mode"]').setValue('w')
    expect(localStorage.getItem('dash_year_grid_mode')).toBe('w')
    await w.get(`[data-date="${day(2)}"]`).trigger('click')
    expect(w.get('[data-test="yg-detail"]').text()).toContain('3 / 8 ст.')
    expect(w.get(`[data-date="${day(2)}"]`).attributes('data-state')).toBe('missed')
  })

  it('стрелки: ← на неделю назад, ↓ на день вперёд; будущие дни недоступны', async () => {
    const w = mount(YearGrid, { props: { data: data() } })
    await w.get(`[data-date="${day(3)}"]`).trigger('click')
    await w.get('[data-test="yg-grid"]').trigger('keydown', { key: 'ArrowDown' })
    expect(w.get('.yg-cell.sel').attributes('data-date')).toBe(day(2))
    await w.get('[data-test="yg-grid"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(w.get('.yg-cell.sel').attributes('data-date')).toBe(day(9))
    await w.get(`[data-date="${T}"]`).trigger('click')
    await w.get('[data-test="yg-grid"]').trigger('keydown', { key: 'ArrowDown' })
    expect(w.get('.yg-cell.sel').attributes('data-date')).toBe(T) // пятница ещё не наступила
  })

  it('сохранённый режим удалённой метрики откатывается к «идеальным дням»', () => {
    localStorage.setItem('dash_year_grid_mode', 'исчезла')
    const w = mount(YearGrid, { props: { data: data() } })
    expect((w.get('[data-test="yg-mode"]').element as HTMLSelectElement).value).toBe('perfect')
  })
})
