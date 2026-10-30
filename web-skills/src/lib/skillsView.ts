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

// ---- Категории навыков (BACKLOG 44.4 срез 2, миграция 112): свободный текст с выбором из своих уже введённых ----
export const CATEGORY_MAX = 40

// Для записи: пробелы по краям и внутри схлопываются, длина ≤ 40, пусто → null («Без категории»).
export function normalizeCategory(v: string | null | undefined): string | null {
  const t = (v ?? '').replace(/\s+/g, ' ').trim().slice(0, CATEGORY_MAX).trim()
  return t === '' ? null : t
}

// Свои категории: уникальные (без учёта регистра и ё/е), по алфавиту; пишется в том виде, в каком введена впервые.
export function categoryOptions(list: readonly Skill[]): string[] {
  const seen = new Map<string, string>()
  for (const s of list) {
    const c = normalizeCategory(s.category)
    if (c && !seen.has(norm(c))) seen.set(norm(c), c)
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

// «Выбор из своих»: введённое совпало (без учёта регистра) с уже существующей категорией — берём её написание, чтобы «спорт» и «Спорт» не разъехались на две.
export function matchCategory(input: string | null | undefined, existing: readonly string[]): string | null {
  const c = normalizeCategory(input)
  if (!c) return null
  return existing.find((e) => norm(e) === norm(c)) ?? c
}

export interface SkillGroup {
  /** название категории; null — «Без категории» */
  category: string | null
  skills: Skill[]
}

// Группы для страницы: именованные по алфавиту, «Без категории» — последней; порядок навыков внутри группы сохраняется (сортировку задаёт вызывающий).
// Если категорий нет вообще — возвращает одну группу без названия (страница рисует прежний плоский список).
export function groupByCategory(list: readonly Skill[]): SkillGroup[] {
  const byKey = new Map<string, SkillGroup>()
  const none: Skill[] = []
  for (const s of list) {
    const c = normalizeCategory(s.category)
    if (!c) none.push(s)
    else {
      const g = byKey.get(norm(c))
      if (g) g.skills.push(s)
      else byKey.set(norm(c), { category: c, skills: [s] })
    }
  }
  const named = [...byKey.values()].sort((a, b) => a.category!.localeCompare(b.category!, undefined, { sensitivity: 'base' }))
  if (named.length === 0) return none.length ? [{ category: null, skills: none }] : []
  return none.length ? [...named, { category: null, skills: none }] : named
}
