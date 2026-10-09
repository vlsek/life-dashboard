import type { ChallengeTemplate, TemplateCategory } from './types'

// Каталог челленджей (BACKLOG 44.6): категории-фильтры и значки карточки. Чистая логика без сети.
export const TEMPLATE_CATEGORIES: readonly TemplateCategory[] = ['sport', 'health', 'mind', 'life']

export function filterByCategory(list: readonly ChallengeTemplate[], cat: TemplateCategory | 'all'): ChallengeTemplate[] {
  return cat === 'all' ? [...list] : list.filter((t) => t.category === cat)
}

export function categoryCounts(list: readonly ChallengeTemplate[]): Record<TemplateCategory | 'all', number> {
  const out: Record<TemplateCategory | 'all', number> = { all: list.length, sport: 0, health: 0, mind: 0, life: 0 }
  for (const t of list) if (t.category) out[t.category]++
  return out
}

// «1 день / 2 дня / 5 дней» и «1 day / 2 days»
export function daysLabel(n: number, lang: string): string {
  if (lang === 'en') return `${n} ${n === 1 ? 'day' : 'days'}`
  const m10 = n % 10
  const m100 = n % 100
  const word = m100 >= 11 && m100 <= 14 ? 'дней' : m10 === 1 ? 'день' : m10 >= 2 && m10 <= 4 ? 'дня' : 'дней'
  return `${n} ${word}`
}

const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

// Второй значок: срок или цель. Накопительные — «N шт.»: число и название единицы.
export function templateFacts(t: ChallengeTemplate, lang: string): string {
  if (t.type === 'cumulative_count') return `${fmt(t.targetCount ?? 0)} ${t.itemLabel ?? ''}`.trim()
  return daysLabel(t.durationDays ?? 0, lang)
}
