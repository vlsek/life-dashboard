import { describe, expect, it } from 'vitest'
import { SLOT_MODES, matchesQuery, modeOfVis, sortSlotItems, visOfMode } from './lib/slotView'
import type { Rarity } from './lib/rarity'

// BACKLOG 64.1 срез 3: режим «Все · Мои · Магазин», поиск и сортировка внутри слота.
describe('режимы', () => {
  it('«Все» — всё видно; «Мои» — только полученное; «Магазин» — всё, кроме полученного', () => {
    expect(visOfMode('all')).toEqual({ owned: true, achievement: true, coins: true })
    expect(visOfMode('mine')).toEqual({ owned: true, achievement: false, coins: false })
    expect(visOfMode('shop')).toEqual({ owned: false, achievement: true, coins: true })
  })
  it('режим → видимость → режим возвращает тот же режим', () => {
    for (const m of SLOT_MODES) expect(modeOfVis(visOfMode(m))).toBe(m)
  })
  it('остатки старого выбора чипов: без «Получено» — «Магазин»; всё скрыто — «Все» (не прячем без ведома)', () => {
    expect(modeOfVis({ owned: false, achievement: true, coins: false })).toBe('shop')
    expect(modeOfVis({ owned: false, achievement: false, coins: false })).toBe('all')
    expect(modeOfVis({ owned: true, achievement: true, coins: false })).toBe('all')
  })
})

describe('поиск', () => {
  it('без учёта регистра и пробелов по краям; пустой — подходит всему', () => {
    expect(matchesQuery('Золотая рамка', ' золот ')).toBe(true)
    expect(matchesQuery('Golden Frame', 'FRAME')).toBe(true)
    expect(matchesQuery('Золотая рамка', 'серебро')).toBe(false)
    expect(matchesQuery('что угодно', '   ')).toBe(true)
  })
})

describe('сортировка', () => {
  type It = { n: string; r: Rarity; p: number }
  const list: It[] = [
    { n: 'b', r: 'epic', p: 300 },
    { n: 'a', r: 'common', p: 100 },
    { n: 'd', r: 'epic', p: 50 },
    { n: 'c', r: 'legendary', p: 0 },
    { n: 'e', r: 'common', p: 100 },
  ]
  const ops = { rarity: (x: It) => x.r, price: (x: It) => x.p, label: (x: It) => x.n }
  it('по редкости: от обычных к легендарным, при равенстве — порядок каталога', () => {
    expect(sortSlotItems(list, 'rarity', ops).map((x) => x.n)).toEqual(['a', 'e', 'b', 'd', 'c'])
  })
  it('по цене: от дешёвых; бесплатное/награды первыми; равные — в порядке каталога', () => {
    expect(sortSlotItems(list, 'price', ops).map((x) => x.n)).toEqual(['c', 'd', 'a', 'e', 'b'])
  })
  it('по названию: по алфавиту', () => {
    expect(sortSlotItems(list, 'name', ops).map((x) => x.n)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
  it('исходный список не меняется; нет функции цены — все равны (порядок каталога)', () => {
    const copy = list.map((x) => x.n)
    sortSlotItems(list, 'rarity', ops)
    expect(list.map((x) => x.n)).toEqual(copy)
    expect(sortSlotItems(list, 'price', { rarity: ops.rarity, label: ops.label }).map((x) => x.n)).toEqual(copy)
  })
})
