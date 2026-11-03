import { describe, expect, it } from 'vitest'
import { buildOptions, canChoose, checkTyped, norm, pickSession, quizCards, shuffle } from './quiz'
import type { VocabWord } from './types'

const w = (id: string, word: string, translation: string | null): VocabWord => ({ id, user_id: 'u', word, translation, example: null, lang: 'en', learned: false, created_at: '2026-10-01' })
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length] } // детерминированный rng

describe('quiz (77.7)', () => {
  it('карточки: только слова с переводом; направление меняет вопрос и ответ', () => {
    const words = [w('1', 'cat', 'кот'), w('2', 'dog', null), w('3', 'bird', '  '), w('4', '', 'пусто')]
    expect(quizCards(words, 'forward')).toEqual([{ id: '1', prompt: 'cat', answer: 'кот' }])
    expect(quizCards(words, 'reverse')).toEqual([{ id: '1', prompt: 'кот', answer: 'cat' }])
  })

  it('norm: регистр, диакритика, ё=е, пробелы и знаки по краям не важны', () => {
    expect(norm('  Café ')).toBe('cafe')
    expect(norm('Ёлка!')).toBe('елка')
    expect(norm('a   b')).toBe('a b')
    expect(norm('«Дом».')).toBe('дом')
  })

  it('checkTyped: точное совпадение, мягкое (регистр/диакритика), чужое и пустое', () => {
    expect(checkTyped('cafe', 'cafe')).toBe('exact')
    expect(checkTyped('Cafe', 'cafe')).toBe('soft')
    expect(checkTyped('cafe', 'café')).toBe('soft')
    expect(checkTyped('елка', 'ёлка')).toBe('soft')
    expect(checkTyped('house', 'cafe')).toBe('wrong')
    expect(checkTyped('   ', 'cafe')).toBe('wrong')
  })
  it('checkTyped: несколько вариантов перевода через запятую, «;» и «/» — подходит любой', () => {
    expect(checkTyped('дом', 'дом, здание')).toBe('exact')
    expect(checkTyped('Здание', 'дом, здание')).toBe('soft')
    expect(checkTyped('дом, здание', 'дом, здание')).toBe('exact')
    expect(checkTyped('строение', 'дом; здание')).toBe('wrong')
  })

  it('shuffle не меняет состав и не трогает исходный массив', () => {
    const src = [1, 2, 3, 4, 5]
    const out = shuffle(src, seq(0.1, 0.9, 0.5))
    expect([...out].sort()).toEqual(src)
    expect(src).toEqual([1, 2, 3, 4, 5])
  })

  it('варианты: верный + 3 отвлекающих из чужих ответов, без повторов и без верного дважды', () => {
    const cards = ['кот', 'пёс', 'птица', 'рыба', 'конь'].map((a, i) => ({ id: String(i), prompt: 'p' + i, answer: a }))
    const opts = buildOptions(cards[0], cards)
    expect(opts).toHaveLength(4)
    expect(opts).toContain('кот')
    expect(new Set(opts.map(norm)).size).toBe(4)
  })
  it('варианты: ответы, совпадающие с верным после нормализации, в отвлекающие не берутся; мало слов — меньше вариантов', () => {
    const cards = [
      { id: '1', prompt: 'a', answer: 'Кот' },
      { id: '2', prompt: 'b', answer: 'кот' },
      { id: '3', prompt: 'c', answer: 'пёс' },
    ]
    const opts = buildOptions(cards[0], cards)
    expect(opts.sort()).toEqual(['Кот', 'пёс'].sort())
    expect(buildOptions({ id: '9', prompt: 'x', answer: 'один' }, [{ id: '9', prompt: 'x', answer: 'один' }])).toEqual(['один'])
  })

  it('canChoose: нужны две разные формы ответа', () => {
    expect(canChoose([])).toBe(false)
    expect(canChoose([{ id: '1', prompt: 'a', answer: 'кот' }, { id: '2', prompt: 'b', answer: 'КОТ' }])).toBe(false)
    expect(canChoose([{ id: '1', prompt: 'a', answer: 'кот' }, { id: '2', prompt: 'b', answer: 'пёс' }])).toBe(true)
  })

  it('сессия: не больше 10 карточек, без повторов', () => {
    const cards = Array.from({ length: 25 }, (_, i) => ({ id: String(i), prompt: 'p' + i, answer: 'a' + i }))
    const s = pickSession(cards)
    expect(s).toHaveLength(10)
    expect(new Set(s.map((c) => c.id)).size).toBe(10)
    expect(pickSession(cards.slice(0, 3))).toHaveLength(3)
  })
})
