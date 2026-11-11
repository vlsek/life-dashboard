import { sb } from './supabase'
import { todayStr } from './date'
import { notifyDataChanged } from './events'

// Быстрый пункт в план на сегодня (BACKLOG 79.6, срез 1): из палитры и по клавише «n» на любой странице.
// Кто пишет план: на Дашборде блок «Планы» — ЕДИНСТВЕННЫЙ писатель (держит план в памяти и пишет его целиком). Поэтому сначала просим его
// событием PLAN_ADD; если он принял (handled) — всё, дубль и запись на нём. Нет блока на странице — шапка сама читает свежий план дня и дописывает.
// Только онлайн: офлайн-очередь рассчитана на запись ОДНОЙ строки, а план — «прочитать список → дописать → записать целиком»; воспроизведение
// такой операции позже могло бы затереть более новые правки. Без сети честно говорим об этом (текст в окне остаётся).
// Имя события — то же, что в web-dashboard/src/lib/planBridge.ts (бандлы независимы; страж planQuickAddBridge.test.ts).
export const PLAN_ADD = 'dashboard:plan-add'
export const MAX_PLAN_TEXT = 120
const TIME_RE = /^([01][0-9]|2[0-3]):[0-5][0-9]$/

export interface PlanAddDetail {
  date: string
  text: string
  time: string | null
  handled: boolean
}

export type PlanAddResult =
  | { ok: true; via: 'page' | 'direct'; duplicate: boolean }
  | { ok: false; reason: 'text' | 'time' | 'offline' | 'other' }

export const cleanPlanText = (raw: string): string | null => {
  const v = raw.trim().replace(/\s+/g, ' ')
  return v && v.length <= MAX_PLAN_TEXT ? v : null
}
// Пусто — без времени (null); «ЧЧ:ММ» — время; всё остальное — ошибка (undefined)
export const cleanPlanTime = (raw: string): string | null | undefined => {
  const v = raw.trim()
  if (!v) return null
  return TIME_RE.test(v) ? v : undefined
}

type PlanRow = { type?: string; text?: string; time?: string | null; done?: boolean; [k: string]: unknown }
interface Client {
  from(table: string): any
}
export interface PlanAddDeps {
  client?: Client
  today?: () => string
  online?: () => boolean
  dispatch?: (d: PlanAddDetail) => void
}

const sameOpenItem = (x: PlanRow, text: string, time: string | null) => x.type !== 'goal' && !x.done && String(x.text ?? '').trim() === text && (x.time ?? null) === time

export async function addPlanItemToday(userId: string, rawText: string, rawTime: string, deps: PlanAddDeps = {}): Promise<PlanAddResult> {
  const text = cleanPlanText(rawText)
  if (!text) return { ok: false, reason: 'text' }
  const time = cleanPlanTime(rawTime)
  if (time === undefined) return { ok: false, reason: 'time' }
  const date = (deps.today ?? todayStr)()

  // 1) блок «Планы» на странице (Дашборд) — единственный писатель плана: просим его
  const detail: PlanAddDetail = { date, text, time, handled: false }
  ;(deps.dispatch ?? ((d: PlanAddDetail) => window.dispatchEvent(new CustomEvent<PlanAddDetail>(PLAN_ADD, { detail: d }))))(detail)
  if (detail.handled) return { ok: true, via: 'page', duplicate: false }

  // 2) блока нет — пишем сами; без сети не пытаемся (см. шапку файла)
  if (!(deps.online ?? (() => navigator.onLine !== false))()) return { ok: false, reason: 'offline' }
  const client = deps.client ?? (sb as unknown as Client)
  try {
    const { data, error } = await client.from('daily_notes').select('planned_goals').eq('user_id', userId).eq('date', date).maybeSingle()
    if (error) return { ok: false, reason: 'other' }
    const current: PlanRow[] = Array.isArray(data?.planned_goals) ? (data.planned_goals as PlanRow[]) : []
    if (current.some((x) => sameOpenItem(x, text, time))) return { ok: true, via: 'direct', duplicate: true }
    const entry: PlanRow = { type: 'custom', text, ...(time ? { time } : {}) }
    const { error: writeErr } = await client.from('daily_notes').upsert({ user_id: userId, date, planned_goals: [...current, entry] }, { onConflict: 'user_id,date' })
    if (writeErr) return { ok: false, reason: 'other' }
    notifyDataChanged({ source: 'plan', date })
    return { ok: true, via: 'direct', duplicate: false }
  } catch {
    return { ok: false, reason: 'other' }
  }
}
