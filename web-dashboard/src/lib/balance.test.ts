import { describe, expect, it, vi } from 'vitest'
import { calcBalance, isDone, type BalanceMetric } from './balance'
import { PARALLEL_PAGES, fetchAllRows } from './fetchAll'

const bool: BalanceMetric = { id: 'b', type: 'boolean', goal_value: null, goal_direction: null }
const num: BalanceMetric = { id: 'n', type: 'number', goal_value: 5, goal_direction: 'at_least' }
const atMost: BalanceMetric = { id: 'a', type: 'number', goal_value: 3, goal_direction: 'at_most' }

describe('isDone', () => {
  it('boolean / number / at_most / sets', () => {
    expect(isDone(bool, true)).toBe(true)
    expect(isDone(bool, false)).toBe(false)
    expect(isDone(num, 5)).toBe(true)
    expect(isDone(num, 4)).toBe(false)
    expect(isDone(atMost, 2)).toBe(true)
    expect(isDone(atMost, 0)).toBe(false) // 0 не считается «выполнено» для «не более»
    expect(isDone(atMost, 3)).toBe(false) // строго меньше цели
    expect(isDone({ ...num, type: 'sets' }, [{ reps: 3 }, { reps: 2 }])).toBe(true) // 3+2=5 >= 5
    expect(isDone(num, undefined)).toBe(false)
  })
})

describe('calcBalance (вручную: дни 2 + цели 3+5 + навыки 10 + книги 2 = 22; потрачено 10 → 12)', () => {
  it('складывает все источники и вычитает купленное', () => {
    const values = [
      { date: '2026-09-01', metric_id: 'b', value: true },
      { date: '2026-09-01', metric_id: 'n', value: 5 },
      { date: '2026-09-02', metric_id: 'b', value: false },
      { date: '2026-09-02', metric_id: 'n', value: 4 },
    ]
    const r = calcBalance([bool, num], values, [{ points: 3 }, { points: null }], [{ points: null }], [{ points: 2 }], [10, null])
    expect(r).toEqual({ total: 22, spent: 10, bonus: 0, balance: 12 })
  })
  it('пустые данные — ноль', () => {
    expect(calcBalance([], [], [], [], [], []).balance).toBe(0)
  })
})

describe('fetchAllRows', () => {
  it('читает страницами по 1000, пока страница не неполная', async () => {
    const page = vi.fn(async (from: number) => ({ data: Array.from({ length: from === 0 ? 1000 : 5 }, (_, i) => ({ i })), error: null }))
    const { rows, error } = await fetchAllRows(page)
    // строки и ошибка — как раньше; лишние строки «за концом» пачки (этот мок отдаёт 5 строк на любую страницу после первой) не попадают
    expect(rows).toHaveLength(1005)
    expect(error).toBeNull()
    expect(page.mock.calls[0]).toEqual([0, 999])
    expect(page.mock.calls[1]).toEqual([1000, 1999])
    // BACKLOG 6: страницы после первой читаются пачкой параллельно — запросов не больше 1 + PARALLEL_PAGES
    expect(page.mock.calls.length).toBeLessThanOrEqual(1 + PARALLEL_PAGES)
  })
  it('в последовательном режиме (parallel = 1) — строго по одной странице, как раньше', async () => {
    const page = vi.fn(async (from: number) => ({ data: Array.from({ length: from === 0 ? 1000 : 5 }, (_, i) => ({ i })), error: null }))
    const { rows, error } = await fetchAllRows(page, 1)
    expect(rows).toHaveLength(1005)
    expect(error).toBeNull()
    expect(page).toHaveBeenCalledTimes(2)
    expect(page.mock.calls).toEqual([[0, 999], [1000, 1999]])
  })
  it('возвращает ошибку и то, что успело прочитаться', async () => {
    const page = vi.fn(async (from: number) => (from === 0 ? { data: Array.from({ length: 1000 }, () => ({})), error: null } : { data: null, error: { message: 'boom' } }))
    const { rows, error } = await fetchAllRows(page)
    expect(rows).toHaveLength(1000)
    expect(error).toBe('boom')
  })
})
