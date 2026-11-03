// Режимы тренировки слов (BACKLOG 77.7, срез 1): выбор перевода из четырёх и ввод с мягкой проверкой.
// Чистые функции: перемешивание принимает rng, чтобы тесты были детерминированными.
import type { VocabWord } from './types'

export type QuizDirection = 'forward' | 'reverse' // forward: слово → перевод; reverse: перевод → слово
export interface QuizCard { id: string; prompt: string; answer: string }
export type TypedResult = 'exact' | 'soft' | 'wrong'

export const QUIZ_LENGTH = 10
export const CHOICES = 4

// Карточки только из слов с переводом; направление меняет местами вопрос и ответ
export function quizCards(words: VocabWord[], direction: QuizDirection): QuizCard[] {
  const out: QuizCard[] = []
  for (const w of words) {
    const tr = (w.translation || '').trim()
    const wd = (w.word || '').trim()
    if (!tr || !wd) continue
    out.push(direction === 'forward' ? { id: w.id, prompt: wd, answer: tr } : { id: w.id, prompt: tr, answer: wd })
  }
  return out
}

// Сравнение без регистра, диакритики (é = e, ё = е), лишних пробелов и знаков по краям
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:!?'"«»()-]+|[\s.,;:!?'"«»()-]+$/g, '')
}

// Перевод может быть записан через запятую или «;»: верным считается любой из вариантов (и вся строка целиком)
function variants(answer: string): string[] {
  const parts = answer.split(/[;,/]/).map((p) => p.trim()).filter(Boolean)
  return [answer.trim(), ...parts]
}

export function checkTyped(input: string, answer: string): TypedResult {
  const given = input.trim()
  if (!given) return 'wrong'
  const vs = variants(answer)
  if (vs.some((v) => v === given)) return 'exact'
  const g = norm(given)
  if (g && vs.some((v) => norm(v) === g)) return 'soft'
  return 'wrong'
}

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Верный ответ + до трёх отвлекающих из ответов других карточек (разные между собой и не равные верному)
export function buildOptions(card: QuizCard, cards: readonly QuizCard[], rng: () => number = Math.random): string[] {
  const seen = new Set([norm(card.answer)])
  const pool: string[] = []
  for (const c of shuffle(cards, rng)) {
    const k = norm(c.answer)
    if (c.id === card.id || !k || seen.has(k)) continue
    seen.add(k)
    pool.push(c.answer)
    if (pool.length === CHOICES - 1) break
  }
  return shuffle([card.answer, ...pool], rng)
}

// Для режима «выбор» нужно хотя бы две разные формы ответа, иначе выбирать не из чего
export function canChoose(cards: readonly QuizCard[]): boolean {
  return new Set(cards.map((c) => norm(c.answer)).filter(Boolean)).size >= 2
}

export function pickSession(cards: readonly QuizCard[], n = QUIZ_LENGTH, rng: () => number = Math.random): QuizCard[] {
  return shuffle(cards, rng).slice(0, n)
}
