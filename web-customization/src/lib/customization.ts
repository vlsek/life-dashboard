// Реестр «Кастомизации» (BACKLOG 491, решение владельца 2026-10-03) и чистая логика: статусы предметов, цены, разбор сохранённого.
// Здесь НЕТ сети и DOM — загрузка и запись в useCustomization.ts. Предметы добавляются по одному за итерацию (рамки аватарки — первый).

export type Category = 'avatar_frame'
export const CATEGORY_ORDER: readonly Category[] = ['avatar_frame']

// Цены — три уровня, ВСЕ в одном месте (решение владельца): поменять число здесь — поменяется везде.
export const PRICE_TIERS = { low: 100, mid: 150, high: 250 } as const
export type PriceTier = keyof typeof PRICE_TIERS

export type Source = 'points' | 'achievement' | 'challenge'

export interface CustomItem {
  key: string
  category: Category
  // 'points' — покупается за баллы (tier обязателен); 'achievement' — только награда (achievement — ключ из реестра «Достижений»)
  source: 'points' | 'achievement'
  tier?: PriceTier
  achievement?: string
}

export const ITEMS: readonly CustomItem[] = [
  { key: 'frame_neon', category: 'avatar_frame', source: 'points', tier: 'low' },
  { key: 'frame_aurora', category: 'avatar_frame', source: 'points', tier: 'mid' },
  { key: 'frame_gold', category: 'avatar_frame', source: 'achievement', achievement: 'streak_30' },
]

export const itemByKey = (key: string): CustomItem | undefined => ITEMS.find((i) => i.key === key)

export function priceOf(item: CustomItem): number | null {
  return item.source === 'points' && item.tier ? PRICE_TIERS[item.tier] : null
}

export interface UnlockedInfo {
  source: Source
  unlockedAt: string | null
}
export type Unlocked = Record<string, UnlockedInfo>
export type Selected = Partial<Record<Category, string>>

export interface CustomState {
  unlocked: Unlocked
  selected: Selected
  balance: number | null // null — баланс не удалось посчитать (покупки выключены)
  achievements: ReadonlySet<string> // открытые достижения пользователя (ключи)
}

export type ItemStatus = 'selected' | 'owned' | 'buyable' | 'short' | 'locked'

export function itemStatus(item: CustomItem, st: CustomState): ItemStatus {
  if (st.unlocked[item.key]) return st.selected[item.category] === item.key ? 'selected' : 'owned'
  const price = priceOf(item)
  if (price != null) return st.balance != null && st.balance >= price ? 'buyable' : 'short'
  return 'locked'
}

// Сколько баллов не хватает до покупки (0 — хватает; null — не покупается или баланс неизвестен).
export function shortBy(item: CustomItem, balance: number | null): number | null {
  const price = priceOf(item)
  if (price == null || balance == null) return null
  return Math.max(0, Math.round((price - balance) * 10) / 10)
}

// Награды за достижения, которые уже получены, но ещё не записаны как открытые.
export function achievementUnlocks(items: readonly CustomItem[], unlocked: Unlocked, achievements: ReadonlySet<string>): string[] {
  return items.filter((i) => i.source === 'achievement' && i.achievement && achievements.has(i.achievement) && !unlocked[i.key]).map((i) => i.key)
}

// Выбор в категории: ключ — надеть (только открытое), null — снять. Возвращает новый объект.
export function nextSelected(selected: Selected, category: Category, key: string | null, unlocked: Unlocked): Selected {
  const next: Selected = { ...selected }
  if (key === null) delete next[category]
  else if (unlocked[key] && itemByKey(key)?.category === category) next[category] = key
  return next
}

// profiles.customization (jsonb) → только известные категории и существующие предметы; мусор отбрасывается.
export function parseSelected(raw: unknown): Selected {
  const out: Selected = {}
  if (!raw || typeof raw !== 'object') return out
  for (const cat of CATEGORY_ORDER) {
    const v = (raw as Record<string, unknown>)[cat]
    if (typeof v === 'string' && itemByKey(v)?.category === cat) out[cat] = v
  }
  return out
}

export function itemsOf(category: Category, source: 'points' | 'achievement'): CustomItem[] {
  return ITEMS.filter((i) => i.category === category && i.source === source)
}
