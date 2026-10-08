import { describe, expect, it } from 'vitest'
import { DEFAULT_SPARKS_COST, coinsToSparksSuggestion, parseSparksRow, purchaseErrorKey, rubToSparks } from './sparks'

describe('parseSparksRow: ответ sync_streak_sparks / get_sparks_balance', () => {
  it('массив из одной строки; bigint может прийти строкой', () => {
    expect(parseSparksRow([{ earned: 12, spent: 2, balance: 10 }])).toEqual({ total: 12, spent: 2, balance: 10 })
    expect(parseSparksRow([{ earned: '12', spent: '2', balance: '10' }])).toEqual({ total: 12, spent: 2, balance: 10 })
  })
  it('сама строка (не массив) тоже разбирается', () => {
    expect(parseSparksRow({ earned: 3, spent: 0, balance: 3 })).toEqual({ total: 3, spent: 0, balance: 3 })
  })
  it('пусто/мусор/неполная строка — null (Магазин остаётся в монетах)', () => {
    for (const bad of [null, undefined, [], 'x', 5, [{ earned: 1 }], [{ earned: 'abc', spent: 0, balance: 0 }]]) expect(parseSparksRow(bad)).toBeNull()
  })
})

describe('rubToSparks: калькулятор цены', () => {
  it('округление вверх, минимум 1', () => {
    expect(rubToSparks(250, 10)).toBe(25)
    expect(rubToSparks(251, 10)).toBe(26)
    expect(rubToSparks(1, 10)).toBe(1)
  })
  it('мусор, ноль и отрицательное — 0 (поле не трогаем)', () => {
    for (const bad of [0, -5, NaN, Infinity]) expect(rubToSparks(bad, 10)).toBe(0)
    expect(rubToSparks(100, 0)).toBe(0)
    expect(rubToSparks(100, NaN)).toBe(0)
  })
})

describe('coinsToSparksSuggestion: подсказка цены при переносе из архива', () => {
  it('1/8 от монет, минимум 1; мусор — цена по умолчанию', () => {
    expect(coinsToSparksSuggestion(200)).toBe(25)
    expect(coinsToSparksSuggestion(3)).toBe(1)
    expect(coinsToSparksSuggestion(0)).toBe(DEFAULT_SPARKS_COST)
    expect(coinsToSparksSuggestion(NaN)).toBe(DEFAULT_SPARKS_COST)
  })
})

describe('purchaseErrorKey: ошибки триггера покупки', () => {
  it('распознаёт нехватку огоньков и архивную вещь, остальное — null', () => {
    expect(purchaseErrorKey({ message: 'insufficient_sparks' })).toBe('shop_err_insufficient_sparks')
    expect(purchaseErrorKey(new Error('xx insufficient_sparks yy'))).toBe('shop_err_insufficient_sparks')
    expect(purchaseErrorKey({ message: 'archived_item' })).toBe('shop_err_archived')
    expect(purchaseErrorKey({ message: 'network down' })).toBeNull()
    expect(purchaseErrorKey(null)).toBeNull()
  })
})
