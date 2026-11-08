// BACKLOG 77.12 «Этапы навыка вместо ручного процента»: чек-лист этапов, процент считается сам (миграция 122, skills.checklist).
export interface ChecklistItem {
  name: string
  done: boolean
}
export const CHECKLIST_MAX = 20
export const ITEM_NAME_MAX = 80

// Только непустые названия (обрезка, ≤80 символов), не больше CHECKLIST_MAX; done — строго true.
export function normalizeChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return []
  const out: ChecklistItem[] = []
  for (const r of raw) {
    const o = r as { name?: unknown; done?: unknown } | null
    const name = typeof o?.name === 'string' ? o.name.trim().slice(0, ITEM_NAME_MAX) : ''
    if (!name) continue
    out.push({ name, done: o?.done === true })
    if (out.length >= CHECKLIST_MAX) break
  }
  return out
}

// Процент выполнения: выполненные / все, целое 0..100; пустой список — null (прогресс ведут вручную).
export function checklistPercent(list: ChecklistItem[]): number | null {
  if (!list.length) return null
  return Math.round((list.filter((i) => i.done).length / list.length) * 100)
}

// Текст формы (по пункту в строке) → список; уже выполненные пункты с тем же названием остаются выполненными (правка списка не сбрасывает прогресс).
export function checklistFromText(text: string, previous: ChecklistItem[] = []): ChecklistItem[] {
  const doneNames = new Set(previous.filter((i) => i.done).map((i) => i.name))
  return normalizeChecklist(text.split('\n').map((line) => ({ name: line, done: doneNames.has(line.trim().slice(0, ITEM_NAME_MAX)) })))
}
export const checklistToText = (list: ChecklistItem[]): string => list.map((i) => i.name).join('\n')

export function toggleItem(list: ChecklistItem[], index: number): ChecklistItem[] {
  return list.map((it, i) => (i === index ? { ...it, done: !it.done } : it))
}

export function allDone(list: ChecklistItem[]): ChecklistItem[] {
  return list.map((it) => ({ ...it, done: true }))
}
