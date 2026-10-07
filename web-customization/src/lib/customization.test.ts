import { describe, expect, it } from 'vitest'
import {
  ITEMS,
  PRICE_TIERS,
  achievementUnlocks,
  itemByKey,
  itemStatus,
  itemsOf,
  nextSelected,
  parseSelected,
  priceOf,
  shortBy,
  type CustomState,
} from './customization'
import { FRAME_ANIMATIONS, FRAME_SHADOWS, frameClass, frameShadow } from './frames'
import i18nRaw from './i18n.ts?raw'

const st = (over: Partial<CustomState> = {}): CustomState => ({ unlocked: {}, selected: {}, balance: 0, achievements: new Set(), ...over })
const neon = itemByKey('frame_neon')!
const gold = itemByKey('frame_gold')!

describe('реестр', () => {
  it('ключи уникальны, у платных есть уровень цены, у «за достижения» — достижение и нет цены', () => {
    expect(new Set(ITEMS.map((i) => i.key)).size).toBe(ITEMS.length)
    for (const i of ITEMS) {
      if (i.source === 'points') expect(i.tier && PRICE_TIERS[i.tier], i.key).toBeGreaterThan(0)
      else {
        expect(i.achievement, i.key).toBeTruthy()
        expect(priceOf(i), i.key).toBeNull()
      }
    }
  })
  it('цены — три уровня 100/150/250 (решение владельца)', () => {
    expect(PRICE_TIERS).toEqual({ low: 100, mid: 150, high: 250 })
  })
  it('у каждого предмета есть рамка в frames.ts', () => {
    for (const i of ITEMS.filter((x) => x.category === 'avatar_frame')) expect(FRAME_SHADOWS[i.key], i.key).toBeTruthy()
  })
  it('itemsOf делит по источнику', () => {
    expect(itemsOf('avatar_frame', 'points').map((i) => i.key)).toEqual(['frame_neon', 'frame_aurora', 'frame_flame', 'frame_rainbow'])
    expect(itemsOf('avatar_frame', 'achievement').map((i) => i.key)).toEqual(['frame_gold', 'frame_inferno', 'frame_pulse', 'frame_royal', 'frame_ink', 'frame_neuron', 'frame_target', 'frame_gear', 'frame_bookmark', 'frame_steel', 'frame_cup', 'frame_beacon', 'frame_rare_challenges', 'frame_rare_milestones'])
  })
})

describe('itemStatus / shortBy', () => {
  it('хватает баллов — можно купить; не хватает — «short»; баланс неизвестен — «short» (покупки выключены)', () => {
    expect(itemStatus(neon, st({ balance: 100 }))).toBe('buyable')
    expect(itemStatus(neon, st({ balance: 99.9 }))).toBe('short')
    expect(itemStatus(neon, st({ balance: null }))).toBe('short')
  })
  it('открытый — «owned», надетый — «selected»', () => {
    const unlocked = { frame_neon: { source: 'points' as const, unlockedAt: null } }
    expect(itemStatus(neon, st({ unlocked }))).toBe('owned')
    expect(itemStatus(neon, st({ unlocked, selected: { avatar_frame: 'frame_neon' } }))).toBe('selected')
  })
  it('за достижение: пока не получено — «locked», купить нельзя даже при больших баллах', () => {
    expect(itemStatus(gold, st({ balance: 99999 }))).toBe('locked')
  })
  it('shortBy: сколько не хватает, округление до десятых, для не продаваемого и неизвестного баланса — null', () => {
    expect(shortBy(neon, 40.5)).toBe(59.5)
    expect(shortBy(neon, 100)).toBe(0)
    expect(shortBy(neon, null)).toBeNull()
    expect(shortBy(gold, 10)).toBeNull()
  })
})

describe('achievementUnlocks', () => {
  it('открывает награду за полученное достижение один раз', () => {
    expect(achievementUnlocks(ITEMS, {}, new Set(['streak_30']))).toEqual(['frame_gold'])
    expect(achievementUnlocks(ITEMS, { frame_gold: { source: 'achievement', unlockedAt: null } }, new Set(['streak_30']))).toEqual([])
    expect(achievementUnlocks(ITEMS, {}, new Set(['streak_5']))).toEqual([])
  })
})

