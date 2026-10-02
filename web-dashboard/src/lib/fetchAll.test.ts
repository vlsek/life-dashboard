import { describe, expect, it } from 'vitest'
import { PAGE, PARALLEL_PAGES, fetchAllRows } from './fetchAll'

// Источник на `total` строк с id 0..total-1; считает вызовы и максимум одновременных запросов.
function source(total: number, opts: { failAtFrom?: number } = {}) {
  const calls: number[] = []
  let inFlight = 0
  let maxInFlight = 0
  const page = async (from: number, to: number) => {
    calls.push(from)
    inFlight++
    maxInFlight = Math.max(maxInFlight, inFlight)
    await Promise.resolve()
    await Promise.resolve()
    inFlight--
    if (opts.failAtFrom === from) return { data: null, error: { message: 'boom@' + from } }
    const data = Array.from({ length: Math.max(0, Math.min(to + 1, total) - from) }, (_, i) => ({ id: from + i }))
    return { data, error: null }
  }
  return { page, calls, max: () => maxInFlight }
}
const ids = (rows: { id: number }[]) => rows.map((r) => r.id)

describe('fetchAllRows', () => {
  it('small data: exactly one request, like before', async () => {
    const s = source(120)
    const r = await fetchAllRows(s.page)
    expect(r.error).toBeNull()
    expect(r.rows).toHaveLength(120)
    expect(s.calls).toEqual([0])
  })
  it('empty source: one request, no rows', async () => {
    const s = source(0)
    expect(await fetchAllRows(s.page)).toEqual({ rows: [], error: null })
    expect(s.calls).toEqual([0])
  })
  it('a null data page is treated as the end', async () => {
    const r = await fetchAllRows(async () => ({ data: null, error: null }))
    expect(r).toEqual({ rows: [], error: null })
  })
  it('keeps the original order across pages and batches', async () => {
    const s = source(PAGE * 9 + 500)
    const r = await fetchAllRows(s.page)
    expect(r.error).toBeNull()
    expect(ids(r.rows)).toEqual(Array.from({ length: PAGE * 9 + 500 }, (_, i) => i))
  })
  it('reads the pages after the first in parallel batches', async () => {
    const s = source(PAGE * 3 + 500)
    await fetchAllRows(s.page)
    expect(s.calls[0]).toBe(0)
    expect(s.calls.slice(1).sort((a, b) => a - b)).toEqual([PAGE, PAGE * 2, PAGE * 3, PAGE * 4])
    expect(s.max()).toBe(PARALLEL_PAGES)
  })
  it('wastes at most (parallel − 1) empty requests past the end', async () => {
    const s = source(PAGE) // ровно одна полная страница
    const r = await fetchAllRows(s.page)
    expect(r.rows).toHaveLength(PAGE)
    expect(s.calls.length).toBe(1 + PARALLEL_PAGES)
  })
  it('parallel = 1 is strictly sequential with no extra requests', async () => {
    const s = source(PAGE * 2 + 500)
    const r = await fetchAllRows(s.page, 1)
    expect(r.rows).toHaveLength(PAGE * 2 + 500)
    expect(s.calls).toEqual([0, PAGE, PAGE * 2])
    expect(s.max()).toBe(1)
  })
  it('non-numeric or non-finite parallel falls back to the default instead of looping forever', async () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const s = source(PAGE * 2 + 5)
      const r = await fetchAllRows(s.page, bad as number)
      expect(r.rows).toHaveLength(PAGE * 2 + 5)
    }
    const s = source(PAGE * 2 + 5)
    expect((await fetchAllRows(s.page, 0)).rows).toHaveLength(PAGE * 2 + 5) // 0 → не меньше 1
  })
  it('first page error: no rows and the message', async () => {
    const s = source(5000, { failAtFrom: 0 })
    expect(await fetchAllRows(s.page)).toEqual({ rows: [], error: 'boom@0' })
    expect(s.calls).toEqual([0])
  })
  it('error inside a batch returns the rows read before it and the message, like the sequential version', async () => {
    const s = source(PAGE * 6, { failAtFrom: PAGE * 3 })
    const r = await fetchAllRows(s.page)
    expect(r.error).toBe('boom@' + PAGE * 3)
    expect(ids(r.rows)).toEqual(Array.from({ length: PAGE * 3 }, (_, i) => i)) // страницы 0,1,2; после ошибочной — ничего
  })
})
