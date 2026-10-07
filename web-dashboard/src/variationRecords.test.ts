import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import VariationRecords from './components/VariationRecords.vue'
import sectionSource from './components/SetsSection.vue?raw'
import { mergeVariationRecords } from './lib/useVariationRecords'
import { setRecordsEnabled } from './lib/records'

// BACKLOG раздел 28 (решение владельца 2026-10-04): рекорд за ОДИН подход по каждой особенности — и у карточки метрики (под графиком уже есть, v3.01).
const h = vi.hoisted(() => ({ rows: [] as any[], failFetch: false }))
vi.mock('./lib/supabase', () => ({
  sb: {
    from: () => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        range: () => (h.failFetch ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ data: h.rows, error: null })),
      }
      return chain
    },
  },
}))
const { useVariationRecords } = await import('./lib/useVariationRecords')

const rec = (label: string | null, y: number, date: string) => ({ label, y, date })

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('site_lang', 'ru')
  h.rows = []
  h.failFetch = false
})
afterEach(() => vi.restoreAllMocks())

describe('mergeVariationRecords', () => {
  it('больший рекорд побеждает; при равенстве — более ранняя дата', () => {
    const out = mergeVariationRecords([rec('Классика', 30, '2026-10-02')], [rec('Классика', 35, '2026-10-05'), rec('Классика', 20, '2026-10-06')])
    expect(out).toEqual([rec('Классика', 35, '2026-10-05')])
    expect(mergeVariationRecords([rec('Классика', 30, '2026-10-02')], [rec('Классика', 30, '2026-09-01')])).toEqual([rec('Классика', 30, '2026-09-01')])
  })
  it('порядок сохраняется, новые особенности — в конец, «без особенности» — последней', () => {
    const out = mergeVariationRecords([rec('Классика', 30, 'a'), rec(null, 12, 'b')], [rec('Алмазные', 10, 'c')])
    expect(out.map((r) => r.label)).toEqual(['Классика', 'Алмазные', null])
  })
  it('пустые входы', () => {
    expect(mergeVariationRecords(undefined, [])).toEqual([])
    expect(mergeVariationRecords(null, [rec('A', 1, 'd')])).toEqual([rec('A', 1, 'd')])
  })
})

describe('useVariationRecords', () => {
  it('init: максимум за ОДИН подход по каждой особенности за всю историю (не сумма за день)', async () => {
    h.rows = [
      { date: '2026-10-01', metric_id: 'm1', value: [{ reps: 20, variation: 'Классика' }, { reps: 15, variation: 'Классика' }, { reps: 10, variation: 'Алмазные' }] },
      { date: '2026-10-03', metric_id: 'm1', value: [{ reps: 25, variation: 'Классика' }, { reps: 0, variation: 'Алмазные' }, { reps: 8, variation: null }] },
      { date: '2026-10-03', metric_id: 'm2', value: [{ reps: 5, variation: null }] },
    ]
    const r = useVariationRecords()
    await r.init('u1', ['m1', 'm2', 'm3'])
    // порядок как в легенде графика: по дате первого появления, при равенстве по алфавиту — карточка и график совпадают
    expect(r.records.value.m1).toEqual([rec('Алмазные', 10, '2026-10-01'), rec('Классика', 25, '2026-10-03'), rec(null, 8, '2026-10-03')])
    expect(r.records.value.m2).toEqual([rec(null, 5, '2026-10-03')])
    expect(r.records.value.m3).toEqual([]) // метрика без истории
  })
  it('observe: новый подход обновляет рекорд сразу; меньшее значение рекорд не снижает', async () => {
    const r = useVariationRecords()
    await r.init('u1', ['m1'])
    r.observe('m1', '2026-10-07', [{ reps: 12, variation: 'Классика' }])
    expect(r.records.value.m1).toEqual([rec('Классика', 12, '2026-10-07')])
    r.observe('m1', '2026-10-08', [{ reps: 9, variation: 'Классика' }, { reps: 30, variation: 'Алмазные' }])
    expect(r.records.value.m1).toEqual([rec('Классика', 12, '2026-10-07'), rec('Алмазные', 30, '2026-10-08')])
    r.observe('m1', '2026-10-09', [{ reps: null, variation: 'Классика' }]) // пустой подход не считается
    expect(r.records.value.m1).toHaveLength(2)
  })
  it('сбой сети — рекордов просто нет, ошибка наружу не вылетает', async () => {
    h.failFetch = true
    const r = useVariationRecords()
    await expect(r.init('u1', ['m1'])).resolves.toBeUndefined()
    expect(r.records.value).toEqual({})
  })
})

describe('<VariationRecords>', () => {
  const mk = (records: any) => mount(VariationRecords, { props: { records } })
  it('по подписи на каждую особенность; значение жирным; дата в подсказке', () => {
    const w = mk([rec('Классика', 25, '2026-10-03'), rec('Алмазные', 10, '2026-10-01')])
    const items = w.findAll('[data-test=variation-record]')
    expect(items.map((i) => i.text())).toEqual(['Классика 25', 'Алмазные 10'])
    expect(w.text()).toContain('Рекорд за подход:')
    expect(items[0].attributes('title')).toContain('2026')
  })
  it('«без особенности» среди именованных подписывается; единственная — просто число', () => {
    expect(mk([rec('Классика', 25, '2026-10-03'), rec(null, 8, '2026-10-03')]).findAll('[data-test=variation-record]')[1].text()).toBe('без особенности 8')
    expect(mk([rec(null, 30, '2026-10-03')]).find('[data-test=variation-record]').text()).toBe('30')
  })
  it('нет рекордов — ничего не рисуется', () => {
    expect(mk([]).find('[data-test=variation-records]').exists()).toBe(false)
    expect(mk(undefined).find('[data-test=variation-records]').exists()).toBe(false)
  })
  it('выключатель «рекорды у метрик» прячет строку сразу и возвращает обратно; у графиков — не влияет', async () => {
    const w = mk([rec('Классика', 25, '2026-10-03')])
    expect(w.find('[data-test=variation-records]').exists()).toBe(true)
    setRecordsEnabled(false, 'charts')
    await flushPromises()
    expect(w.find('[data-test=variation-records]').exists()).toBe(true)
    setRecordsEnabled(false, 'metrics')
    await flushPromises()
    expect(w.find('[data-test=variation-records]').exists()).toBe(false)
    setRecordsEnabled(true, 'metrics')
    await flushPromises()
    expect(w.find('[data-test=variation-records]').exists()).toBe(true)
  })
})

describe('SetsSection: проводка', () => {
  it('под каждой карточкой — строка рекордов; рекорды грузятся один раз на набор метрик и обновляются подходами дня', () => {
    expect(sectionSource).toMatch(/<VariationRecords :records="variationRecords\[m\.id\]"/)
    expect(sectionSource).toMatch(/useVariationRecords\(\)/)
    expect(sectionSource).toMatch(/metrics\.value\.map\(\(m\) => m\.id\)\.join\(','\)/) // смена даты историю не перезапрашивает
    expect(sectionSource).toMatch(/observeVariations\(m\.id, props\.date, all\[m\.id\]\)/)
  })
})
