import { describe, expect, it } from 'vitest'
import { cardAt, nextIndex, positionLabel, wrapIndex } from './flashcards'
import type { VocabWord } from './types'

const w = (id: string): VocabWord => ({ id, user_id: 'u', word: 'w' + id, translation: null, example: null, lang: 'en', learned: false, created_at: '' })

describe('flashcards: индекс по кругу', () => {
  it('wrapIndex: по кругу в обе стороны, пустой список — 0', () => {
    expect([wrapIndex(0, 3), wrapIndex(3, 3), wrapIndex(4, 3), wrapIndex(-1, 3)]).toEqual([0, 0, 1, 2])
    expect(wrapIndex(5, 0)).toBe(0)
  })
  it('nextIndex идёт по кругу, на последнем слове возвращается к первому', () => {
    expect(nextIndex(0, 3)).toBe(1)
    expect(nextIndex(2, 3)).toBe(0)
    expect(nextIndex(0, 1)).toBe(0)
  })
  it('cardAt: слово по индексу; индекс за концом списка подгоняется; пустой список — null', () => {
    const list = [w('1'), w('2')]
    expect(cardAt(list, 1)?.id).toBe('2')
    expect(cardAt(list, 5)?.id).toBe('2')
    expect(cardAt([], 0)).toBeNull()
  })
  it('positionLabel: «N/всего», у пустого — пусто', () => {
    expect(positionLabel(1, 4)).toBe('2/4')
    expect(positionLabel(0, 0)).toBe('')
  })
})
