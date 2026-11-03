import type { PlannedEntry } from './planned'

// Шаблоны дня (BACKLOG 75.12, миграция 115). Правила — отдельно от базы, чтобы проверять без неё.
// Шаблон — пакет СВОИХ пунктов плана («Рабочий день»): текст, время напоминания, бонус. В него не попадают:
//  • пункты-цели — цель живёт сама, в чужой день её «подставить» нельзя;
//  • повторяющиеся пункты — они и так приходят по расписанию (plan_repeats), в шаблоне дали бы дубль;
//  • отметки о выполнении — «выполнено» принадлежит дню, а не шаблону.
export interface TemplateItem {
  text: string
  time?: string
  bonus?: boolean
}
export interface PlanTemplate {
  id: string
  name: string
  items: TemplateItem[]
}
export const MAX_TEMPLATES = 20
export const MAX_TEMPLATE_ITEMS = 30
export const MAX_TEMPLATE_NAME = 40

const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

// Что из плана дня можно сохранить: свои, не из повтора, с текстом; без повторов (по тексту и времени); не больше 30.
export function itemsFromPlan(planned: readonly PlannedEntry[]): TemplateItem[] {
  const out: TemplateItem[] = []
  const seen = new Set<string>()
  for (const p of planned) {
    if (p.type === 'goal' || p.repeat) continue
    const text = (p.text ?? '').trim().slice(0, 120)
    if (!text) continue
    const time = typeof p.time === 'string' && TIME_RE.test(p.time) ? p.time : undefined
    const key = text + '|' + (time ?? '')
    if (seen.has(key)) continue
    seen.add(key)
    const it: TemplateItem = { text }
    if (time) it.time = time
    if (p.bonus) it.bonus = true
    out.push(it)
    if (out.length >= MAX_TEMPLATE_ITEMS) break
  }
  return out
}

// Название: без лишних пробелов, 1–40 символов; пустое — null.
export function cleanTemplateName(raw: string): string | null {
  const v = raw.trim().replace(/\s+/g, ' ')
  return v && v.length <= MAX_TEMPLATE_NAME ? v : null
}

// Строка из базы → шаблон. Ничему не верим: битые пункты отбрасываем, шаблон без единого пункта — null.
export function toPlanTemplate(row: { id?: unknown; name?: unknown; items?: unknown } | null | undefined): PlanTemplate | null {
  if (!row || typeof row.id !== 'string' || typeof row.name !== 'string' || !Array.isArray(row.items)) return null
  const items: TemplateItem[] = []
  for (const raw of row.items) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as { text?: unknown; time?: unknown; bonus?: unknown }
    if (typeof r.text !== 'string' || !r.text.trim()) continue
    const it: TemplateItem = { text: r.text.trim() }
    if (typeof r.time === 'string' && TIME_RE.test(r.time)) it.time = r.time
    if (r.bonus === true) it.bonus = true
    items.push(it)
  }
  return items.length ? { id: row.id, name: row.name, items } : null
}

// Применить шаблон к плану дня: пункты, которые уже есть (тот же текст и время — выполненные тоже), не добавляем; остальные — в конец,
// невыполненными. Возвращаем и сколько добавлено / пропущено, чтобы честно сказать об этом.
export function applyTemplate(planned: readonly PlannedEntry[], items: readonly TemplateItem[]): { list: PlannedEntry[]; added: number; skipped: number } {
  const list: PlannedEntry[] = [...planned]
  let added = 0
  let skipped = 0
  for (const it of items) {
    const has = list.some((p) => p.type !== 'goal' && (p.text ?? '').trim() === it.text && (p.time ?? '') === (it.time ?? ''))
    if (has) {
      skipped++
      continue
    }
    const e: PlannedEntry = { type: 'custom', text: it.text }
    if (it.time) e.time = it.time
    if (it.bonus) e.bonus = true
    list.push(e)
    added++
  }
  return { list, added, skipped }
}
