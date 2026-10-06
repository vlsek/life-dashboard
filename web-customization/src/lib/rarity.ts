// Редкость наград «Кастомизации», как в играх (BACKLOG раздел 39; запрос владельца 2026-10-06: «обычные, редкие, эпические и т.д.»,
// группы сворачиваются, и не только у тем, а у всей кастомизации). Чем сложнее получить предмет и чем он эффектнее — тем выше редкость.
// ВСЯ таблица здесь: поменять редкость предмета/темы или добавить уровень — правка одной строки. Нового предмета без записи не бывает:
// страж `rarity.test.ts` падает, если у предмета реестра или темы нет редкости (или осталась запись про несуществующий).
import { PRICE_TIERS, type CustomItem } from './customization'
import { THEME_KEYS, type ThemeKey } from './theme'

// Порядок = от самого частого к самому редкому. Уровень «необычные» из BACKLOG не вводился (4 уровня достаточно для 8 предметов
// и 11 тем); добавить его — вставить ключ сюда, цвет ниже и подпись `cust_rarity_<ключ>` в i18n.ts (тест подскажет, что забыто).
export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const
export type Rarity = (typeof RARITIES)[number]

// Цвета — отдельные от темы оформления (редкость должна узнаваться в любой теме) и используются только как метка: точка в заголовке
// группы и полоска сверху карточки; текст остаётся цветом темы, поэтому читаемость не зависит от темы.
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#8b95a1',
  rare: '#3b9cff',
  epic: '#b266ff',
  legendary: '#f5a623',
}

// Рамки аватарки. Правило: за баллы — по уровню цены (100 → обычная, 150 → редкая, 250 → эпическая); за достижение — по трудности
// достижения (30 дней серии → редкая, мега-продуктивность → эпическая, 100 дней серии и 1000 баллов → легендарные).
export const ITEM_RARITY: Record<string, Rarity> = {
  frame_neon: 'common',
  frame_aurora: 'rare',
  frame_gold: 'rare',
  frame_flame: 'epic',
  frame_rainbow: 'epic',
  frame_pulse: 'epic',
  frame_inferno: 'legendary',
  frame_royal: 'legendary',
}

// Темы. Исходные четыре и «Высокий контраст» (доступность — прятать за наградой нельзя) — обычные. Остальные шесть — «закрываемые»
// награды за четвёртую (самую трудную) ступень лесенок «Достижений» (web-achievements `LOCKABLE_THEMES`); чем «круче» тема, тем выше:
// светлые и тёплые — редкие, холодная Nord и кофейная Mocha — эпические, чёрная AMOLED — легендарная. Пока темы бесплатны (замок —
// следующий срез), редкость только раскладывает их по группам.
export const THEME_RARITY: Record<ThemeKey, Rarity> = {
  dark: 'common',
  monet: 'common',
  light: 'common',
  pink: 'common',
  contrast: 'common',
  mint: 'rare',
  sepia: 'rare',
  solarlight: 'rare',
  nord: 'epic',
  mocha: 'epic',
  amoled: 'legendary',
}

export const rarityOfItem = (key: string): Rarity => ITEM_RARITY[key] ?? 'common'
export const rarityOfTheme = (key: string): Rarity => THEME_RARITY[key as ThemeKey] ?? 'common'

export interface RarityBucket<T> {
  rarity: Rarity
  items: T[]
}

// Группы в порядке редкости; пустые группы не возвращаются; порядок внутри группы — как в исходном списке.
export function groupByRarity<T>(list: readonly T[], rarityOf: (x: T) => Rarity): RarityBucket<T>[] {
  return RARITIES.map((rarity) => ({ rarity, items: list.filter((x) => rarityOf(x) === rarity) })).filter((g) => g.items.length > 0)
}

export const itemGroups = (items: readonly CustomItem[]): RarityBucket<CustomItem>[] => groupByRarity(items, (i) => rarityOfItem(i.key))
export const themeGroups = (): RarityBucket<ThemeKey>[] => groupByRarity(Object.keys(THEME_KEYS) as ThemeKey[], rarityOfTheme)

// Уровень цены → редкость (для стража: у платных предметов редкость не убывает с ценой).
export const priceRank = (item: CustomItem): number => (item.source === 'points' && item.tier ? PRICE_TIERS[item.tier] : 0)
