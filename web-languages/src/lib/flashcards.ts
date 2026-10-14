// Карточка «Повторение» (BACKLOG 44.7, срез 3): по кругу показывает слова, которые ещё учатся. Индекс живёт только в памяти страницы
// (ничего не сохраняется): после «Выучил» слово уходит из списка, и на его место встаёт следующее, поэтому индекс остаётся на месте.
import type { VocabWord } from './types'

// Индекс, приведённый к списку: по кругу, пустой список — 0
export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return ((index % count) + count) % count
}

export function cardAt(words: readonly VocabWord[], index: number): VocabWord | null {
  return words.length ? words[wrapIndex(index, words.length)] : null
}

// Следующее слово по кругу
export const nextIndex = (index: number, count: number): number => wrapIndex(index + 1, count)

// Подпись «3 из 12»
export const positionLabel = (index: number, count: number): string => (count ? `${wrapIndex(index, count) + 1}/${count}` : '')
