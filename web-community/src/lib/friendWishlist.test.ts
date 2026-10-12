import { beforeEach, describe, expect, it, vi } from 'vitest'

// Вишлист друга (BACKLOG 57.6, миграция 077): разбор ответа, безопасные ссылки, цена, «нет миграции».
const h = vi.hoisted(() => ({ result: { data: null as unknown, error: null as unknown }, calls: [] as { fn: string; args: unknown }[] }))
vi.mock('./supabase', () => ({ sb: { rpc: (fn: string, args: unknown) => (h.calls.push({ fn, args }), Promise.resolve(h.result)) } }))

import { fetchFriendWishlist, parseWishlist, priceOf, safeLink } from './friendWishlist'

beforeEach(() => {
  h.result = { data: null, error: null }
  h.calls = []
})

describe('вишлист друга', () => {
  it('safeLink: только http(s)', () => {
    expect(safeLink('https://shop.example/x?a=1')).toBe('https://shop.example/x?a=1')
    expect(safeLink('javascript:alert(1)')).toBeNull()
    expect(safeLink('data:text/html,hi')).toBeNull()
    expect(safeLink('не ссылка')).toBeNull()
    expect(safeLink('')).toBeNull()
  })
  it('parseWishlist: числа строкой → числа, мусорные строки отброшены, опасные ссылки убраны', () => {
    const w = parseWishlist({ hidden: false, items: [{ id: 'a', name: 'Наушники', link: 'javascript:x', image_url: 'https://i.example/a.png', cost: '150', cost_sparks: null }, { id: 'b' }, { name: 'без id' }, null, { id: 'c', name: '  ' }] })!
    expect(w.items).toHaveLength(1)
    expect(w.items[0]).toMatchObject({ id: 'a', link: null, image_url: 'https://i.example/a.png', cost: 150, cost_sparks: null })
  })
  it('скрытый друг: hidden и пустой список, даже если сервер прислал вещи', () => {
    expect(parseWishlist({ hidden: true, items: [{ id: 'a', name: 'x' }] })).toEqual({ hidden: true, items: [] })
    expect(parseWishlist('мусор')).toBeNull()
    expect(parseWishlist(null)).toBeNull()
  })
  it('priceOf: огоньки главнее баллов; нулей и пустых нет', () => {
    expect(priceOf({ id: '1', name: 'a', link: null, image_url: null, cost: 0, cost_sparks: 12 })).toEqual({ value: 12, sparks: true })
    expect(priceOf({ id: '1', name: 'a', link: null, image_url: null, cost: 300, cost_sparks: null })).toEqual({ value: 300, sparks: false })
    expect(priceOf({ id: '1', name: 'a', link: null, image_url: null, cost: 0, cost_sparks: null })).toBeNull()
  })
  it('fetch: зовёт get_friend_wishlist, «функции нет» = unsupported, прочее = error', async () => {
    h.result = { data: { hidden: false, items: [] }, error: null }
    expect(await fetchFriendWishlist('f1')).toEqual({ status: 'ok', data: { hidden: false, items: [] } })
    expect(h.calls[0]).toEqual({ fn: 'get_friend_wishlist', args: { friend: 'f1' } })
    h.result = { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }
    expect((await fetchFriendWishlist('f1')).status).toBe('unsupported')
    h.result = { data: null, error: { code: '42501', message: 'not a friend' } }
    expect((await fetchFriendWishlist('f1')).status).toBe('error')
  })
})
