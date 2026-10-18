import { RARITIES, type Rarity } from './rarity'
import type { Visibility } from './useVisibility'

// Экран слота «Кастомизации» (BACKLOG 64.1, срез 3): режим «Все · Мои · Магазин», поиск по названию и сортировка. Чистая логика без Vue.
// «Мои» — то, что уже у человека (куплено, выдано за достижение, выбрано; открытая тема). «Магазин» — то, чего ещё нет: продаётся за монеты
// или выдаётся за достижение (закрытая тема). Это те же три группы видимости (`useVisibility`), поэтому режим — просто их сочетание.
export type SlotMode = 'all' | 'mine' | 'shop'
export const SLOT_MODES: readonly SlotMode[] = ['all', 'mine', 'shop']
export type SlotSort = 'rarity' | 'price' | 'name'
export const SLOT_SORTS: readonly SlotSort[] = ['rarity', 'price', 'name']

export const visOfMode = (m: SlotMode): Visibility => ({ owned: m !== 'shop', achievement: m !== 'mine', coins: m !== 'mine' })

// Обратное отображение: любое «не наше» сочетание (скажем, остались только «за монеты») показываем как «Магазин», если нет «Получено»
export function modeOfVis(v: Visibility): SlotMode {
  if (v.owned && !v.achievement && !v.coins) return 'mine'
  if (!v.owned && (v.achievement || v.coins)) return 'shop'
  return 'all'
}

// Поиск без учёта регистра и лишних пробелов; пустой запрос подходит всему
export const matchesQuery = (label: string, query: string): boolean => {
  const q = query.trim().toLocaleLowerCase()
  return !q || label.toLocaleLowerCase().includes(q)
}

export interface SortOps<T> {
  rarity: (x: T) => Rarity
  price?: (x: T) => number
  label: (x: T) => string
}

// Сортировка устойчивая: при равенстве остаётся порядок каталога. «По редкости» — от обычных к легендарным, как раньше шли группы;
// «По цене» — от дешёвых (бесплатные и награды первыми); «По названию» — по алфавиту языка интерфейса.
export function sortSlotItems<T>(list: readonly T[], sort: SlotSort, ops: SortOps<T>): T[] {
  const idx = new Map(list.map((x, i) => [x, i] as const))
  const key = (x: T): number => (sort === 'rarity' ? RARITIES.indexOf(ops.rarity(x)) : sort === 'price' ? (ops.price?.(x) ?? 0) : 0)
  return [...list].sort((a, b) => key(a) - key(b) || (sort === 'name' ? ops.label(a).localeCompare(ops.label(b)) : 0) || idx.get(a)! - idx.get(b)!)
}
