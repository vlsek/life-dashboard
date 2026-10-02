import type { SkillFormInput } from './types'

// Текстовый прогресс-бар — 1:1 с bar() из skills.js.
export function bar(pct: number, width = 16): string {
  const filled = Math.round((pct / 100) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export interface SkillSuggestion {
  name: string
  icon: string
}

const SKILL_SUGGESTIONS_RU: SkillSuggestion[] = [
  { name: 'Продольный шпагат', icon: '🤸' },
  { name: 'Поперечный шпагат', icon: '🤸' },
  { name: 'Мостик (гимнастический)', icon: '🌉' },
  { name: 'Стойка на руках у стены', icon: '🤾' },
  { name: 'Подтягивания x10', icon: '💪' },
  { name: 'Жонглирование 3 мячами', icon: '🤹' },
  { name: 'Свист пальцами', icon: '😗' },
  { name: 'Слепая печать', icon: '⌨️' },
  { name: 'Скорочтение', icon: '📖' },
  { name: 'Задержка дыхания 2 мин', icon: '🫁' },
]
const SKILL_SUGGESTIONS_EN: SkillSuggestion[] = [
  { name: 'Front split', icon: '🤸' },
  { name: 'Side split', icon: '🤸' },
  { name: 'Bridge (gymnastic)', icon: '🌉' },
  { name: 'Wall handstand', icon: '🤾' },
  { name: '10 pull-ups', icon: '💪' },
  { name: 'Juggling 3 balls', icon: '🤹' },
  { name: 'Whistle with fingers', icon: '😗' },
  { name: 'Touch typing', icon: '⌨️' },
  { name: 'Speed reading', icon: '📖' },
  { name: '2-minute breath hold', icon: '🫁' },
]

export function suggestionsFor(lang: 'en' | 'ru', existingNames: Set<string>): SkillSuggestion[] {
  const list = lang === 'en' ? SKILL_SUGGESTIONS_EN : SKILL_SUGGESTIONS_RU
  return list.filter((s) => !existingNames.has(s.name))
}

// Патч на insert/update — 1:1 с addSkill()/editSkill() в skills.js (step/points по умолчанию 10).
export function buildSkillRow(res: SkillFormInput): { name: string; step: number; points: number } {
  return { name: res.name.trim(), step: res.step || 10, points: res.points || 10 }
}

// Процент прогресса навыка для полоски: целое 0..100, пустое/битое значение — 0 (BACKLOG 22, 11:58).
export function skillPercent(progress: number | null | undefined): number {
  const n = Number(progress)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}
