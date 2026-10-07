import { beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-ignore — типов node в проекте нет, vitest работает в node
import { readFileSync } from 'node:fs'
import { CUSTOMIZATION_PURCHASE_PREFIXES, isCustomizationPurchase } from './lib/customizationPurchase'

// BACKLOG 44.11 (решение владельца: в магазине только магазинное, в кастомизации только кастомизация): покупки Кастомизации не попадают в «Мои покупки».
describe('isCustomizationPurchase', () => {
  it('узнаёт строки покупок Кастомизации на обоих языках', () => {
    expect(isCustomizationPurchase('Кастомизация: Аврора')).toBe(true)
    expect(isCustomizationPurchase('Customization: Aurora')).toBe(true)
    expect(isCustomizationPurchase('  Кастомизация: Тема')).toBe(true)
  })
  it('обычные товары магазина (в том числе со словом «кастомизация» не в начале) остаются', () => {
    for (const n of ['Десерт', 'Новая игра', 'Курс по кастомизации', 'Кастомизация клавиатуры', '', null, undefined]) {
      expect(isCustomizationPurchase(n as string), String(n)).toBe(false)
    }
  })
  it('страж: префиксы совпадают с cust_shop_prefix в web-customization (оба языка)', () => {
    const i18n: string = readFileSync('../web-customization/src/lib/i18n.ts', 'utf-8')
    for (const p of CUSTOMIZATION_PURCHASE_PREFIXES) expect(i18n, p).toContain(`cust_shop_prefix: '${p}'`)
  })
})

const h = vi.hoisted(() => ({ rows: [] as any[], redeemed: [] as { cost: number }[] }))
vi.mock('./lib/supabase', () => {
  const q = (table: string) => {
    const chain: any = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      range: () => chain,
      maybeSingle: () => Promise.resolve({ data: { onboarded: true }, error: null }),
      then: (res: (v: unknown) => unknown) => {
        const data = table === 'shop_items' ? h.rows : []
        return Promise.resolve({ data, error: null }).then(res)
      },
    }
    return chain
  }
  return { sb: { auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1', email: 'a@b.c' } } } }) }, from: q } }
})
import { useShop } from './lib/useShop'

beforeEach(() => {
  h.rows = [
    { id: '1', user_id: 'u1', name: 'Десерт', cost: 50, redeemed: false },
    { id: '2', user_id: 'u1', name: 'Кастомизация: Аврора', cost: 200, redeemed: true },
    { id: '3', user_id: 'u1', name: 'Customization: Dark', cost: 100, redeemed: true },
    { id: '4', user_id: 'u1', name: 'Книга', cost: 30, redeemed: true },
  ]
})

describe('useShop: список магазина', () => {
  it('покупки Кастомизации скрыты из списка, обычные покупки и товары остались', async () => {
    const { items, init } = useShop()
    await init()
    expect(items.value.map((i) => i.name)).toEqual(['Десерт', 'Книга'])
  })
  it('баланс по-прежнему считает ВСЕ списания: запрос redeemed не фильтруется', () => {
    const src: string = readFileSync('src/lib/useShop.ts', 'utf-8')
    expect(src).toContain(".from('shop_items').select('cost').eq('user_id', userId).eq('redeemed', true)")
    expect(src).toContain('isCustomizationPurchase(it.name)')
  })
})
