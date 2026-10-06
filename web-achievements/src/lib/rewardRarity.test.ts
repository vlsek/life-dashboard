import { describe, expect, it } from 'vitest'
// @ts-ignore — в проекте нет типов node, а vitest выполняется в node (как в rewards.test.ts).
import { readFileSync } from 'node:fs'
import { ACHIEVEMENTS } from './achievements'
import { LADDERS, LOCKABLE_THEMES, RARITIES, RARITY_COLOR, REWARDS, THEME_REWARD_RARITY, rewardRarity } from './rewards'
import i18nRaw from './i18n.ts?raw'

const read = (p: string): string => readFileSync(p, 'utf-8')
const custom = read('../web-customization/src/lib/rarity.ts')

// Разбор таблиц web-customization/src/lib/rarity.ts: тут нет импорта между пилотами (бандлы раздельные), поэтому сверка по тексту.
const entries = (name: string): Record<string, string> => {
  const m = new RegExp('export const ' + name + '[^=]*=\\s*\\{([^}]*)\\}').exec(custom)
  expect(m, 'не нашёл ' + name + ' в web-customization/src/lib/rarity.ts').not.toBeNull()
  return Object.fromEntries([...m![1].matchAll(/(\w+):\s*'([#\w]+)'/g)].map((x) => [x[1], x[2]]))
}

describe('редкость наград (BACKLOG 39): таблица и согласие с «Кастомизацией»', () => {
  it('у каждой награды лесенок есть редкость, у значков без награды её нет', () => {
    for (const k of Object.keys(REWARDS)) expect(rewardRarity(k), k).not.toBeNull()
    for (const a of ACHIEVEMENTS.filter((x) => !(x.key in REWARDS))) expect(rewardRarity(a.key), a.key).toBeNull()
  })

  it('схема: ступень 1 — обычная, 2 — необычная, 3 — редкая, 4 — по теме (или эпическая у редкой рамки)', () => {
    for (const [name, l] of Object.entries(LADDERS)) {
      expect(rewardRarity(l.steps[0]), name + ' 1').toBe('common')
      expect(rewardRarity(l.steps[1]), name + ' 2').toBe('uncommon')
      expect(rewardRarity(l.steps[2]), name + ' 3').toBe('rare')
      expect(rewardRarity(l.steps[3]), name + ' 4').toBe('theme' in l.finale ? THEME_REWARD_RARITY[l.finale.theme as (typeof LOCKABLE_THEMES)[number]] : 'epic')
    }
  })

  it('уровни и цвета те же, что в web-customization', () => {
    const m = /export const RARITIES = \[([^\]]*)\]/.exec(custom)!
    expect([...m[1].matchAll(/'(\w+)'/g)].map((x) => x[1])).toEqual([...RARITIES])
    expect(entries('RARITY_COLOR')).toEqual(RARITY_COLOR)
  })

  it('редкость каждой закрываемой темы совпадает с таблицей THEME_RARITY в web-customization', () => {
    const theirs = entries('THEME_RARITY')
    for (const k of LOCKABLE_THEMES) expect(THEME_REWARD_RARITY[k], k).toBe(theirs[k])
    expect(Object.keys(THEME_REWARD_RARITY).sort()).toEqual([...LOCKABLE_THEMES].sort())
  })

  it('рамки-награды, уже внесённые в реестр «Кастомизации», имеют ту же редкость, что и награда', () => {
    const items = entries('ITEM_RARITY')
    for (const l of Object.values(LADDERS)) {
      if (l.item in items) expect(items[l.item], l.item).toBe('rare')
      if ('item' in l.finale && l.finale.item in items) expect(items[l.finale.item], l.finale.item).toBe('epic')
    }
  })

  it('у каждого уровня есть подпись RU и EN', () => {
    for (const r of RARITIES) expect([...i18nRaw.matchAll(new RegExp('ach_rarity_' + r + ':', 'g'))].length, r).toBe(2)
  })
})
