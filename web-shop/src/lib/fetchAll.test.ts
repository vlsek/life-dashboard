import { describe, expect, it, vi } from 'vitest'
import { fetchAllRows } from './fetchAll'

describe('fetchAllRows (баланс магазина не должен обрезаться на 1000 строк)', () => {
  it('читает страницами по 1000, пока страница не неполная', async () => {
    const page = vi.fn(async (from: number) => ({ data: Array.from({ length: from === 0 ? 1000 : 5 }, (_, i) => ({ i })), error: null }))
    const { rows, error } = await fetchAllRows(page)
    expect(rows).toHaveLength(1005)
    expect(error).toBeNull()
    expect(page.mock.calls).toEqual([[0, 999], [1000, 1999]])
  })
  it('ровно 1000 строк — просит ещё одну страницу и получает пустую', async () => {
    const page = vi.fn(async (from: number) => ({ data: from === 0 ? Array.from({ length: 1000 }, () => ({})) : [], error: null }))
    const { rows } = await fetchAllRows(page)
    expect(rows).toHaveLength(1000)
    expect(page).toHaveBeenCalledTimes(2)
  })
  it('ошибка на второй странице — возвращается ошибка и уже прочитанное', async () => {
    const page = vi.fn(async (from: number) => (from === 0 ? { data: Array.from({ length: 1000 }, () => ({})), error: null } : { data: null, error: { message: 'boom' } }))
    const { rows, error } = await fetchAllRows(page)
    expect(rows).toHaveLength(1000)
    expect(error).toBe('Could not load the data. Refresh the page and try again.') // понятный текст, а не сырое «boom» (BACKLOG 942)
  })
})
