// Реестр «Кастомизации» (BACKLOG 491, решение владельца 2026-10-03) и чистая логика: статусы предметов, цены, разбор сохранённого.
// Здесь НЕТ сети и DOM — загрузка и запись в useCustomization.ts. Предметы добавляются по одному за итерацию (рамки аватарки — первый).

export type Category = 'avatar_frame' | 'collapse_style'
export const CATEGORY_ORDER: readonly Category[] = ['avatar_frame', 'collapse_style']

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
  { key: 'frame_flame', category: 'avatar_frame', source: 'points', tier: 'high' },
  { key: 'frame_rainbow', category: 'avatar_frame', source: 'points', tier: 'high' },
  { key: 'frame_inferno', category: 'avatar_frame', source: 'achievement', achievement: 'streak_100' },
  { key: 'frame_pulse', category: 'avatar_frame', source: 'achievement', achievement: 'mega_productivity' },
  { key: 'frame_royal', category: 'avatar_frame', source: 'achievement', achievement: 'points_1000' },
  // Рамки-награды лесенок «Достижений» (BACKLOG 37, шаг 2): 3-я ступень каждой лесенки — статичная рамка, 4-я у челленджей и вех — «редкая
  // анимированная». Ключи и достижения сверяет тест web-achievements/src/lib/rewards.test.ts (реестр наград ⇔ этот реестр).
  { key: 'frame_ink', category: 'avatar_frame', source: 'achievement', achievement: 'words_50' },
  { key: 'frame_neuron', category: 'avatar_frame', source: 'achievement', achievement: 'learned_50' },
  { key: 'frame_target', category: 'avatar_frame', source: 'achievement', achievement: 'goals_25' },
  { key: 'frame_gear', category: 'avatar_frame', source: 'achievement', achievement: 'skills_10' },
  { key: 'frame_bookmark', category: 'avatar_frame', source: 'achievement', achievement: 'books_10' },
  { key: 'frame_steel', category: 'avatar_frame', source: 'achievement', achievement: 'workouts_100' },
  { key: 'frame_cup', category: 'avatar_frame', source: 'achievement', achievement: 'challenges_10' },
  { key: 'frame_beacon', category: 'avatar_frame', source: 'achievement', achievement: 'milestones_10' },
  { key: 'frame_rare_challenges', category: 'avatar_frame', source: 'achievement', achievement: 'challenges_25' },
  { key: 'frame_rare_milestones', category: 'avatar_frame', source: 'achievement', achievement: 'milestones_25' },
  // Рамки за монеты, серия 46.2(а): 3 за 100, 3 за 150 (одна анимированная), 2 за 250 (обе анимированные)
  { key: 'frame_mint', category: 'avatar_frame', source: 'points', tier: 'low' },
  { key: 'frame_sky', category: 'avatar_frame', source: 'points', tier: 'low' },
  { key: 'frame_graphite', category: 'avatar_frame', source: 'points', tier: 'low' },
  { key: 'frame_coral', category: 'avatar_frame', source: 'points', tier: 'mid' },
  { key: 'frame_sunset', category: 'avatar_frame', source: 'points', tier: 'mid' },
  { key: 'frame_breath', category: 'avatar_frame', source: 'points', tier: 'mid' },
  { key: 'frame_comet', category: 'avatar_frame', source: 'points', tier: 'high' },
  { key: 'frame_glitch', category: 'avatar_frame', source: 'points', tier: 'high' },
  // Вид сворачивания блоков (BACKLOG 498): базовый шеврон бесплатен у всех (это «ничего не выбрано»); «аккордеон» — 150 (владелец 2026-10-03)
  { key: 'collapse_accordion', category: 'collapse_style', source: 'points', tier: 'mid' },
  // «Карточка со сводкой» (BACKLOG 498 срез 3): свёрнутый блок показывает справа от заголовка короткую строку итога; высокий тариф = 250 (владелец 2026-10-03)
  { key: 'collapse_summary', category: 'collapse_style', source: 'points', tier: 'high' },
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

// Баланс монет для покупок в «Кастомизации»: набрано баллов (та же функция, что у лидерборда, БЕЗ бонуса) + бонусные монеты за достижения (миграция 051,
// BACKLOG раздел 37) − потрачено в магазине. Считаем в десятых долях целыми числами — без хвоста плавающей точки.
export function composeBalance(earned: number, spent: number, bonusCoins: (number | string | null)[] = []): number {
  const bonusTenths = bonusCoins.reduce<number>((s, c) => s + (c == null || !Number.isFinite(Number(c)) ? 0 : Math.round(Number(c) * 10)), 0)
  return (Math.round(earned * 10) + bonusTenths - Math.round(spent * 10)) / 10
}
