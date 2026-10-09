// Редкость наград «Кастомизации», как в играх (BACKLOG раздел 39; запрос владельца 2026-10-06: «обычные, редкие, эпические и т.д.»,
// группы сворачиваются, и не только у тем, а у всей кастомизации). Чем сложнее получить предмет и чем он эффектнее — тем выше редкость.
// ВСЯ таблица здесь: поменять редкость предмета/темы или добавить уровень — правка одной строки. Нового предмета без записи не бывает:
// страж `rarity.test.ts` падает, если у предмета реестра или темы нет редкости (или осталась запись про несуществующий).
import { PRICE_TIERS, type CustomItem } from './customization'
import { THEME_KEYS, type ThemeKey } from './theme'

// Порядок = от самого частого к самому редкому. Пять уровней как в играх (владелец 2026-10-06: «необычные» — да). Добавить ещё
// уровень — вставить ключ сюда, цвет ниже и подпись `cust_rarity_<ключ>` в i18n.ts (тест подскажет, что забыто).
// ОБЯЗАТЕЛЬНО держать в согласии с `web-achievements/src/lib/rewards.ts` (там те же уровни у наград ступеней) — это проверяет тест
// `rewardRarity.test.ts` в web-achievements.
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
export type Rarity = (typeof RARITIES)[number]

// Цвета — отдельные от темы оформления (редкость должна узнаваться в любой теме) и используются только как метка: точка в заголовке
// группы и полоска сверху карточки; текст остаётся цветом темы, поэтому читаемость не зависит от темы.
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#8b95a1',
  uncommon: '#3fb97a',
  rare: '#3b9cff',
  epic: '#b266ff',
  legendary: '#f5a623',
}

// Рамки аватарки. Правило: за баллы — по уровню цены (100 → обычная, 150 → необычная, 250 → редкая); за достижение — по трудности
// достижения (30 дней серии → редкая, мега-продуктивность и 1000 баллов → эпические, 100 дней серии → легендарная).
// Рамки-награды ступеней лесенок «Достижений» (`frame_ink`, `frame_neuron`, … из `rewards.ts`) появятся в реестре позже: их редкость —
// «редкая» (3-я ступень) и «эпическая» (4-я ступень у челленджей и вех); тест в web-achievements сверит.
export const ITEM_RARITY: Record<string, Rarity> = {
  frame_neon: 'common',
  frame_aurora: 'uncommon',
  frame_gold: 'rare',
  frame_flame: 'rare',
  frame_rainbow: 'rare',
  frame_pulse: 'epic',
  frame_royal: 'epic',
  frame_inferno: 'legendary',
  // рамки-награды лесенок «Достижений»: 3-я ступень — редкие, 4-я у челленджей и вех (анимированные «редкие») — эпические
  frame_ink: 'rare',
  frame_neuron: 'rare',
  frame_target: 'rare',
  frame_gear: 'rare',
  frame_bookmark: 'rare',
  frame_steel: 'rare',
  frame_cup: 'rare',
  frame_beacon: 'rare',
  frame_rare_challenges: 'epic',
  frame_rare_milestones: 'epic',
  // рамки за монеты (46.2а): по уровню цены — 100 обычная, 150 необычная, 250 редкая
  frame_mint: 'common',
  frame_sky: 'common',
  frame_graphite: 'common',
  frame_coral: 'uncommon',
  frame_sunset: 'uncommon',
  frame_breath: 'uncommon',
  frame_comet: 'rare',
  frame_glitch: 'rare',
  collapse_accordion: 'uncommon', // как другие предметы за средний тариф (150)
  collapse_summary: 'rare', // как другие предметы за высокий тариф (250)
}

// Темы. Исходные четыре и «Высокий контраст» (доступность — прятать за наградой нельзя) — обычные. Остальные шесть — «закрываемые»
// награды за четвёртую (самую трудную) ступень лесенок «Достижений» (web-achievements `LOCKABLE_THEMES`); чем «круче» тема, тем выше:
// по трудности ступени-награды: «Сотня слов» (Sepia) и «Человек-оркестр» (Mint) — необычные; «Полсотни целей» (Solarized Light) и
// «Сотня в голове» (Nord) — редкие; «Своя библиотека» (Mocha, 25 книг) — эпическая; «Атлет» (AMOLED, 250 тренировок) — легендарная.
// Мнение агента, владельцу посмотреть и поправить (одна таблица).
export const THEME_RARITY: Record<ThemeKey, Rarity> = {
  dark: 'common',
  monet: 'common',
  light: 'common',
  pink: 'common',
  contrast: 'common',
  mint: 'uncommon',
  sepia: 'uncommon',
  solarlight: 'rare',
  nord: 'rare',
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
