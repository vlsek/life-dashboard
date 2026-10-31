import { beforeEach, describe, expect, it, vi } from 'vitest'

// Подмена supabase: записываем вставки, порядок и ошибку на заданной порции
const calls: { table: string; rows: unknown[] }[] = []
let failOnCall = -1
vi.mock('./supabase', () => ({
  sb: {
    from: (table: string) => ({
      insert: async (rows: unknown[]) => {
        calls.push({ table, rows })
        return failOnCall === calls.length - 1 ? { error: { message: 'boom' } } : { error: null }
      },
      select: () => ({ eq: () => ({ order: async () => ({ data: [], error: null }) }) }),
    }),
  },
}))

import { useBooks } from './useBooks'

beforeEach(() => { calls.length = 0; failOnCall = -1 })

const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ title: `Книга ${i}`, author: 'А', status: 'to_read' as const, doneDate: null }))

describe('useBooks.importBooks (77.9)', () => {
  it('вставляет порциями по 100: 250 книг → 3 запроса (100, 100, 50)', async () => {
    await useBooks().importBooks('u1', mk(250))
    expect(calls.map((c) => c.rows.length)).toEqual([100, 100, 50])
    expect(calls.every((c) => c.table === 'books')).toBe(true)
  })
  it('прочитанные уходят без баллов и с датой', async () => {
    await useBooks().importBooks('u1', [{ title: 'Дюна', author: 'Ф', status: 'done', doneDate: '2024-03-15' }])
    expect(calls[0].rows[0]).toMatchObject({ user_id: 'u1', status: 'done', done_date: '2024-03-15', points: 0 })
  })
  it('ошибка на второй порции прерывает импорт и пробрасывается (первая порция уже вставлена)', async () => {
    failOnCall = 1
    await expect(useBooks().importBooks('u1', mk(150))).rejects.toMatchObject({ message: 'boom' })
    expect(calls.length).toBe(2)
  })
})
