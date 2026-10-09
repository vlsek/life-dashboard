import { describe, expect, it } from 'vitest'
import { PRESETS, canStepForward, classifyPeriod, containsDay, currentPeriod, formatRange, monthLabel, monthOf, stepPeriod, viewBounds, weekOf } from './periodNav'
import { periodBounds } from './chart'

// Выбор периода у графиков (BACKLOG 16, 13:44). «Сегодня» — пятница 2026-10-02: неделя пн 09-28 … вс 10-04, прошлая 09-21 … 09-27, месяц 10-01 … 10-31.
const TODAY = '2026-10-02'
const st = (range: any, from: string | null = null, to: string | null = null) => ({ range, from, to })

describe('периоды: недели и месяцы', () => {
  it('weekOf / monthOf: границы календарных периодов (пн–вс, 1-е … последнее)', () => {
    expect(weekOf(TODAY)).toEqual({ from: '2026-09-28', to: '2026-10-04' })
    expect(weekOf('2026-09-28')).toEqual({ from: '2026-09-28', to: '2026-10-04' })
    expect(weekOf('2026-10-04')).toEqual({ from: '2026-09-28', to: '2026-10-04' })
    expect(monthOf(TODAY)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(monthOf('2024-02-10')).toEqual({ from: '2024-02-01', to: '2024-02-29' }) // високосный год
  })
})

describe('classifyPeriod — как показать сохранённый период', () => {
  it('новые короткие пресеты и «Всё» — preset', () => {
    for (const key of PRESETS) expect(classifyPeriod(st(key), TODAY)).toEqual({ kind: 'preset', key })
  })
  it('сохранённые раньше week / last_week / month работают и листаются как календарные периоды', () => {
    expect(classifyPeriod(st('week'), TODAY)).toEqual({ kind: 'week', from: '2026-09-28', to: '2026-10-04' })
    expect(classifyPeriod(st('last_week'), TODAY)).toEqual({ kind: 'week', from: '2026-09-21', to: '2026-09-27' })
    expect(classifyPeriod(st('month'), TODAY)).toEqual({ kind: 'month', from: '2026-10-01', to: '2026-10-31' })
  })
  it('сохранённые 10 дней — произвольный диапазон с теми же границами, что и раньше', () => {
    expect(classifyPeriod(st('days10'), TODAY)).toEqual({ kind: 'custom', from: '2026-09-23', to: '2026-10-02' })
  })
  it('custom, совпавший с календарной неделей/месяцем, распознаётся обратно; остальное — custom', () => {
    expect(classifyPeriod(st('custom', '2026-09-21', '2026-09-27'), TODAY).kind).toBe('week')
    expect(classifyPeriod(st('custom', '2026-09-01', '2026-09-30'), TODAY).kind).toBe('month')
    expect(classifyPeriod(st('custom', '2026-09-22', '2026-09-28'), TODAY)).toEqual({ kind: 'custom', from: '2026-09-22', to: '2026-09-28' }) // 7 дней, но не пн–вс
    expect(classifyPeriod(st('custom', '2026-09-03', '2026-10-02'), TODAY).kind).toBe('custom')
    expect(classifyPeriod(st('custom', '2026-09-03', null), TODAY)).toEqual({ kind: 'custom', from: '2026-09-03', to: null })
    expect(classifyPeriod(st('custom'), TODAY)).toEqual({ kind: 'custom', from: null, to: null })
  })
})

describe('viewBounds — по каким датам реально фильтруется график', () => {
  it('пресеты — скользящие окна включая сегодня; «Всё» — без границ', () => {
    const at = new Date(2026, 9, 2)
    expect(periodBounds('days7', null, null, at)).toEqual(['2026-09-26', '2026-10-02'])
    expect(periodBounds('days30', null, null, at)).toEqual(['2026-09-03', '2026-10-02'])
    expect(periodBounds('days90', null, null, at)).toEqual(['2026-07-05', '2026-10-02'])
    expect(periodBounds('year', null, null, at)).toEqual(['2025-10-03', '2026-10-02'])
    expect(viewBounds({ kind: 'preset', key: 'days7' }, TODAY)).toEqual(['2026-09-26', '2026-10-02'])
    expect(viewBounds({ kind: 'preset', key: 'all' }, TODAY)).toEqual([null, null])
    expect(viewBounds({ kind: 'week', from: '2026-09-21', to: '2026-09-27' }, TODAY)).toEqual(['2026-09-21', '2026-09-27'])
  })
})

describe('stepPeriod / canStepForward / currentPeriod', () => {
  it('неделя: ±7 дней, всегда пн–вс; результат сохраняется как custom', () => {
    expect(stepPeriod({ kind: 'week', from: '2026-09-28' }, -1)).toEqual(st('custom', '2026-09-21', '2026-09-27'))
    expect(stepPeriod({ kind: 'week', from: '2026-09-28' }, 1)).toEqual(st('custom', '2026-10-05', '2026-10-11'))
  })
  it('месяц: соседний месяц целиком, переход через границу года', () => {
    expect(stepPeriod({ kind: 'month', from: '2026-10-01' }, -1)).toEqual(st('custom', '2026-09-01', '2026-09-30'))
    expect(stepPeriod({ kind: 'month', from: '2026-01-01' }, -1)).toEqual(st('custom', '2025-12-01', '2025-12-31'))
    expect(stepPeriod({ kind: 'month', from: '2026-12-01' }, 1)).toEqual(st('custom', '2027-01-01', '2027-01-31'))
    expect(stepPeriod({ kind: 'month', from: '2026-01-31' }, 1)).toEqual(st('custom', '2026-02-01', '2026-02-28')) // не «31 января + месяц»
  })
  it('вперёд листать нельзя в будущее, назад — всегда можно', () => {
    expect(canStepForward({ kind: 'week', from: '2026-09-28' }, TODAY)).toBe(false) // следующая неделя ещё не началась
    expect(canStepForward({ kind: 'week', from: '2026-09-21' }, TODAY)).toBe(true)
    expect(canStepForward({ kind: 'month', from: '2026-10-01' }, TODAY)).toBe(false)
    expect(canStepForward({ kind: 'month', from: '2026-09-01' }, TODAY)).toBe(true)
  })
  it('currentPeriod: период с сегодняшним днём; containsDay', () => {
    expect(currentPeriod('week', TODAY)).toEqual(st('custom', '2026-09-28', '2026-10-04'))
    expect(currentPeriod('month', TODAY)).toEqual(st('custom', '2026-10-01', '2026-10-31'))
    expect(containsDay({ from: '2026-09-28', to: '2026-10-04' }, TODAY)).toBe(true)
    expect(containsDay({ from: '2026-09-21', to: '2026-09-27' }, TODAY)).toBe(false)
  })
})

describe('formatRange / monthLabel', () => {
  it('RU: день–день месяц; через границу месяца; с годом, если не текущий', () => {
    expect(formatRange('2026-09-21', '2026-09-27', 'ru', TODAY)).toMatch(/^21–27 сент\.?$/)
    expect(formatRange('2026-09-28', '2026-10-04', 'ru', TODAY)).toMatch(/^28 сент\.? – 4 окт\.?$/)
    expect(formatRange('2025-12-29', '2026-01-04', 'ru', TODAY)).toMatch(/^29 дек\.? – 4 янв\.?$/) // конец в текущем году — без года
    expect(formatRange('2025-12-22', '2025-12-28', 'ru', TODAY)).toMatch(/^22–28 дек\.? 2025$/) // прошлый год — с годом
  })
  it('EN: месяц перед числом', () => {
    expect(formatRange('2026-09-21', '2026-09-27', 'en', TODAY)).toBe('Sep 21–27')
    expect(formatRange('2026-09-28', '2026-10-04', 'en', TODAY)).toBe('Sep 28 – Oct 4')
    expect(formatRange('2025-09-28', '2025-10-04', 'en', TODAY)).toBe('Sep 28 – Oct 4, 2025')
  })
  it('открытые границы и пусто', () => {
    expect(formatRange('2026-09-03', null, 'en', TODAY)).toBe('Sep 3 – …')
    expect(formatRange(null, '2026-09-03', 'en', TODAY)).toBe('… – Sep 3')
    expect(formatRange(null, null, 'en', TODAY)).toBe('')
  })
  it('monthLabel: название месяца, год — только если не текущий', () => {
    expect(monthLabel('2026-09-01', 'en', TODAY)).toBe('September')
    expect(monthLabel('2025-09-01', 'en', TODAY)).toBe('September 2025')
    expect(monthLabel('2026-09-01', 'ru', TODAY).toLowerCase()).toContain('сентябр')
  })
})
