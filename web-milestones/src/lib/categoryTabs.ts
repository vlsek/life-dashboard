import type { Milestone } from './types'

// Вкладки-категории над списком вех (BACKLOG 44.9): «Все» + по одной на каждую группу активных вех (по алфавиту), со счётчиками.
// Выбор помнится на устройстве; если выбранной группы больше нет — «Все».
const KEY = 'milestones_cat_filter'
export const ALL_TAB = '__all__'

export interface CategoryTab {
  key: string
  label: string
  count: number
}

export function buildCategoryTabs(active: Milestone[], noCategoryLabel: string, allLabel: string): CategoryTab[] {
  const counts: Record<string, number> = {}
  for (const m of active) {
    const k = m.category || noCategoryLabel
    counts[k] = (counts[k] || 0) + 1
  }
  const cats = Object.keys(counts).sort()
  return [{ key: ALL_TAB, label: allLabel, count: active.length }, ...cats.map((c) => ({ key: c, label: c, count: counts[c] }))]
}

export function resolveCategory(selected: string, tabs: CategoryTab[]): string {
  return tabs.some((t) => t.key === selected) ? selected : ALL_TAB
}

export function getSavedCategory(): string {
  try {
    return localStorage.getItem(KEY) || ALL_TAB
  } catch {
    return ALL_TAB
  }
}
export function saveCategory(key: string): void {
  try {
    localStorage.setItem(KEY, key)
  } catch {
    /* выбор вкладки не критичен */
  }
}