describe('nextSelected / parseSelected', () => {
  const unlocked = { frame_neon: { source: 'points' as const, unlockedAt: null } }
  it('надеть можно только открытое; снять — null', () => {
    expect(nextSelected({}, 'avatar_frame', 'frame_neon', unlocked)).toEqual({ avatar_frame: 'frame_neon' })
    expect(nextSelected({}, 'avatar_frame', 'frame_aurora', unlocked)).toEqual({})
    expect(nextSelected({ avatar_frame: 'frame_neon' }, 'avatar_frame', null, unlocked)).toEqual({})
  })
  it('parseSelected отбрасывает мусор, чужие категории и несуществующие предметы', () => {
    expect(parseSelected({ avatar_frame: 'frame_gold' })).toEqual({ avatar_frame: 'frame_gold' })
    expect(parseSelected({ avatar_frame: 'nope', theme: 'x' })).toEqual({})
    expect(parseSelected(null)).toEqual({})
    expect(parseSelected('str')).toEqual({})
    expect(parseSelected({ avatar_frame: 5 })).toEqual({})
  })
})

describe('frameShadow', () => {
  it('известный ключ — тень, остальное — пусто', () => {
    expect(frameShadow('frame_neon')).toContain('#ff4fa3')
    expect(frameShadow('nope')).toBe('')
    expect(frameShadow(null)).toBe('')
    expect(frameShadow(undefined)).toBe('')
  })
})

describe('анимированные рамки (BACKLOG 34)', () => {
  it('огненная и радужная — за баллы по высшему тарифу 250', () => {
    for (const k of ['frame_flame', 'frame_rainbow']) {
      const it = itemByKey(k)!
      expect(it.source).toBe('points')
      expect(priceOf(it)).toBe(250)
    }
  })
  it('у анимированной есть класс, у статичной и неизвестной — нет', () => {
    expect(frameClass('frame_flame')).toBe('cust-frame-flame')
    expect(frameClass('frame_rainbow')).toBe('cust-frame-rainbow')
    expect(frameClass('frame_neon')).toBe('')
    expect(frameClass('nope')).toBe('')
    expect(frameClass(null)).toBe('')
  })
  it('каждая анимация привязана к существующей рамке и имеет статичную тень', () => {
    for (const k of Object.keys(FRAME_ANIMATIONS)) expect(FRAME_SHADOWS[k], k).toBeTruthy()
  })
})

describe('анимированные рамки за достижения (решение владельца 2026-10-04)', () => {
  const rewards: [string, string][] = [['frame_inferno', 'streak_100'], ['frame_pulse', 'mega_productivity'], ['frame_royal', 'points_1000']]
  it('три анимированные награды: не продаются, привязаны к своим достижениям', () => {
    for (const [key, ach] of rewards) {
      const it = itemByKey(key)!
      expect(it.source, key).toBe('achievement')
      expect(it.achievement, key).toBe(ach)
      expect(priceOf(it), key).toBeNull()
      expect(frameClass(key), key).toMatch(/^cust-frame-/)
    }
  })
  it('достижение открывает свою награду, чужое — нет; купить за баллы нельзя', () => {
    expect(achievementUnlocks(ITEMS, {}, new Set(['streak_100']))).toEqual(['frame_inferno'])
    expect(achievementUnlocks(ITEMS, {}, new Set(['points_1000', 'mega_productivity']))).toEqual(['frame_pulse', 'frame_royal'])
    expect(itemStatus(itemByKey('frame_inferno')!, st({ balance: 99999 }))).toBe('locked')
  })
  it('у каждой награды есть название достижения на обоих языках (для «Награда за достижение «…»»)', async () => {
    const i18n = i18nRaw
    for (const [, ach] of rewards) expect([...i18n.matchAll(new RegExp('cust_ach_' + ach + ':', 'g'))].length, ach).toBe(2)
  })
})
