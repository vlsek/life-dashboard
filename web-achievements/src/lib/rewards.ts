// Награды за ступени лесенок «Достижений» (BACKLOG раздел 37, решения владельца и агента 6 от 2026-10-05).
// ЕДИНОЕ место для таблицы наград: суммы монеток, предметы-рамки и темы. Тут только ДАННЫЕ и показ — сама выдача (монетки в баланс,
// предмет в user_customizations, открытие темы) делается в зонах агентов 1 / 2 / 5 (см. BACKLOG 37, «Порядок работ и зоны»).
//
// ЧЕСТНОСТЬ ПОКАЗА: пока награда не выдаётся по-настоящему, на карточке написано «Награда (скоро)», а не «Награда». Когда вид награды
// заработает (монетки — SQL агента 1, предметы — агент 2, темы — агент 5), ставится 'active' ниже — одна строка на вид.
export type RewardKind = 'coins' | 'item' | 'theme'
export type RewardStatus = 'planned' | 'active'

export type Reward = { kind: 'coins'; amount: number } | { kind: 'item'; key: string } | { kind: 'theme'; key: string }

export const REWARD_STATUS: Record<RewardKind, RewardStatus> = {
  coins: 'planned',
  item: 'planned',
  theme: 'planned',
}

export const COINS_STEP_1 = 20
export const COINS_STEP_2 = 50

// Темы, которые МОЖНО закрыть за достижения. НЕ входят: четыре исходные темы (dark, monet, light, pink — в избранном у всех по
// умолчанию) и contrast («Высокий контраст» — доступность, его нельзя прятать за достижением). Тест rewards.test.ts сверяет список
// с web-customization (DEFAULT_FAVORITE_THEMES) и с корневым style.css (темы, которых нет на сайте, не принимаются).
export const LOCKABLE_THEMES = ['mint', 'sepia', 'solarlight', 'nord', 'mocha', 'amoled'] as const

// Редкость награды (BACKLOG 39; владелец 2026-10-06: показывать в «Достижениях»). Уровни и цвета — ТЕ ЖЕ, что в
// `web-customization/src/lib/rarity.ts` (сверяет `rewardRarity.test.ts`). Правило: ступень 1 (20 монет) — обычная, ступень 2 (50 монет) —
// необычная, ступень 3 (рамка раздела) — редкая, ступень 4 — по теме (таблица ниже) или эпическая у «редкой рамки» челленджей и вех.
export const RARITIES = ['common', 'uncommon', 'rare', 'epic', 'legendary'] as const
export type Rarity = (typeof RARITIES)[number]
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#8b95a1',
  uncommon: '#3fb97a',
  rare: '#3b9cff',
  epic: '#b266ff',
  legendary: '#f5a623',
}
export const THEME_REWARD_RARITY: Record<(typeof LOCKABLE_THEMES)[number], Rarity> = {
  mint: 'uncommon',
  sepia: 'uncommon',
  solarlight: 'rare',
  nord: 'rare',
  mocha: 'epic',
  amoled: 'legendary',
}

type Ladder = { steps: [string, string, string, string]; item: string; finale: { theme: string } | { item: string } }

// Лесенки: ступени 1–2 → монетки, 3 → рамка своего раздела, 4 → тема (темы хватает на 6 из 8 лесенок; «челленджи» и «вехи» пока получают
// редкую анимированную рамку — когда появятся ещё две темы, заменить `finale`).
export const LADDERS: Record<string, Ladder> = {
  words: { steps: ['words_10', 'words_25', 'words_50', 'words_100'], item: 'frame_ink', finale: { theme: 'sepia' } },
  learned: { steps: ['learned_10', 'learned_25', 'learned_50', 'learned_100'], item: 'frame_neuron', finale: { theme: 'nord' } },
  goals: { steps: ['first_goal', 'goals_10', 'goals_25', 'goals_50'], item: 'frame_target', finale: { theme: 'solarlight' } },
  skills: { steps: ['first_skill', 'skills_5', 'skills_10', 'skills_25'], item: 'frame_gear', finale: { theme: 'mint' } },
  books: { steps: ['first_book', 'books_5', 'books_10', 'books_25'], item: 'frame_bookmark', finale: { theme: 'mocha' } },
  workouts: { steps: ['workouts_10', 'workouts_50', 'workouts_100', 'workouts_250'], item: 'frame_steel', finale: { theme: 'amoled' } },
  challenges: { steps: ['challenges_1', 'challenges_5', 'challenges_10', 'challenges_25'], item: 'frame_cup', finale: { item: 'frame_rare_challenges' } },
  milestones: { steps: ['milestones_1', 'milestones_5', 'milestones_10', 'milestones_25'], item: 'frame_beacon', finale: { item: 'frame_rare_milestones' } },
}

function build(): Record<string, Reward> {
  const out: Record<string, Reward> = {}
  for (const l of Object.values(LADDERS)) {
    out[l.steps[0]] = { kind: 'coins', amount: COINS_STEP_1 }
    out[l.steps[1]] = { kind: 'coins', amount: COINS_STEP_2 }
    out[l.steps[2]] = { kind: 'item', key: l.item }
    out[l.steps[3]] = 'theme' in l.finale ? { kind: 'theme', key: l.finale.theme } : { kind: 'item', key: l.finale.item }
  }
  return out
}

export const REWARDS: Record<string, Reward> = build()

function buildRarity(): Record<string, Rarity> {
  const out: Record<string, Rarity> = {}
  for (const l of Object.values(LADDERS)) {
    out[l.steps[0]] = 'common'
    out[l.steps[1]] = 'uncommon'
    out[l.steps[2]] = 'rare'
    out[l.steps[3]] = 'theme' in l.finale ? THEME_REWARD_RARITY[l.finale.theme as (typeof LOCKABLE_THEMES)[number]] : 'epic'
  }
  return out
}

export const REWARD_RARITY: Record<string, Rarity> = buildRarity()

export function rewardRarity(achievementKey: string): Rarity | null {
  return REWARD_RARITY[achievementKey] ?? null
}

export function rewardFor(achievementKey: string): Reward | null {
  return REWARDS[achievementKey] ?? null
}

export function rewardIcon(r: Reward): string {
  return r.kind === 'coins' ? 'coin' : r.kind === 'theme' ? 'paintbrush' : 'sparkles'
}
