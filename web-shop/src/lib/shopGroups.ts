import type { ShopItem } from './types'

// Группировка и фильтры витрины магазина (BACKLOG 392). Чистые функции без сети и DOM — тестируются отдельно.
// Позиции приходят из useShop уже отсортированными по цене (order('cost')); здесь порядок сохраняется.

export type ShopFilter = 'all' | 'affordable' | 'saving' | 'bought'

export interface ShopGroups {
  affordable: ShopItem[] // не куплено и баллов хватает
  saving: ShopItem[] // не куплено и баллов пока не хватает
  bought: ShopItem[] // куплено, свежие покупки сверху
}

export function splitItems(items: ShopItem[], balance: number | null): ShopGroups {
  const have = balance ?? 0
  const affordable: ShopItem[] = []
  const saving: ShopItem[] = []
  const bought: ShopItem[] = []
  for (const it of items) {
    if (it.redeemed) bought.push(it)
    else if (balance !== null && have >= it.cost) affordable.push(it)
    else saving.push(it)
  }
  bought.sort((a, b) => (b.redeemed_date ?? '').localeCompare(a.redeemed_date ?? ''))
  return { affordable, saving, bought }
}

// Цель, на которую копим: ближайшая по цене из тех, на что баллов ещё не хватает. Нет такой — null.
export function savingGoal(items: ShopItem[], balance: number | null): ShopItem | null {
  if (balance === null) return null
  return splitItems(items, balance).saving[0] ?? null
}

export function filterItems(items: ShopItem[], balance: number | null, filter: ShopFilter): ShopItem[] {
  if (filter === 'all') return items
  const g = splitItems(items, balance)
  return g[filter]
}

export function filterCounts(items: ShopItem[], balance: number | null): Record<ShopFilter, number> {
  const g = splitItems(items, balance)
  return { all: items.length, affordable: g.affordable.length, saving: g.saving.length, bought: g.bought.length }
}

export function fmtDateRu(iso: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}
