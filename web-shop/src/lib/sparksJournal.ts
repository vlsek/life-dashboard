// Журнал огоньков за 30 дней (BACKLOG 78.5): «откуда мои огоньки». Чистая сборка из строк `streak_sparks` (057), названий метрик и покупок.
// Только чтение: начисление и баланс считает сервер (`sync_streak_sparks`), здесь они лишь объясняются человеку.
export const JOURNAL_DAYS = 30

export interface SparkRow { day: string; metric_id: string; amount: number }
export interface Purchase { name: string; cost: number; date: string }
export interface JournalSource { rows: SparkRow[]; names: Record<string, string>; cap: number | null }
export interface JournalFrom { name: string | null; amount: number } // name === null — метрика удалена (журнал её не стирает)
export interface JournalDay { day: string; earned: number; from: JournalFrom[]; bought: { name: string; cost: number }[]; spent: number; capped: boolean }
export interface Journal { days: JournalDay[]; earned: number; spent: number }

const pad = (n: number) => String(n).padStart(2, '0')
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
// Первый день окна (включительно): сегодня и 29 дней назад
export function journalSince(today: string, days = JOURNAL_DAYS): string {
  const [y, m, d] = today.split('-').map(Number)
  const x = new Date(y, m - 1, d)
  x.setDate(x.getDate() - (days - 1))
  return ymd(x)
}

export function buildJournal(src: JournalSource, purchases: Purchase[], today: string, days = JOURNAL_DAYS): Journal {
  const since = journalSince(today, days)
  const byDay = new Map<string, JournalDay>()
  const dayOf = (day: string): JournalDay => {
    let e = byDay.get(day)
    if (!e) byDay.set(day, (e = { day, earned: 0, from: [], bought: [], spent: 0, capped: false }))
    return e
  }
  for (const r of src.rows) {
    if (!(r.amount > 0) || r.day < since || r.day > today) continue
    const e = dayOf(r.day)
    e.earned += r.amount
    e.from.push({ name: src.names[r.metric_id] ?? null, amount: r.amount })
  }
  for (const p of purchases) {
    if (!(p.cost > 0) || !p.date || p.date < since || p.date > today) continue
    const e = dayOf(p.date)
    e.spent += p.cost
    e.bought.push({ name: p.name, cost: p.cost })
  }
  const list = [...byDay.values()].sort((a, b) => (a.day < b.day ? 1 : -1))
  for (const e of list) e.capped = src.cap != null && src.cap > 0 && e.earned >= src.cap
  return { days: list, earned: list.reduce((s, e) => s + e.earned, 0), spent: list.reduce((s, e) => s + e.spent, 0) }
}

export const fmtDay = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`
