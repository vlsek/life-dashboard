import type { Skill } from './types'

// Поиск и сортировка списка навыков в процессе (BACKLOG 44.4). Чистая логика, без сети и хранения.
export type SkillSort = 'new' | 'progress' | 'name'
export const SKILL_SORTS: readonly SkillSort[] = ['new', 'progress', 'name']
export const SORT_KEY = 'skills_sort'

export function normalizeSort(v: unknown): SkillSort {
  return SKILL_SORTS.includes(v as SkillSort) ? (v as SkillSort) : 'new'
}

const norm = (s: string) => s.trim().toLowerCase().replace(/ё/g, 'е')

export function filterSkills(list: readonly Skill[], query: string): Skill[] {
  const q = norm(query)
  return q ? list.filter((s) => norm(s.name).includes(q)) : [...list]
}

// new — свежие сверху; progress — ближе к освоению сверху (при равенстве — свежие); name — по алфавиту (ru/en).
export function sortSkills(list: readonly Skill[], mode: SkillSort): Skill[] {
  const byNew = (a: Skill, b: Skill) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)
  const out = [...list]
  if (mode === 'progress') out.sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0) || byNew(a, b))
  else if (mode === 'name') out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  else out.sort(byNew)
  return out
}
